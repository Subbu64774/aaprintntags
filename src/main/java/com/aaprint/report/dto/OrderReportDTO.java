package com.aaprint.report.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class OrderReportDTO {

    // Tenant info (for PDF header)
    private String tenantName;
    private String tenantRegisteredAddress;
    private String tenantAddress;
    private String tenantCity;
    private String tenantState;
    private String tenantPincode;
    private String tenantPhone;
    private String tenantEmail;
    private String tenantGst;

    // Filters
    private Long customerId;
    private String customerName;
    private LocalDate fromDate;
    private LocalDate toDate;

    // Summary
    private int totalOrders;
    private int pendingOrders;
    private int completedOrders;

    // Lines
    private List<OrderLineDTO> orders;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class OrderLineDTO {
        private Long orderId;
        private String customerName;
        private String poNumber;
        private LocalDate poDate;
        private int totalQuantity;
        private int invoicedQuantity;
        private String status;
    }
}

