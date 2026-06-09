package com.salesapp.order.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class OrderDTO {

    private Long orderId;
    private String poNumber;
    private LocalDate poDate;
    private Long customerId;
    private String customerName;
    private List<OrderProductDTO> orderProductDTOList;

    private LocalDateTime orderDate;

    private String orderStatus;
    private Double totalAmount;


    private String shippingAddress;
    private boolean fullyInvoiced;
    private boolean hasInvoices;

    // Tenant info for Job Card
    private String tenantName;
    private String tenantLogoUrl;
    private Long productionUnitId;
    private String productionUnitName;
}
