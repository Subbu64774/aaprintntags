package com.aaprint.invoice.service;

import com.aaprint.config.TenantContext;
import com.aaprint.config.TenantContextException;
import com.aaprint.invoice.dto.InvoiceDTO;
import com.aaprint.invoice.dto.InvoiceProductDTO;
import com.aaprint.invoice.entity.Invoice;
import com.aaprint.invoice.entity.InvoiceProduct;
import com.aaprint.invoice.repository.InvoiceRepository;
import com.aaprint.order.entity.Order;
import com.aaprint.order.entity.OrderProduct;
import com.aaprint.order.repository.OrderRepository;
import com.aaprint.payment.repository.PaymentRepository;
import com.aaprint.product.service.ProductService;
import com.aaprint.productionunit.service.ProductionUnitService;
import com.aaprint.tenant.service.TenantService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InvoiceService {

    private static final Logger log = LoggerFactory.getLogger(InvoiceService.class);

    private final InvoiceRepository invoiceRepository;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final ProductService productService;
    private final TenantService tenantService;
    private final ProductionUnitService productionUnitService;

    private Long tenantId() {
        Long id = TenantContext.getTenantId();
        if (id == null) throw new TenantContextException();
        return id;
    }

    public Page<InvoiceDTO> getAllInvoices(PageRequest pageRequest) {
        return invoiceRepository.findAllByTenant(tenantId(), pageRequest).map(this::convertToDTO);
    }

    public Page<InvoiceDTO> getFscInvoices(PageRequest pageRequest) {
        return invoiceRepository.findFscInvoicesByTenant(tenantId(), pageRequest).map(this::convertToDTO);
    }

    public Page<InvoiceDTO> getFilteredInvoices(PageRequest pageRequest, boolean fsc, String status, Long customerId, String paymentStatus, String invoiceNumber, String poNumber, java.time.LocalDate fromDate, java.time.LocalDate toDate) {
        return invoiceRepository.findFiltered(tenantId(), fsc, status, customerId, paymentStatus, invoiceNumber, poNumber, fromDate, toDate, pageRequest).map(this::convertToDTO);
    }

    public InvoiceDTO getInvoiceById(Long id) {
        return invoiceRepository.findById(id)
                .filter(i -> i.getTenant().getTenantId().equals(tenantId()) && !i.isDeleted())
                .map(this::convertToDTO).orElse(null);
    }

    /**
     * Build an invoice context from an order — returns all line items with ordered qty,
     * already-invoiced qty, and remaining qty for the UI to use.
     */
    public InvoiceDTO buildInvoiceContext(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .filter(o -> o.getTenant().getTenantId().equals(tenantId()))
                .orElseThrow(() -> new RuntimeException("Order not found"));

        // Calculate already-invoiced quantities per orderProductId
        Map<Long, Integer> invoicedMap = getInvoicedQuantityMap(orderId);

        InvoiceDTO dto = new InvoiceDTO();
        dto.setOrderId(order.getOrderId());
        dto.setPoNumber(order.getPoNumber());
        dto.setCustomerId(order.getCustomer().getCustomerId());
        dto.setCustomerName(order.getCustomer().getCustomerName());
        dto.setBillToAddress(order.getCustomer().getBillingAddress());
        dto.setShipToAddress(order.getShippingAddress());
        // DC fields are entered on the invoice, not copied from order
        dto.setCgst(0.0);
        dto.setSgst(0.0);
        dto.setIgst(0.0);
        dto.setDeliveryCharges(0.0);

        List<InvoiceProductDTO> lines = new ArrayList<>();
        for (OrderProduct op : order.getOrderProducts()) {
            InvoiceProductDTO line = new InvoiceProductDTO();
            line.setOrderProductId(op.getOrderProductId());
            line.setProductId(op.getProduct().getProductId());
            line.setProductName(op.getProduct().getProductName());
            line.setOrderedQuantity(op.getQuantity());
            int alreadyInvoiced = invoicedMap.getOrDefault(op.getOrderProductId(), 0);
            line.setAlreadyInvoicedQty(alreadyInvoiced);
            int remaining = op.getQuantity() - alreadyInvoiced;
            line.setQuantity(Math.max(remaining, 0));
            line.setPrice(op.getPrice());
            line.setSize(op.getSize());
            line.setDescription(op.getDescription());
            line.setHsnCode(op.getProduct().getHsnCode());
            line.setCgst(op.getCgst());
            line.setSgst(op.getSgst());
            line.setIgst(op.getIgst());
            line.setSelected(remaining > 0);
            lines.add(line);
        }
        dto.setInvoiceProductDTOList(lines);
        return dto;
    }

    @Transactional
    public InvoiceDTO saveInvoice(InvoiceDTO invoiceDTO) {
        Invoice invoice;

        if (invoiceDTO.getInvoiceId() != null) {
            invoice = invoiceRepository.findById(invoiceDTO.getInvoiceId())
                    .filter(i -> i.getTenant().getTenantId().equals(tenantId()))
                    .orElseThrow(() -> new RuntimeException("Invoice not found"));
            invoice.getInvoiceProducts().clear();
        } else {
            invoice = new Invoice();
            invoice.setTenant(tenantService.getTenantEntityById(tenantId()));
            invoice.setInvoiceNumber(generateInvoiceNumber());
            invoice.setCreatedAt(LocalDateTime.now());
        }

        Order order = orderRepository.findById(invoiceDTO.getOrderId())
                .filter(o -> o.getTenant().getTenantId().equals(tenantId()))
                .orElseThrow(() -> new RuntimeException("Order not found"));

        invoice.setOrder(order);
        invoice.setCustomer(order.getCustomer());
        invoice.setInvoiceDate(invoiceDTO.getInvoiceDate() != null ? invoiceDTO.getInvoiceDate() : LocalDate.now());
        invoice.setBillToAddress(order.getCustomer().getBillingAddress());
        invoice.setShipToAddress(invoiceDTO.getShipToAddress());
        // Delivery charges and DC-GST rates are entered on the invoice form
        invoice.setCgst(invoiceDTO.getCgst() != null ? invoiceDTO.getCgst() : 0.0);
        invoice.setSgst(invoiceDTO.getSgst() != null ? invoiceDTO.getSgst() : 0.0);
        invoice.setIgst(invoiceDTO.getIgst() != null ? invoiceDTO.getIgst() : 0.0);
        invoice.setDeliveryCharges(invoiceDTO.getDeliveryCharges() != null ? invoiceDTO.getDeliveryCharges() : 0.0);
        invoice.setInvoiceStatus(invoiceDTO.getInvoiceStatus() != null ? invoiceDTO.getInvoiceStatus() : "DRAFT");
        invoice.setRemarks(invoiceDTO.getRemarks());
        invoice.setUpdatedAt(LocalDateTime.now());

        Long puId = invoiceDTO.getProductionUnitId();
        if (puId == null) puId = TenantContext.getProductionUnitId();
        if (puId != null) invoice.setProductionUnit(productionUnitService.getEntityById(puId));

        // Add only selected line items
        double subTotal = 0;
        double lineTaxTotal = 0;
        for (InvoiceProductDTO ipDTO : invoiceDTO.getInvoiceProductDTOList()) {
            if (!ipDTO.isSelected()) continue;

            InvoiceProduct ip = new InvoiceProduct();
            ip.setInvoice(invoice);
            OrderProduct op = findOrderProduct(order, ipDTO.getOrderProductId());
            ip.setOrderProduct(op);
            ip.setProduct(productService.getProductEntityById(ipDTO.getProductId()));
            ip.setQuantity(ipDTO.getQuantity());
            ip.setPrice(ipDTO.getPrice());
            ip.setSize(ipDTO.getSize());
            ip.setDescription(ipDTO.getDescription());
            ip.setHsnCode(ipDTO.getHsnCode());

            // Copy line-level GST from OrderProduct so it is persisted and available for display/PDF
            ip.setCgst(op != null ? op.getCgst() : null);
            ip.setSgst(op != null ? op.getSgst() : null);
            ip.setIgst(op != null ? op.getIgst() : null);

            invoice.getInvoiceProducts().add(ip);

            double lineAmt = (ip.getQuantity() != null ? ip.getQuantity() : 0)
                           * (ip.getPrice()    != null ? ip.getPrice()    : 0);
            subTotal += lineAmt;

            // Line-level GST calculation
            double c = ip.getCgst() != null ? ip.getCgst() : 0;
            double s = ip.getSgst() != null ? ip.getSgst() : 0;
            double i = ip.getIgst() != null ? ip.getIgst() : 0;
            if (c + s + i > 0) {
                lineTaxTotal += lineAmt * (c + s + i) / 100.0;
            }
        }

        double deliveryCharges = invoice.getDeliveryCharges() != null ? invoice.getDeliveryCharges() : 0;
        // Order-level cgst/sgst/igst applies ONLY to delivery charges
        double dcCgst = invoice.getCgst() != null ? invoice.getCgst() : 0;
        double dcSgst = invoice.getSgst() != null ? invoice.getSgst() : 0;
        double dcIgst = invoice.getIgst() != null ? invoice.getIgst() : 0;
        double deliveryTax = deliveryCharges * (dcCgst + dcSgst + dcIgst) / 100.0;

        double grandTotal = subTotal + deliveryCharges + lineTaxTotal + deliveryTax;

        // Round-off handling
        invoice.setRoundOff(invoiceDTO.isRoundOff());
        if (invoiceDTO.isRoundOff()) {
            double rounded = Math.round(grandTotal);
            invoice.setRoundOffAmount(rounded - grandTotal);
            invoice.setInvoiceAmount(rounded);
        } else {
            invoice.setRoundOffAmount(null);
            invoice.setInvoiceAmount(grandTotal);
        }

        // FSC Invoice
        invoice.setFscInvoice(invoiceDTO.isFscInvoice());

        invoice = invoiceRepository.save(invoice);
        log.info("Saved invoice {} for order {}", invoice.getInvoiceNumber(), order.getPoNumber());

        // Update order status based on invoicing progress
        updateOrderInvoiceStatus(order);

        return convertToDTO(invoice);
    }

    @Transactional
    public boolean softDelete(Long id) {
        return invoiceRepository.findById(id)
                .filter(i -> i.getTenant().getTenantId().equals(tenantId()))
                .map(i -> {
                    i.setDeleted(true);
                    invoiceRepository.save(i);
                    updateOrderInvoiceStatus(i.getOrder());
                    return true;
                })
                .orElse(false);
    }

    // ── Helpers ──

    /**
     * Check if all order lines are fully invoiced and update order status.
     */
    private void updateOrderInvoiceStatus(Order order) {
        Map<Long, Integer> invoicedMap = getInvoicedQuantityMap(order.getOrderId());
        boolean allFullyInvoiced = true;
        boolean anyInvoiced = false;

        for (OrderProduct op : order.getOrderProducts()) {
            int invoiced = invoicedMap.getOrDefault(op.getOrderProductId(), 0);
            if (invoiced > 0) anyInvoiced = true;
            if (invoiced < op.getQuantity()) allFullyInvoiced = false;
        }

        if (allFullyInvoiced && !order.getOrderProducts().isEmpty()) {
            order.setOrderStatus("COMPLETED");
        } else if (anyInvoiced) {
            order.setOrderStatus("PARTIALLY_INVOICED");
        } else {
            order.setOrderStatus("PENDING");
        }
        orderRepository.save(order);
    }

    /**
     * Returns true if every line in the order has been fully invoiced.
     */
    public boolean isOrderFullyInvoiced(Long orderId) {
        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null || order.getOrderProducts().isEmpty()) return false;

        Map<Long, Integer> invoicedMap = getInvoicedQuantityMap(orderId);
        for (OrderProduct op : order.getOrderProducts()) {
            int invoiced = invoicedMap.getOrDefault(op.getOrderProductId(), 0);
            if (invoiced < op.getQuantity()) return false;
        }
        return true;
    }

    private String generateInvoiceNumber() {
        String prefix = "INV-" + LocalDate.now().getYear() + "-";
        int seq = invoiceRepository.findMaxInvoiceSeq(tenantId(), prefix) + 1;
        return prefix + String.format("%04d", seq);
    }

    private Map<Long, Integer> getInvoicedQuantityMap(Long orderId) {
        Map<Long, Integer> map = new HashMap<>();
        List<Invoice> invoices = invoiceRepository.findByOrderId(orderId);
        for (Invoice inv : invoices) {
            if (inv.isDeleted()) continue;
            for (InvoiceProduct ip : inv.getInvoiceProducts()) {
                if (ip.getOrderProduct() == null) continue; // migrated data may lack link
                Long opId = ip.getOrderProduct().getOrderProductId();
                map.merge(opId, ip.getQuantity() != null ? ip.getQuantity() : 0, Integer::sum);
            }
        }
        return map;
    }

    private OrderProduct findOrderProduct(Order order, Long orderProductId) {
        return order.getOrderProducts().stream()
                .filter(op -> op.getOrderProductId().equals(orderProductId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Order product not found: " + orderProductId));
    }

    private InvoiceDTO convertToDTO(Invoice invoice) {
        InvoiceDTO dto = new InvoiceDTO();
        dto.setInvoiceId(invoice.getInvoiceId());
        dto.setInvoiceNumber(invoice.getInvoiceNumber());
        dto.setInvoiceDate(invoice.getInvoiceDate());
        if (invoice.getOrder() != null) {
            dto.setOrderId(invoice.getOrder().getOrderId());
            dto.setPoNumber(invoice.getOrder().getPoNumber());
        }
        if (invoice.getCustomer() != null) {
            dto.setCustomerId(invoice.getCustomer().getCustomerId());
            dto.setCustomerName(invoice.getCustomer().getCustomerName());
        }
        if (invoice.getProductionUnit() != null) {
            dto.setProductionUnitId(invoice.getProductionUnit().getProductionUnitId());
            dto.setProductionUnitName(invoice.getProductionUnit().getUnitName());
            // Build production unit address
            var pu = invoice.getProductionUnit();
            String puAddr = Stream.of(pu.getAddress(), pu.getCity(), pu.getState())
                    .filter(s -> s != null && !s.isBlank())
                    .collect(Collectors.joining(", "));
            dto.setProductionUnitAddress(puAddr);
        }

        // Tenant info for invoice PDF
        var tenant = invoice.getTenant();
        dto.setTenantName(tenant.getTenantName());
        dto.setTenantPhone(tenant.getPhone());
        dto.setTenantGstNumber(tenant.getGstNumber());
        dto.setTenantLogoUrl(tenant.getLogoUrl());
        dto.setTenantBankName(tenant.getBankName());
        dto.setTenantBankAccountName(tenant.getBankAccountName());
        dto.setTenantBankAccountNumber(tenant.getBankAccountNumber());
        dto.setTenantBankIfsc(tenant.getBankIfsc());
        dto.setTenantFscNumber(tenant.getFscLicenseNumber());
        dto.setTenantRegisteredAddress(tenant.getRegisteredAddress());
        dto.setBillToAddress(invoice.getBillToAddress());
        dto.setShipToAddress(invoice.getShipToAddress());
        dto.setCgst(invoice.getCgst());
        dto.setSgst(invoice.getSgst());
        dto.setIgst(invoice.getIgst());
        dto.setDeliveryCharges(invoice.getDeliveryCharges());
        dto.setInvoiceAmount(invoice.getInvoiceAmount());
        dto.setRoundOff(invoice.isRoundOff());
        dto.setRoundOffAmount(invoice.getRoundOffAmount());
        dto.setFscInvoice(invoice.isFscInvoice());
        dto.setInvoiceStatus(invoice.getInvoiceStatus());
        dto.setPaymentStatus(invoice.getPaymentStatus() != null ? invoice.getPaymentStatus() : "UNPAID");

        // Payment info
        double paid = paymentRepository.sumAmountByInvoiceId(invoice.getInvoiceId());
        double invAmt = invoice.getInvoiceAmount() != null ? invoice.getInvoiceAmount() : 0;
        dto.setPaidAmount(paid);
        dto.setBalanceAmount(invAmt - paid);

        dto.setRemarks(invoice.getRemarks());

        // Build line items with invoiced context
        Map<Long, Integer> invoicedMap = invoice.getOrder() != null
                ? getInvoicedQuantityMap(invoice.getOrder().getOrderId())
                : new HashMap<>();
        List<InvoiceProductDTO> lines = new ArrayList<>();
        for (InvoiceProduct ip : invoice.getInvoiceProducts()) {
            InvoiceProductDTO line = new InvoiceProductDTO();
            line.setInvoiceProductId(ip.getInvoiceProductId());
            if (ip.getOrderProduct() != null) {
                line.setOrderProductId(ip.getOrderProduct().getOrderProductId());
                line.setOrderedQuantity(ip.getOrderProduct().getQuantity());
                line.setAlreadyInvoicedQty(invoicedMap.getOrDefault(ip.getOrderProduct().getOrderProductId(), 0));
            } else {
                line.setOrderProductId(null);
                line.setOrderedQuantity(ip.getQuantity()); // fallback: use invoice qty as ordered qty
                line.setAlreadyInvoicedQty(ip.getQuantity() != null ? ip.getQuantity() : 0);
            }
            line.setProductId(ip.getProduct() != null ? ip.getProduct().getProductId() : null);
            line.setProductName(ip.getProduct() != null ? ip.getProduct().getProductName() : ip.getDescription());
            line.setQuantity(ip.getQuantity());
            line.setPrice(ip.getPrice());
            line.setSize(ip.getSize());
            line.setDescription(ip.getDescription());
            line.setHsnCode(ip.getHsnCode());
            // Read persisted line-level GST from InvoiceProduct
            line.setCgst(ip.getCgst());
            line.setSgst(ip.getSgst());
            line.setIgst(ip.getIgst());
            line.setSelected(true);
            lines.add(line);
        }
        dto.setInvoiceProductDTOList(lines);
        return dto;
    }
}

