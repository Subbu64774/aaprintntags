package com.salesapp.invoice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class InvoiceProductDTO {

    private Long invoiceProductId;
    private Long orderProductId;
    private Long productId;
    private String productName;
    private Integer orderedQuantity;      // from order line — for display
    private Integer alreadyInvoicedQty;   // sum of all previous invoices — for display
    private Integer quantity;             // qty being invoiced
    private Double price;
    private String size;
    private String description;
    private String hsnCode;
    private boolean selected;             // checkbox state from frontend

    // Line-level GST inherited from OrderProduct (null = order-level GST applies)
    private Double cgst;
    private Double sgst;
    private Double igst;
}

