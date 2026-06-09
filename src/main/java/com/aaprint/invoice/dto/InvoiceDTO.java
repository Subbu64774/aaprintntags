package com.aaprint.invoice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class InvoiceDTO {

    private Long invoiceId;
    private String invoiceNumber;
    private LocalDate invoiceDate;

    private Long orderId;
    private String poNumber;
    private Long customerId;
    private String customerName;
    private String customerPhone;
    private String customerGstNumber;

    private Long productionUnitId;
    private String productionUnitName;
    private String productionUnitAddress;

    // Tenant info for invoice PDF
    private String tenantName;
    private String tenantPhone;
    private String tenantGstNumber;
    private String tenantLogoUrl;
    private String tenantBankName;
    private String tenantBankAccountName;
    private String tenantBankAccountNumber;
    private String tenantBankIfsc;
    private String tenantFscNumber;
    private String tenantRegisteredAddress;

    private List<InvoiceProductDTO> invoiceProductDTOList;

    private String billToAddress;
    private String shipToAddress;

    private Double cgst;
    private Double sgst;
    private Double igst;
    private Double deliveryCharges;
    private Double invoiceAmount;

    private boolean roundOff;
    private Double roundOffAmount;

    private boolean fscInvoice;

    private String invoiceStatus;
    private String paymentStatus;
    private Double paidAmount;
    private Double balanceAmount;
    private String remarks;
}

