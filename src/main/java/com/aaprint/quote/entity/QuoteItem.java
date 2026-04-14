package com.aaprint.quote.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "quote_items")
@Data
@NoArgsConstructor
public class QuoteItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long quoteItemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quote_id")
    private Quote quote;

    @Column(nullable = false)
    private String productName;

    @Column(length = 500)
    private String description;

    private Integer quantity;
    private Double price;
    private Double totalPrice; // qty * price (before GST)

    // Line-level GST rate percentages
    private Double cgst;
    private Double sgst;
    private Double igst;

    // Computed GST amounts
    private Double cgstAmount;
    private Double sgstAmount;
    private Double igstAmount;

    // lineTotal = totalPrice + cgstAmount + sgstAmount + igstAmount
    private Double lineTotal;
}

