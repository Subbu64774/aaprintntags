package com.salesapp.quote.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class QuoteItemDTO {
    private Long quoteItemId;
    private String productName;
    private String description;
    private Integer quantity;
    private Double price;
    private Double totalPrice;

    // GST rate percentages
    private Double cgst;
    private Double sgst;
    private Double igst;

    // Computed GST amounts
    private Double cgstAmount;
    private Double sgstAmount;
    private Double igstAmount;

    // lineTotal = totalPrice + all GST amounts
    private Double lineTotal;
}

