package com.aaprint.payment.controller;

import com.aaprint.payment.dto.PaymentDTO;
import com.aaprint.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/payments")
public class PaymentRestController {

    private static final Logger log = LoggerFactory.getLogger(PaymentRestController.class);
    private final PaymentService paymentService;

    @GetMapping
    public ResponseEntity<Page<PaymentDTO>> listPayments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(paymentService.getAllPayments(PageRequest.of(page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PaymentDTO> getPayment(@PathVariable Long id) {
        PaymentDTO dto = paymentService.getPaymentById(id);
        return dto != null ? ResponseEntity.ok(dto) : ResponseEntity.notFound().build();
    }

    @GetMapping("/invoice/{invoiceId}")
    public ResponseEntity<List<PaymentDTO>> getPaymentsByInvoice(@PathVariable Long invoiceId) {
        return ResponseEntity.ok(paymentService.getPaymentsByInvoice(invoiceId));
    }

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<Page<PaymentDTO>> getPaymentsByCustomer(
            @PathVariable Long customerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(paymentService.getPaymentsByCustomer(customerId, PageRequest.of(page, size)));
    }

    @GetMapping("/invoice/{invoiceId}/balance")
    public ResponseEntity<Map<String, Double>> getInvoiceBalance(@PathVariable Long invoiceId) {
        return ResponseEntity.ok(Map.of("balance", paymentService.getInvoiceBalance(invoiceId)));
    }

    @PostMapping
    public ResponseEntity<?> registerPayment(@RequestBody PaymentDTO dto) {
        try {
            log.info("Recording payment for invoice {}", dto.getInvoiceId());
            PaymentDTO saved = paymentService.registerPayment(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (RuntimeException e) {
            log.error("Payment error: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePayment(@PathVariable Long id) {
        log.info("Deleting payment {}", id);
        return paymentService.softDelete(id) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}

