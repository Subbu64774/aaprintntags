package com.salesapp.report.controller;

import com.salesapp.report.dto.CustomerStatementDTO;
import com.salesapp.report.dto.InvoiceReportDTO;
import com.salesapp.report.dto.OrderReportDTO;
import com.salesapp.report.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/reports")
public class ReportRestController {

    private final ReportService reportService;

    /** GET /api/reports/customer-statement */
    @GetMapping("/customer-statement")
    public ResponseEntity<CustomerStatementDTO> getCustomerStatement(
            @RequestParam(required = false) Long customerId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(reportService.getCustomerStatement(customerId, from, to));
    }

    /** GET /api/reports/payment-pending */
    @GetMapping("/payment-pending")
    public ResponseEntity<InvoiceReportDTO> getPaymentPendingReport(
            @RequestParam(required = false) Long customerId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(reportService.getPaymentPendingReport(customerId, from, to));
    }

    /** GET /api/reports/payment-completed */
    @GetMapping("/payment-completed")
    public ResponseEntity<InvoiceReportDTO> getPaymentCompletedReport(
            @RequestParam(required = false) Long customerId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(reportService.getPaymentCompletedReport(customerId, from, to));
    }

    /** GET /api/reports/order-report */
    @GetMapping("/order-report")
    public ResponseEntity<OrderReportDTO> getOrderReport(
            @RequestParam(required = false) Long customerId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(reportService.getOrderReport(customerId, from, to));
    }
}
