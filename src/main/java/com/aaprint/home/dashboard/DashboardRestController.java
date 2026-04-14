package com.aaprint.home.dashboard;

import com.aaprint.config.TenantContext;
import com.aaprint.customer.repository.CustomerRepository;
import com.aaprint.employee.repository.EmployeeRepository;
import com.aaprint.invoice.entity.Invoice;
import com.aaprint.invoice.repository.InvoiceRepository;
import com.aaprint.order.entity.Order;
import com.aaprint.order.repository.OrderRepository;
import com.aaprint.payment.entity.Payment;
import com.aaprint.payment.repository.PaymentRepository;
import com.aaprint.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/dashboard")
public class DashboardRestController {

    private final CustomerRepository customerRepository;
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final EmployeeRepository employeeRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        Long tenantId = TenantContext.getTenantId();
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalCustomers", customerRepository.countByTenant_TenantIdAndDeletedFalse(tenantId));
        stats.put("totalOrders", orderRepository.countByTenantActive(tenantId));
        stats.put("totalProducts", productRepository.countByTenant_TenantIdAndDeletedFalse(tenantId));
        stats.put("totalEmployees", employeeRepository.countByTenant_TenantIdAndDeletedFalse(tenantId));
        stats.put("totalInvoices", invoiceRepository.countByTenant_TenantIdAndDeletedFalse(tenantId));
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getAnalytics() {
        Long tenantId = TenantContext.getTenantId();
        LocalDate today = LocalDate.now();
        LocalDate startOfWeek = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate startOfMonth = today.withDayOfMonth(1);
        LocalDate startOfYear = today.withDayOfYear(1);

        Map<String, Object> result = new HashMap<>();

        // ── Fetch all invoices & orders for this year ──
        List<Invoice> yearInvoices = invoiceRepository.findByTenantAndDateRange(tenantId, startOfYear, today);
        List<Payment> yearPayments = paymentRepository.findByTenantAndDateRange(tenantId, startOfYear, today);
        // Orders: fetch all pages (up to 5000)
        List<Order> yearOrders = orderRepository.findFiltered(tenantId, null, null, null, startOfYear, today,
                PageRequest.of(0, 5000)).getContent();

        // ── Period summaries ──
        result.put("thisWeek", buildPeriodSummary(yearInvoices, yearPayments, yearOrders, startOfWeek, today));
        result.put("thisMonth", buildPeriodSummary(yearInvoices, yearPayments, yearOrders, startOfMonth, today));
        result.put("thisYear", buildPeriodSummary(yearInvoices, yearPayments, yearOrders, startOfYear, today));

        // ── Monthly revenue trend (last 12 months) ──
        LocalDate trendStart = today.minusMonths(11).withDayOfMonth(1);
        List<Invoice> trendInvoices = invoiceRepository.findByTenantAndDateRange(tenantId, trendStart, today);
        List<Payment> trendPayments = paymentRepository.findByTenantAndDateRange(tenantId, trendStart, today);

        List<Map<String, Object>> monthlyTrend = new ArrayList<>();
        for (int i = 11; i >= 0; i--) {
            YearMonth ym = YearMonth.from(today.minusMonths(i));
            LocalDate mStart = ym.atDay(1);
            LocalDate mEnd = ym.atEndOfMonth();
            String label = ym.getMonth().name().substring(0, 3) + " " + ym.getYear();

            double invoiced = trendInvoices.stream()
                    .filter(inv -> !inv.getInvoiceDate().isBefore(mStart) && !inv.getInvoiceDate().isAfter(mEnd))
                    .mapToDouble(inv -> inv.getInvoiceAmount() != null ? inv.getInvoiceAmount() : 0).sum();
            double collected = trendPayments.stream()
                    .filter(p -> !p.getPaymentDate().isBefore(mStart) && !p.getPaymentDate().isAfter(mEnd))
                    .mapToDouble(p -> p.getAmount() != null ? p.getAmount() : 0).sum();

            monthlyTrend.add(Map.of("month", label, "invoiced", Math.round(invoiced * 100.0) / 100.0,
                    "collected", Math.round(collected * 100.0) / 100.0));
        }
        result.put("monthlyTrend", monthlyTrend);

        // ── Order status distribution (this year) ──
        Map<String, Long> orderStatusMap = yearOrders.stream()
                .collect(Collectors.groupingBy(
                        o -> o.getOrderStatus() != null ? o.getOrderStatus() : "UNKNOWN",
                        Collectors.counting()));
        List<Map<String, Object>> orderStatusDist = orderStatusMap.entrySet().stream()
                .map(e -> Map.<String, Object>of("status", e.getKey(), "count", e.getValue()))
                .collect(Collectors.toList());
        result.put("orderStatusDistribution", orderStatusDist);

        // ── Invoice payment status distribution (this year) ──
        Map<String, Long> payStatusMap = yearInvoices.stream()
                .collect(Collectors.groupingBy(
                        inv -> inv.getPaymentStatus() != null ? inv.getPaymentStatus() : "UNPAID",
                        Collectors.counting()));
        List<Map<String, Object>> payStatusDist = payStatusMap.entrySet().stream()
                .map(e -> Map.<String, Object>of("status", e.getKey(), "count", e.getValue()))
                .collect(Collectors.toList());
        result.put("invoicePaymentDistribution", payStatusDist);

        // ── Top 5 customers by invoice amount (this year) ──
        Map<String, Double> custTotals = new LinkedHashMap<>();
        for (Invoice inv : yearInvoices) {
            String name = inv.getCustomer() != null ? inv.getCustomer().getCustomerName() : "Unknown";
            custTotals.merge(name, inv.getInvoiceAmount() != null ? inv.getInvoiceAmount() : 0, Double::sum);
        }
        List<Map<String, Object>> topCustomers = custTotals.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .limit(5)
                .map(e -> Map.<String, Object>of("customer", e.getKey(), "amount", Math.round(e.getValue() * 100.0) / 100.0))
                .collect(Collectors.toList());
        result.put("topCustomers", topCustomers);

        // ── Recent invoices (last 5) ──
        List<Map<String, Object>> recentInvoices = yearInvoices.stream()
                .sorted(Comparator.comparing(Invoice::getInvoiceDate).reversed())
                .limit(5)
                .map(inv -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("invoiceNumber", inv.getInvoiceNumber());
                    m.put("invoiceDate", inv.getInvoiceDate().toString());
                    m.put("customerName", inv.getCustomer() != null ? inv.getCustomer().getCustomerName() : "-");
                    m.put("amount", inv.getInvoiceAmount());
                    m.put("paymentStatus", inv.getPaymentStatus());
                    return m;
                }).collect(Collectors.toList());
        result.put("recentInvoices", recentInvoices);

