package com.aaprint.productionunit.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ProductionUnitDTO {

    private Long productionUnitId;

    @NotNull(message = "Tenant is required")
    private Long tenantId;

    @NotBlank(message = "Unit name is required")
    private String unitName;

    private String unitCode;
    private String address;
    private String city;
    private String state;
    private String phone;
    private boolean active;
}

