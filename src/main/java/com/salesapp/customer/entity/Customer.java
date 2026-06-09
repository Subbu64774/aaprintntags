package com.salesapp.customer.entity;

import com.salesapp.productionunit.entity.ProductionUnit;
import com.salesapp.tenant.entity.Tenant;
import jakarta.persistence.*;
import lombok.Data;
import lombok.ToString;

import java.time.LocalDateTime;

@Entity
@Table(name = "customers")
@Data
@ToString
public class Customer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long customerId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "production_unit_id")
    private ProductionUnit productionUnit;

    private String customerName;
    private String currentAddress;
    private String billingAddress;
    private String deliveryAddress;
    private String phone;
    private String email;
    private String gstNumber;

    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;

    private boolean deleted = false;
}