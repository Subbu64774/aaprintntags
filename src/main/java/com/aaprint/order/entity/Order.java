package com.aaprint.order.entity;

import com.aaprint.customer.entity.Customer;
import com.aaprint.product.entity.Product;
import com.aaprint.tenant.entity.Tenant;
import com.aaprint.productionunit.entity.ProductionUnit;
import jakarta.persistence.*;
import lombok.Data;
import lombok.ToString;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@Data
@ToString
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long orderId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "production_unit_id")
    private ProductionUnit productionUnit;

    private String poNumber;
    private LocalDate poDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderProduct> orderProducts = new ArrayList<>();

    private LocalDateTime orderDate;
    private String orderStatus;
    private Double orderAmount;

    private String shippingAddress;

    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;


    private boolean deleted = false;

    public void addProduct(Product product, Integer quantity) {
        OrderProduct orderProduct = new OrderProduct(this, product, quantity);
        this.orderProducts.add(orderProduct);
        orderProduct.setOrder(this); // keep both sides in sync
    }

    public void removeProduct(Product product) {
        this.orderProducts.removeIf(op -> {
            if (op.getProduct().equals(product)) {
                op.setOrder(null); // break the link from child side as well
                return true;
            }
            return false;
        });
    }
}
