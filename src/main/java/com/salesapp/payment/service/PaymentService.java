package com.salesapp.payment.service;

import com.salesapp.config.TenantContext;
import com.salesapp.config.TenantContextException;
import com.salesapp.invoice.entity.Invoice;
import com.salesapp.invoice.repository.InvoiceRepository;
import com.salesapp.payment.dto.PaymentDTO;
import com.salesapp.payment.entity.Payment;
import com.salesapp.payment.repository.PaymentRepository;
import com.salesapp.tenant.service.TenantService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;
    private final TenantService tenantService;

    private Long tenantId() {
        Long id = TenantContext.getTenantId();
        if (id == null) throw new TenantContextException();
        return id;
    }

    // ── List ──

    public Page<PaymentDTO> getAllPayments(PageRequest pageRequest) {
        return paymentRepository.findAllByTenant(tenantId(), pageRequest).map(this::convertToDTO);
    }

    public PaymentDTO getPaymentById(Long id) {
        return paymentRepository.findById(id)
                .filter(p -> p.getTenant().getTenantId().equals(tenantId()) && !p.isDeleted())
                .map(this::convertToDTO).orElse(null);
    }

    public List<PaymentDTO> getPaymentsByInvoice(Long invoiceId) {
        return paymentRepository.findByInvoiceId(invoiceId).stream()
                .map(this::convertToDTO).collect(Collectors.toList());
    }

    public Page<PaymentDTO> getPaymentsByCustomer(Long customerId, PageRequest pageRequest) {
        return paymentRepository.findByCustomerId(customerId, tenantId(), pageRequest).map(this::convertToDTO);
    }

    public double getInvoiceBalance(Long invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId).orElse(null);
        if (invoice == null) return 0;
        double paid = paymentRepository.sumAmountByInvoiceId(invoiceId);
        return (invoice.getInvoiceAmount() != null ? invoice.getInvoiceAmount() : 0) - paid;
    }

    // ── Register Payment ──

    @Transactional
    public PaymentDTO registerPayment(PaymentDTO dto) {
        Invoice invoice = invoiceRepository.findById(dto.getInvoiceId())
                .filter(i -> i.getTenant().getTenantId().equals(tenantId()) && !i.isDeleted())
                .orElseThrow(() -> new RuntimeException("Invoice not found"));

        // Validations
        if ("CANCELLED".equals(invoice.getInvoiceStatus())) {
            throw new RuntimeException("Cannot record payment against a cancelled invoice");
        }
        if ("DRAFT".equals(invoice.getInvoiceStatus())) {
            throw new RuntimeException("Cannot record payment against a draft invoice. Finalize first.");
        }
        if (dto.getAmount() == null || dto.getAmount() <= 0) {
            throw new RuntimeException("Payment amount must be greater than zero");
        }

        double invoiceAmt = invoice.getInvoiceAmount() != null ? invoice.getInvoiceAmount() : 0;
        double alreadyPaid = paymentRepository.sumAmountByInvoiceId(invoice.getInvoiceId());
        double balance = invoiceAmt - alreadyPaid;

        if (dto.getAmount() > balance + 0.01) { // small tolerance for floating point
            throw new RuntimeException("Payment amount (Rs." + String.format("%.2f", dto.getAmount())
                    + ") exceeds remaining balance (Rs." + String.format("%.2f", balance) + ")");
        }

        Payment payment = new Payment();
        payment.setPaymentNumber(generatePaymentNumber());
        payment.setPaymentDate(dto.getPaymentDate() != null ? dto.getPaymentDate() : LocalDate.now());
        payment.setAmount(dto.getAmount());
        payment.setPaymentMode(dto.getPaymentMode());
        payment.setReferenceNumber(dto.getReferenceNumber());
        payment.setRemarks(dto.getRemarks());
        payment.setInvoice(invoice);
        payment.setCustomer(invoice.getCustomer());
        payment.setTenant(invoice.getTenant());
        payment.setCreatedAt(LocalDateTime.now());

        payment = paymentRepository.save(payment);
        log.info("Payment {} of Rs.{} recorded for invoice {}", payment.getPaymentNumber(), payment.getAmount(), invoice.getInvoiceNumber());

        updateInvoicePaymentStatus(invoice);

        return convertToDTO(payment);
    }

    // ── Soft Delete ──

    @Transactional
    public boolean softDelete(Long id) {
        return paymentRepository.findById(id)
                .filter(p -> p.getTenant().getTenantId().equals(tenantId()) && !p.isDeleted())
                .map(p -> {
                    p.setDeleted(true);
                    paymentRepository.save(p);
                    updateInvoicePaymentStatus(p.getInvoice());
                    log.info("Payment {} deleted, recalculated invoice {} status", p.getPaymentNumber(), p.getInvoice().getInvoiceNumber());
                    return true;
                })
                .orElse(false);
    }

    // ── Helpers ──

    @Transactional
    public void updateInvoicePaymentStatus(Invoice invoice) {
        double invoiceAmt = invoice.getInvoiceAmount() != null ? invoice.getInvoiceAmount() : 0;
        double paid = paymentRepository.sumAmountByInvoiceId(invoice.getInvoiceId());

        if (paid >= invoiceAmt - 0.01 && invoiceAmt > 0) {
            invoice.setPaymentStatus("PAID");
        } else if (paid > 0) {
            invoice.setPaymentStatus("PARTIALLY_PAID");
        } else {
            invoice.setPaymentStatus("UNPAID");
        }
        invoiceRepository.save(invoice);
    }

    private String generatePaymentNumber() {
        String prefix = "PAY-" + LocalDate.now().getYear() + "-";
        int seq = paymentRepository.findMaxPaymentSeq(tenantId(), prefix) + 1;
        return prefix + String.format("%04d", seq);
    }

    private PaymentDTO convertToDTO(Payment payment) {
        PaymentDTO dto = new PaymentDTO();
        dto.setPaymentId(payment.getPaymentId());
        dto.setPaymentNumber(payment.getPaymentNumber());
        dto.setPaymentDate(payment.getPaymentDate());
        dto.setAmount(payment.getAmount());
        dto.setPaymentMode(payment.getPaymentMode());
        dto.setReferenceNumber(payment.getReferenceNumber());
        dto.setRemarks(payment.getRemarks());

        dto.setInvoiceId(payment.getInvoice().getInvoiceId());
        dto.setInvoiceNumber(payment.getInvoice().getInvoiceNumber());
        dto.setInvoiceAmount(payment.getInvoice().getInvoiceAmount());

        dto.setCustomerId(payment.getCustomer().getCustomerId());
        dto.setCustomerName(payment.getCustomer().getCustomerName());

        double paid = paymentRepository.sumAmountByInvoiceId(payment.getInvoice().getInvoiceId());
        double invAmt = payment.getInvoice().getInvoiceAmount() != null ? payment.getInvoice().getInvoiceAmount() : 0;
        dto.setPaidAmount(paid);
        dto.setBalanceAmount(invAmt - paid);

        return dto;
    }
}

