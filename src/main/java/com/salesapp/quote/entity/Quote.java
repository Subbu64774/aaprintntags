package com.salesapp.quote.entity;

import com.salesapp.customer.entity.Customer;
import com.salesapp.tenant.entity.Tenant;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "quotes")
@Data
public class Quote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long quoteId;

    @Column(nullable = false)
    private String quoteNumber;

    private LocalDate quoteDate;

    private Integer validityDays;

    // Linked customer (nullable — adhoc quotes allowed)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    // Adhoc customer info (used when customer is null)
    private String adhocCustomerName;
    private String adhocCustomerEmail;
    private String adhocCustomerPhone;
    private String adhocCustomerGst;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @OneToMany(mappedBy = "quote", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<QuoteItem> quoteItems = new ArrayList<>();

    private boolean includeGst = false;

    private Double subTotal;
    private Double totalCgst;
    private Double totalSgst;
    private Double totalIgst;
    private Double grandTotal;

    // DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED
    private String status = "DRAFT";

    @Column(length = 1000)
    private String remarks;

    private boolean deleted = false;

    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
}

