package com.aaprint.product.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ProductDTO {

    private Long productId;

    @NotBlank(message = "Product name is required")
    private String productName;

    private String productSize;
    private String productPrice;
    private String hsnCode;
    private String additionalWorks;

}
