package com.aaprint.invoice.entity;

import com.aaprint.customer.entity.Customer;
import com.aaprint.order.entity.Order;
import com.aaprint.productionunit.entity.ProductionUnit;
import com.aaprint.tenant.entity.Tenant;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "invoices")
@Data
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long invoiceId;

    @Column(nullable = false)
    private String invoiceNumber;

    private LocalDate invoiceDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "production_unit_id")
    private ProductionUnit productionUnit;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InvoiceProduct> invoiceProducts = new ArrayList<>();

    private String billToAddress;
    private String shipToAddress;

    private Double cgst;
    private Double sgst;
    private Double igst;
    private Double deliveryCharges;
    private Double invoiceAmount;

    private boolean roundOff = false;
    private Double roundOffAmount;

    private boolean fscInvoice = false;

    private String invoiceStatus; // DRAFT, FINALIZED, CANCELLED

    private String paymentStatus = "UNPAID"; // UNPAID, PARTIALLY_PAID, PAID

    @Column(length = 500)
    private String remarks;

    private boolean deleted = false;

    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
}

