package com.salesapp.report.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CustomerStatementDTO {

    // Tenant / Company info (for PDF header)
    private String tenantName;
    private String tenantAddress;
    private String tenantCity;
    private String tenantState;
    private String tenantPincode;
    private String tenantPhone;
    private String tenantEmail;
    private String tenantGst;
    private String tenantRegisteredAddress;

    // Filter info
    private Long customerId;
    private String customerName;
    private LocalDate fromDate;
    private LocalDate toDate;

    // Summary
    private double totalInvoiced;
    private double totalPaid;
    private double totalOutstanding;
    private int invoiceCount;
    private int paymentCount;

    // Line items
    private List<InvoiceLineDTO> invoices;
    private List<PaymentLineDTO> payments;
    private List<InvoiceLineDTO> pendingInvoices; // unpaid/partially paid

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class InvoiceLineDTO {
        private Long invoiceId;
        private String invoiceNumber;
        private LocalDate invoiceDate;
        private LocalDateTime createdAt;
        private String poNumber;
        private double invoiceAmount;
        private double paidAmount;
        private double balanceAmount;
        private String invoiceStatus;
        private String paymentStatus;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PaymentLineDTO {
        private Long paymentId;
        private String paymentNumber;
        private LocalDate paymentDate;
        private LocalDateTime createdAt;
        private double amount;
        private String paymentMode;
        private String referenceNumber;
        private String invoiceNumber;
        private Long invoiceId;
    }
}

