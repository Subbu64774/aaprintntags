package com.salesapp.quote.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class QuoteDTO {
    private Long quoteId;
    private String quoteNumber;
    private LocalDate quoteDate;
    private Integer validityDays;
    private LocalDate validUntil; // computed: quoteDate + validityDays

    // Linked customer
    private Long customerId;
    private String customerName;
    private String customerEmail;
    private String customerPhone;
    private String customerGst;

    // Adhoc customer (when no customer selected)
    private String adhocCustomerName;
    private String adhocCustomerEmail;
    private String adhocCustomerPhone;
    private String adhocCustomerGst;

    // Tenant info for PDF
    private String tenantName;
    private String tenantPhone;
    private String tenantEmail;
    private String tenantGstNumber;
    private String tenantLogoUrl;
    private String tenantRegisteredAddress;
    private String tenantBankName;
    private String tenantBankAccountName;
    private String tenantBankAccountNumber;
    private String tenantBankIfsc;

    private boolean includeGst;

    private List<QuoteItemDTO> quoteItems;

    private Double subTotal;
    private Double totalCgst;
    private Double totalSgst;
    private Double totalIgst;
    private Double grandTotal;

    // DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED
    private String status;
    private String remarks;
}

