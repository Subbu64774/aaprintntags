package com.salesapp.productionunit.entity;

import com.salesapp.tenant.entity.Tenant;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "production_units")
@Data
public class ProductionUnit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long productionUnitId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @Column(nullable = false)
    private String unitName;

    private String unitCode;
    private String address;
    private String city;
    private String state;
    private String phone;

    private boolean active = true;
    private boolean deleted = false;

    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
}

