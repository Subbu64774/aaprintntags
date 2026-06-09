package com.salesapp.order.service;

import com.salesapp.config.TenantContext;
import com.salesapp.config.TenantContextException;
import com.salesapp.invoice.entity.Invoice;
import com.salesapp.invoice.entity.InvoiceProduct;
import com.salesapp.invoice.repository.InvoiceRepository;
import com.salesapp.order.dto.OrderDTO;
import com.salesapp.order.dto.OrderProductDTO;
import com.salesapp.order.entity.Order;
import com.salesapp.order.entity.OrderProduct;
import com.salesapp.order.repository.OrderRepository;
import com.salesapp.customer.service.CustomerService;
import com.salesapp.tenant.service.TenantService;
import com.salesapp.productionunit.service.ProductionUnitService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    private final OrderRepository orderRepository;
    private final CustomerService customerService;
    private final OrderProductService orderProductService;
    private final TenantService tenantService;
    private final ProductionUnitService productionUnitService;
    private final InvoiceRepository invoiceRepository;

    private Long tenantId() {
        Long id = TenantContext.getTenantId();
        if (id == null) {
        if (id == null) throw new TenantContextException();
        }
        return id;
    }

    public Page<OrderDTO> getAllOrders(PageRequest pageRequest) {
        return orderRepository.findAllByTenant(tenantId(), pageRequest).map(this::convertToDTO);
    }

    public Page<OrderDTO> getFilteredOrders(PageRequest pageRequest, String status, Long customerId, String poNumber, LocalDate fromDate, LocalDate toDate) {
        return orderRepository.findFiltered(tenantId(), status, customerId, poNumber, fromDate, toDate, pageRequest).map(this::convertToDTO);
    }

    public OrderDTO getOrderById(Long id) {
        return orderRepository.findById(id)
                .filter(o -> o.getTenant().getTenantId().equals(tenantId()) && !o.isDeleted())
                .map(this::convertToDTO).orElse(null);
    }

    @Transactional
    public OrderDTO saveOrder(OrderDTO orderDTO) {
        Order order;

        if (orderDTO.getOrderId() != null) {
            // Update existing order
            order = orderRepository.findById(orderDTO.getOrderId())
                    .filter(o -> o.getTenant().getTenantId().equals(tenantId()))
                    .orElseThrow(() -> new RuntimeException("Order not found"));
            order.getOrderProducts().clear();
        } else {
            // New order
            order = new Order();
            order.setTenant(tenantService.getTenantEntityById(tenantId()));
            Long puId = TenantContext.getProductionUnitId();
            if (puId != null) order.setProductionUnit(productionUnitService.getEntityById(puId));
            order.setCreatedAt(LocalDateTime.now());
        }

        order.setCustomer(customerService.getCustomerEntityById(orderDTO.getCustomerId()));
        order.setPoNumber(orderDTO.getPoNumber());
        order.setPoDate(orderDTO.getPoDate());
        order.setOrderStatus(orderDTO.getOrderStatus());
        order.setShippingAddress(orderDTO.getShippingAddress());
        order.setOrderDate(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());

        double subTotal = 0;
        double lineTaxTotal = 0;

        for (OrderProductDTO opDTO : orderDTO.getOrderProductDTOList()) {
            OrderProduct op = orderProductService.convertToOrderProduct(opDTO);
            op.setOrder(order);
            order.getOrderProducts().add(op);
            double lineAmt = (op.getQuantity() != null ? op.getQuantity() : 0)
                           * (op.getPrice()    != null ? op.getPrice()    : 0);
            subTotal += lineAmt;
            // Line-level GST from product row
            if (op.getCgst() != null || op.getSgst() != null || op.getIgst() != null) {
                double c = op.getCgst() != null ? op.getCgst() : 0;
                double s = op.getSgst() != null ? op.getSgst() : 0;
                double i = op.getIgst() != null ? op.getIgst() : 0;
                lineTaxTotal += lineAmt * (c + s + i) / 100.0;
            }
        }

        // Order amount = products + line-level GST only (delivery charges are on invoice)
        order.setOrderAmount(subTotal + lineTaxTotal);

        order = orderRepository.save(order);
        return convertToDTO(order);
    }

    @Transactional
    public boolean deleteOrder(Long id) {
        return orderRepository.findById(id)
                .filter(o -> o.getTenant().getTenantId().equals(tenantId()) && !o.isDeleted())
                .map(o -> {
                    if (hasActiveInvoices(o.getOrderId())) {
                        return false; // cannot delete — active invoices exist
                    }
                    o.setDeleted(true);
                    orderRepository.save(o);
                    return true;
                })
                .orElse(false);
    }

    private OrderDTO convertToDTO(Order order) {

        OrderDTO orderDTO = new OrderDTO();

        orderDTO.setOrderId(order.getOrderId());
        orderDTO.setPoNumber(order.getPoNumber());
        orderDTO.setPoDate(order.getPoDate());
        if (order.getCustomer() != null) {
            orderDTO.setCustomerId(order.getCustomer().getCustomerId());
            orderDTO.setCustomerName(order.getCustomer().getCustomerName());
        }

        List<OrderProductDTO> orderProductDTOList = new ArrayList<>();
        for (OrderProduct orderProduct : order.getOrderProducts()){
            orderProductDTOList.add(orderProductService.convertToOrderProductDTO(orderProduct));
        }
        orderDTO.setOrderProductDTOList(orderProductDTOList);

        orderDTO.setOrderDate(order.getOrderDate());
        orderDTO.setOrderStatus(order.getOrderStatus());
        orderDTO.setTotalAmount(order.getOrderAmount());
        orderDTO.setShippingAddress(order.getShippingAddress());


        // Tenant + production unit info
        if (order.getTenant() != null) {
            orderDTO.setTenantName(order.getTenant().getTenantName());
            orderDTO.setTenantLogoUrl(order.getTenant().getLogoUrl());
        }
        if (order.getProductionUnit() != null) {
            orderDTO.setProductionUnitId(order.getProductionUnit().getProductionUnitId());
            orderDTO.setProductionUnitName(order.getProductionUnit().getUnitName());
        }

        boolean hasInvoices = hasActiveInvoices(order.getOrderId());
        orderDTO.setHasInvoices(hasInvoices);
        orderDTO.setFullyInvoiced(hasInvoices && isFullyInvoiced(order));

        return orderDTO;
    }

    private boolean hasActiveInvoices(Long orderId) {
        List<Invoice> invoices = invoiceRepository.findByOrderId(orderId);
        return invoices.stream().anyMatch(i -> !i.isDeleted());
    }

    private boolean isFullyInvoiced(Order order) {
        if (order.getOrderProducts().isEmpty()) return false;
        Map<Long, Integer> invoicedMap = new HashMap<>();
        List<Invoice> invoices = invoiceRepository.findByOrderId(order.getOrderId());
        for (Invoice inv : invoices) {
            if (inv.isDeleted()) continue;
            for (InvoiceProduct ip : inv.getInvoiceProducts()) {
                if (ip.getOrderProduct() == null) continue; // migrated data may lack link
                Long opId = ip.getOrderProduct().getOrderProductId();
                invoicedMap.merge(opId, ip.getQuantity() != null ? ip.getQuantity() : 0, Integer::sum);
            }
        }
        for (OrderProduct op : order.getOrderProducts()) {
            int invoiced = invoicedMap.getOrDefault(op.getOrderProductId(), 0);
            int ordered = op.getQuantity() != null ? op.getQuantity() : 0;
            if (invoiced < ordered) return false;
        }
        return true;
    }
}
