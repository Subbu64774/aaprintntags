package com.salesapp.product.entity;

import com.salesapp.tenant.entity.Tenant;
import com.salesapp.productionunit.entity.ProductionUnit;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;


import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Entity
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long productId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "production_unit_id")
    private ProductionUnit productionUnit;

    private String productName;
    private String productSize;
    private String productPrice;
    private String hsnCode;
    @Column(length = 1000)
    private String additionalWorks;

    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;

    private boolean deleted = false;
}