package com.salesapp.tenant.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Tenant = a business that has subscribed to Sales App.
 * e.g., "AA PRINT N TAGS" is a tenant.
 * Each tenant has their own customers, products, orders, employees.
 */
@Entity
@Table(name = "tenants")
@Data
public class Tenant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long tenantId;

    @Column(nullable = false, unique = true)
    private String tenantCode;

    @Column(nullable = false)
    private String tenantName;

    // Business contact
    private String contactPerson;
    private String contactEmail;
    private String phone;

    // Business details
    private String gstNumber;
    private String panNumber;
    private String businessType; // e.g., Printing, Manufacturing, Trading
    private String fscLicenseNumber;

    // Bank details
    private String bankName;
    private String bankAccountName;
    private String bankAccountNumber;
    private String bankIfsc;

    // Logo
    @Column(length = 500)
    private String logoUrl;

    // Address
    private String address;
    private String city;
    private String state;
    private String pincode;
    private String country;

    @Column(length = 500)
    private String registeredAddress;

    // Subscription
    private LocalDate subscriptionStart;
    private LocalDate subscriptionEnd;
    private String plan; // e.g., FREE, BASIC, PRO

    private boolean active = true;
    private boolean deleted = false;

    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
}

