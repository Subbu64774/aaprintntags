package com.aaprint.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PaymentDTO {

    private Long paymentId;
    private String paymentNumber;
    private LocalDate paymentDate;
    private Double amount;
    private String paymentMode;
    private String referenceNumber;
    private String remarks;

    private Long invoiceId;
    private String invoiceNumber;
    private Double invoiceAmount;

    private Long customerId;
    private String customerName;

    // Computed — for display
    private Double paidAmount;      // total paid so far on this invoice
    private Double balanceAmount;   // remaining balance on this invoice
}

