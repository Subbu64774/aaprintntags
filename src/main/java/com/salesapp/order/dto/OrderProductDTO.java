package com.salesapp.order.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class OrderProductDTO {

    Long orderId;
    Long productId;
    String productName;
    Integer quantity;
    Double price;
    String size;
    String description;
    String additionalWorks;

    // Line-level GST (null = use order-level GST)
    Double cgst;
    Double sgst;
    Double igst;
}
