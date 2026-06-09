package com.salesapp.report.service;

import com.salesapp.config.TenantContext;
import com.salesapp.config.TenantContextException;
import com.salesapp.invoice.entity.Invoice;
import com.salesapp.invoice.repository.InvoiceRepository;
import com.salesapp.order.entity.Order;
import com.salesapp.order.repository.OrderRepository;
import com.salesapp.payment.entity.Payment;
import com.salesapp.payment.repository.PaymentRepository;
import com.salesapp.report.dto.CustomerStatementDTO;
import com.salesapp.report.dto.CustomerStatementDTO.InvoiceLineDTO;
import com.salesapp.report.dto.CustomerStatementDTO.PaymentLineDTO;
import com.salesapp.report.dto.InvoiceReportDTO;
import com.salesapp.report.dto.OrderReportDTO;
import com.salesapp.tenant.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final TenantRepository tenantRepository;
    private final OrderRepository orderRepository;

    private Long tenantId() {
        Long id = TenantContext.getTenantId();
        if (id == null) throw new TenantContextException();
        return id;
    }

    /**
     * Generate a customer account statement for a date range.
     * If customerId is null, returns aggregated data for ALL customers.
     */
    public CustomerStatementDTO getCustomerStatement(Long customerId, LocalDate from, LocalDate to) {
        List<Invoice> invoices;
        List<Payment> payments;

        if (customerId != null) {
            invoices = invoiceRepository.findByTenantAndCustomerAndDateRange(tenantId(), customerId, from, to);
            payments = paymentRepository.findByTenantAndCustomerAndDateRange(tenantId(), customerId, from, to);
        } else {
            invoices = invoiceRepository.findByTenantAndDateRange(tenantId(), from, to);
            payments = paymentRepository.findByTenantAndDateRange(tenantId(), from, to);
        }

        // Build invoice lines
        List<InvoiceLineDTO> invoiceLines = new ArrayList<>();
        List<InvoiceLineDTO> pendingLines = new ArrayList<>();
        double totalInvoiced = 0;

        for (Invoice inv : invoices) {
            double invAmt = inv.getInvoiceAmount() != null ? inv.getInvoiceAmount() : 0;
            double paid = paymentRepository.sumAmountByInvoiceId(inv.getInvoiceId());
            double balance = invAmt - paid;

            String payStatus;
            if (paid >= invAmt - 0.01 && invAmt > 0) payStatus = "PAID";
            else if (paid > 0) payStatus = "PARTIALLY_PAID";
            else payStatus = "UNPAID";

            InvoiceLineDTO line = new InvoiceLineDTO();
            line.setInvoiceId(inv.getInvoiceId());
            line.setInvoiceNumber(inv.getInvoiceNumber());
            line.setInvoiceDate(inv.getInvoiceDate());
            line.setCreatedAt(inv.getCreatedAt());
            line.setPoNumber(inv.getOrder() != null ? inv.getOrder().getPoNumber() : null);
            line.setInvoiceAmount(invAmt);
            line.setPaidAmount(paid);
            line.setBalanceAmount(balance);
            line.setInvoiceStatus(inv.getInvoiceStatus());
            line.setPaymentStatus(payStatus);

            invoiceLines.add(line);
            totalInvoiced += invAmt;

            if (balance > 0.01) {
                pendingLines.add(line);
            }
        }

        // Build payment lines
        List<PaymentLineDTO> paymentLines = new ArrayList<>();
        double totalPaid = 0;

        for (Payment pay : payments) {
            PaymentLineDTO pLine = new PaymentLineDTO();
            pLine.setPaymentId(pay.getPaymentId());
            pLine.setPaymentNumber(pay.getPaymentNumber());
            pLine.setPaymentDate(pay.getPaymentDate());
            pLine.setCreatedAt(pay.getCreatedAt());
            pLine.setAmount(pay.getAmount() != null ? pay.getAmount() : 0);
            pLine.setPaymentMode(pay.getPaymentMode());
            pLine.setReferenceNumber(pay.getReferenceNumber());
            pLine.setInvoiceNumber(pay.getInvoice().getInvoiceNumber());
            pLine.setInvoiceId(pay.getInvoice().getInvoiceId());
            paymentLines.add(pLine);
            totalPaid += (pay.getAmount() != null ? pay.getAmount() : 0);
        }

        // Build result
        CustomerStatementDTO dto = new CustomerStatementDTO();
        dto.setCustomerId(customerId);
        if (customerId != null && !invoices.isEmpty()) {
            dto.setCustomerName(invoices.get(0).getCustomer().getCustomerName());
        } else if (customerId != null && !payments.isEmpty()) {
            dto.setCustomerName(payments.get(0).getCustomer().getCustomerName());
        } else {
            dto.setCustomerName("All Customers");
        }
        dto.setFromDate(from);
        dto.setToDate(to);
        dto.setTotalInvoiced(totalInvoiced);
        dto.setTotalPaid(totalPaid);
        dto.setTotalOutstanding(totalInvoiced - totalPaid);
        dto.setInvoiceCount(invoiceLines.size());
        dto.setPaymentCount(paymentLines.size());
        dto.setInvoices(invoiceLines);
        dto.setPayments(paymentLines);
        dto.setPendingInvoices(pendingLines);

        // Populate tenant info for PDF header
        tenantRepository.findById(tenantId()).ifPresent(t -> {
            dto.setTenantName(t.getTenantName());
            dto.setTenantAddress(t.getAddress());
            dto.setTenantCity(t.getCity());
            dto.setTenantState(t.getState());
            dto.setTenantPincode(t.getPincode());
            dto.setTenantPhone(t.getPhone());
            dto.setTenantEmail(t.getContactEmail());
            dto.setTenantGst(t.getGstNumber());
            dto.setTenantRegisteredAddress(t.getRegisteredAddress());
        });

        return dto;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Payment Pending Report
    // ─────────────────────────────────────────────────────────────────────────
    public InvoiceReportDTO getPaymentPendingReport(Long customerId, LocalDate from, LocalDate to) {
        List<Invoice> invoices = customerId != null
                ? invoiceRepository.findByTenantAndCustomerAndDateRange(tenantId(), customerId, from, to)
                : invoiceRepository.findByTenantAndDateRange(tenantId(), from, to);

        LocalDate today = LocalDate.now();
        List<InvoiceReportDTO.InvoiceLineDTO> lines = new ArrayList<>();
        double totalInvoiced = 0, totalPaid = 0, totalPending = 0;

        for (Invoice inv : invoices) {
            double invAmt = inv.getInvoiceAmount() != null ? inv.getInvoiceAmount() : 0;
            double paid = paymentRepository.sumAmountByInvoiceId(inv.getInvoiceId());
            double pending = invAmt - paid;
            if (pending <= 0.01) continue; // skip fully paid invoices

            long daysPending = inv.getInvoiceDate() != null
                    ? Math.max(0, ChronoUnit.DAYS.between(inv.getInvoiceDate(), today))
                    : 0;

            InvoiceReportDTO.InvoiceLineDTO line = new InvoiceReportDTO.InvoiceLineDTO();
            line.setInvoiceId(inv.getInvoiceId());
            line.setCustomerName(inv.getCustomer() != null ? inv.getCustomer().getCustomerName() : null);
            line.setPoNumber(inv.getOrder() != null ? inv.getOrder().getPoNumber() : null);
            line.setInvoiceDate(inv.getInvoiceDate());
            line.setInvoiceNumber(inv.getInvoiceNumber());
            line.setInvoiceAmount(invAmt);
            line.setPaidAmount(paid);
            line.setPendingAmount(pending);
            line.setDaysPending(daysPending);
            line.setPaymentStatus(paid > 0.01 ? "PARTIALLY_PAID" : "UNPAID");
            lines.add(line);
            totalInvoiced += invAmt;
            totalPaid += paid;
            totalPending += pending;
        }

        String custName = resolveCustomerName(customerId, invoices);
        InvoiceReportDTO dto = buildInvoiceReportDTO(customerId, custName, from, to,
                totalInvoiced, totalPaid, totalPending, lines);
        return dto;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Payment Completed Report
    // ─────────────────────────────────────────────────────────────────────────
    public InvoiceReportDTO getPaymentCompletedReport(Long customerId, LocalDate from, LocalDate to) {
        List<Invoice> invoices = customerId != null
                ? invoiceRepository.findByTenantAndCustomerAndDateRange(tenantId(), customerId, from, to)
                : invoiceRepository.findByTenantAndDateRange(tenantId(), from, to);

        List<InvoiceReportDTO.InvoiceLineDTO> lines = new ArrayList<>();
        double totalInvoiced = 0, totalPaid = 0, totalPending = 0;

        for (Invoice inv : invoices) {
            double invAmt = inv.getInvoiceAmount() != null ? inv.getInvoiceAmount() : 0;
            double paid = paymentRepository.sumAmountByInvoiceId(inv.getInvoiceId());
            if (paid <= 0.01) continue; // skip invoices with no payment at all

            double remaining = Math.max(0, invAmt - paid);

            InvoiceReportDTO.InvoiceLineDTO line = new InvoiceReportDTO.InvoiceLineDTO();
            line.setInvoiceId(inv.getInvoiceId());
            line.setCustomerName(inv.getCustomer() != null ? inv.getCustomer().getCustomerName() : null);
            line.setPoNumber(inv.getOrder() != null ? inv.getOrder().getPoNumber() : null);
            line.setInvoiceDate(inv.getInvoiceDate());
            line.setInvoiceNumber(inv.getInvoiceNumber());
            line.setInvoiceAmount(invAmt);
            line.setPaidAmount(paid);
            line.setPendingAmount(remaining); // "remaining amount" reused here
            line.setDaysPending(0);
            line.setPaymentStatus(remaining <= 0.01 ? "PAID" : "PARTIALLY_PAID");
            lines.add(line);
            totalInvoiced += invAmt;
            totalPaid += paid;
            totalPending += remaining;
        }

        String custName = resolveCustomerName(customerId, invoices);
        InvoiceReportDTO dto = buildInvoiceReportDTO(customerId, custName, from, to,
                totalInvoiced, totalPaid, totalPending, lines);
        return dto;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Order Report
    // ─────────────────────────────────────────────────────────────────────────
    public OrderReportDTO getOrderReport(Long customerId, LocalDate from, LocalDate to) {
        List<Order> orders = orderRepository.findForReport(tenantId(), customerId, from, to);

        List<OrderReportDTO.OrderLineDTO> lines = new ArrayList<>();
        int pending = 0, completed = 0;

        for (Order o : orders) {
            int totalQty = o.getOrderProducts().stream()
                    .mapToInt(op -> op.getQuantity() != null ? op.getQuantity() : 0)
                    .sum();

            List<com.salesapp.invoice.entity.Invoice> orderInvoices =
                    invoiceRepository.findByOrderId(o.getOrderId());
            int invoicedQty = orderInvoices.stream()
                    .flatMap(inv -> inv.getInvoiceProducts().stream())
                    .mapToInt(ip -> ip.getQuantity() != null ? ip.getQuantity() : 0)
                    .sum();

            String status = "COMPLETED".equalsIgnoreCase(o.getOrderStatus()) ? "Completed"
                    : "CANCELLED".equalsIgnoreCase(o.getOrderStatus()) ? "Cancelled"
                    : "PROCESSING".equalsIgnoreCase(o.getOrderStatus()) ? "Processing"
                    : "Pending";

            if ("Completed".equals(status)) completed++;
            else if (!"Cancelled".equals(status)) pending++;

            OrderReportDTO.OrderLineDTO line = new OrderReportDTO.OrderLineDTO();
            line.setOrderId(o.getOrderId());
            line.setCustomerName(o.getCustomer() != null ? o.getCustomer().getCustomerName() : null);
            line.setPoNumber(o.getPoNumber());
            line.setPoDate(o.getPoDate());
            line.setTotalQuantity(totalQty);
            line.setInvoicedQuantity(invoicedQty);
            line.setStatus(status);
            lines.add(line);
        }

        String custName = customerId != null && !orders.isEmpty() && orders.get(0).getCustomer() != null
                ? orders.get(0).getCustomer().getCustomerName() : "All Customers";

        OrderReportDTO dto = new OrderReportDTO();
        dto.setCustomerId(customerId);
        dto.setCustomerName(custName);
        dto.setFromDate(from);
        dto.setToDate(to);
        dto.setOrders(lines);
        dto.setTotalOrders(lines.size());
        dto.setPendingOrders(pending);
        dto.setCompletedOrders(completed);

        tenantRepository.findById(tenantId()).ifPresent(t -> {
            dto.setTenantName(t.getTenantName());
            dto.setTenantAddress(t.getAddress());
            dto.setTenantCity(t.getCity());
            dto.setTenantState(t.getState());
            dto.setTenantPincode(t.getPincode());
            dto.setTenantPhone(t.getPhone());
            dto.setTenantEmail(t.getContactEmail());
            dto.setTenantGst(t.getGstNumber());
            dto.setTenantRegisteredAddress(t.getRegisteredAddress());
        });

        return dto;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────
    private String resolveCustomerName(Long customerId, List<Invoice> invoices) {
        if (customerId == null) return "All Customers";
        return invoices.stream()
                .filter(i -> i.getCustomer() != null)
                .map(i -> i.getCustomer().getCustomerName())
                .findFirst()
                .orElse("Unknown Customer");
    }

    private InvoiceReportDTO buildInvoiceReportDTO(Long customerId, String custName,
            LocalDate from, LocalDate to,
            double totalInvoiced, double totalPaid, double totalPending,
            List<InvoiceReportDTO.InvoiceLineDTO> lines) {
        InvoiceReportDTO dto = new InvoiceReportDTO();
        dto.setCustomerId(customerId);
        dto.setCustomerName(custName);
        dto.setFromDate(from);
        dto.setToDate(to);
        dto.setTotalInvoiced(totalInvoiced);
        dto.setTotalPaid(totalPaid);
        dto.setTotalPending(totalPending);
        dto.setCount(lines.size());
        dto.setInvoices(lines);

        tenantRepository.findById(tenantId()).ifPresent(t -> {
            dto.setTenantName(t.getTenantName());
            dto.setTenantAddress(t.getAddress());
            dto.setTenantCity(t.getCity());
            dto.setTenantState(t.getState());
            dto.setTenantPincode(t.getPincode());
            dto.setTenantPhone(t.getPhone());
            dto.setTenantEmail(t.getContactEmail());
            dto.setTenantGst(t.getGstNumber());
            dto.setTenantRegisteredAddress(t.getRegisteredAddress());
        });

        return dto;
    }
}
