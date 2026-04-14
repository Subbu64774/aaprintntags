package com.aaprint.customer.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CustomerDTO {

    private Long customerId;

    @NotBlank(message = "Name is required")
    @Size(max = 100, message = "Name must be at most 100 characters")
    private String customerName;

    @Size(max = 15, message = "Phone number must be at most 15 characters")
    private String phone;

    @Email(message = "Invalid email format")
    @Size(max = 100, message = "Email must be at most 100 characters")
    private String email;

    @Size(max = 30, message = "GST number must be at most 30 characters")
    private String gstNumber;

    @Size(max = 255, message = "Current address must be at most 255 characters")
    private String currentAddress;

    @Size(max = 255, message = "Billing address must be at most 255 characters")
    private String billingAddress;

    @Size(max = 255, message = "Delivery address must be at most 255 characters")
    private String deliveryAddress;
}