        return ResponseEntity.ok(result);
    }

    private Map<String, Object> buildPeriodSummary(List<Invoice> invoices, List<Payment> payments,
                                                    List<Order> orders, LocalDate from, LocalDate to) {
        double totalInvoiced = invoices.stream()
                .filter(i -> !i.getInvoiceDate().isBefore(from) && !i.getInvoiceDate().isAfter(to))
                .mapToDouble(i -> i.getInvoiceAmount() != null ? i.getInvoiceAmount() : 0).sum();
        long invoiceCount = invoices.stream()
                .filter(i -> !i.getInvoiceDate().isBefore(from) && !i.getInvoiceDate().isAfter(to)).count();
        double totalCollected = payments.stream()
                .filter(p -> !p.getPaymentDate().isBefore(from) && !p.getPaymentDate().isAfter(to))
                .mapToDouble(p -> p.getAmount() != null ? p.getAmount() : 0).sum();
        long paymentCount = payments.stream()
                .filter(p -> !p.getPaymentDate().isBefore(from) && !p.getPaymentDate().isAfter(to)).count();
        long orderCount = orders.stream()
                .filter(o -> o.getPoDate() != null && !o.getPoDate().isBefore(from) && !o.getPoDate().isAfter(to)).count();
        double totalOrderAmount = orders.stream()
                .filter(o -> o.getPoDate() != null && !o.getPoDate().isBefore(from) && !o.getPoDate().isAfter(to))
                .mapToDouble(o -> o.getOrderAmount() != null ? o.getOrderAmount() : 0).sum();

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("invoiceCount", invoiceCount);
        m.put("totalInvoiced", Math.round(totalInvoiced * 100.0) / 100.0);
        m.put("paymentCount", paymentCount);
        m.put("totalCollected", Math.round(totalCollected * 100.0) / 100.0);
        m.put("orderCount", orderCount);
        m.put("totalOrderAmount", Math.round(totalOrderAmount * 100.0) / 100.0);
        m.put("outstanding", Math.round((totalInvoiced - totalCollected) * 100.0) / 100.0);
        return m;
    }
}
