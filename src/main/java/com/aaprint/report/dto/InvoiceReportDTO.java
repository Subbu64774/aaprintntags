package com.aaprint.report.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class InvoiceReportDTO {

    // Tenant info (for PDF header)
    private String tenantName;
    private String tenantRegisteredAddress;
    private String tenantAddress;
    private String tenantCity;
    private String tenantState;
    private String tenantPincode;
    private String tenantPhone;
    private String tenantEmail;
    private String tenantGst;

    // Filters
    private Long customerId;
    private String customerName;
    private LocalDate fromDate;
    private LocalDate toDate;

    // Summary
    private double totalInvoiced;
    private double totalPaid;
    private double totalPending;
    private int count;

    // Lines
    private List<InvoiceLineDTO> invoices;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class InvoiceLineDTO {
        private Long invoiceId;
        private String customerName;
        private String poNumber;
        private LocalDate invoiceDate;
        private String invoiceNumber;
        private double invoiceAmount;
        private double paidAmount;
        private double pendingAmount;
        private long daysPending;
        private String paymentStatus;
    }
}

