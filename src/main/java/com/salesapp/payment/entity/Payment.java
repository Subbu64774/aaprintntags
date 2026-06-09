package com.salesapp.payment.entity;

import com.salesapp.customer.entity.Customer;
import com.salesapp.invoice.entity.Invoice;
import com.salesapp.tenant.entity.Tenant;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Data
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long paymentId;

    @Column(nullable = false)
    private String paymentNumber;

    private LocalDate paymentDate;
    private Double amount;

    private String paymentMode; // CASH, UPI, BANK_TRANSFER, CHEQUE, OTHER

    private String referenceNumber; // cheque no, UTR, transaction id

    @Column(length = 500)
    private String remarks;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    private Invoice invoice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    private boolean deleted = false;

    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
}

