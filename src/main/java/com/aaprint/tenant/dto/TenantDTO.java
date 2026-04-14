package com.aaprint.tenant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

/**
 * DTO for Tenant — a business subscribed to Sales App.
 */
@Data
public class TenantDTO {

    private Long tenantId;

    @NotBlank(message = "Tenant code is required")
    @Size(max = 30)
    private String tenantCode;

    @NotBlank(message = "Business name is required")
    @Size(max = 150)
    private String tenantName;

    private String contactPerson;
    private String contactEmail;
    private String phone;

    private String gstNumber;
    private String panNumber;
    private String businessType;
    private String fscLicenseNumber;

    private String bankName;
    private String bankAccountName;
    private String bankAccountNumber;
    private String bankIfsc;

    private String logoUrl;

    private String address;
    private String city;
    private String state;
    private String pincode;
    private String country;
    private String registeredAddress;

    private LocalDate subscriptionStart;
    private LocalDate subscriptionEnd;
    private String plan;

    private boolean active;
}

