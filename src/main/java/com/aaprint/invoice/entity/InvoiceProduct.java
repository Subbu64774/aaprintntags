package com.aaprint.invoice.entity;

import com.aaprint.order.entity.OrderProduct;
import com.aaprint.product.entity.Product;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "invoice_products")
@Data
@NoArgsConstructor
public class InvoiceProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long invoiceProductId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id")
    private Invoice invoice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_product_id")
    private OrderProduct orderProduct;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    private Integer quantity;
    private Double price;
    private String size;

    @Column(length = 500)
    private String description;

    private String hsnCode;

    // Line-level GST rates (copied from OrderProduct at invoice creation time)
    private Double cgst;
    private Double sgst;
    private Double igst;
}

