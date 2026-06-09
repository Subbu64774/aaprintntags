package com.salesapp.invoice.controller;

import com.salesapp.invoice.dto.InvoiceDTO;
import com.salesapp.invoice.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/invoices")
public class InvoiceRestController {

    private static final Logger log = LoggerFactory.getLogger(InvoiceRestController.class);
    private final InvoiceService invoiceService;

    @GetMapping
    public ResponseEntity<Page<InvoiceDTO>> listInvoices(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Boolean fsc,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long customerId,
            @RequestParam(required = false) String paymentStatus,
            @RequestParam(required = false) String invoiceNumber,
            @RequestParam(required = false) String poNumber,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        boolean hasFsc = Boolean.TRUE.equals(fsc);
        if (status != null || customerId != null || paymentStatus != null || invoiceNumber != null || poNumber != null || fromDate != null || toDate != null || hasFsc) {
            return ResponseEntity.ok(invoiceService.getFilteredInvoices(PageRequest.of(page, size), hasFsc, status, customerId, paymentStatus, invoiceNumber, poNumber, fromDate, toDate));
        }
        return ResponseEntity.ok(invoiceService.getAllInvoices(PageRequest.of(page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InvoiceDTO> getInvoice(@PathVariable Long id) {
        InvoiceDTO dto = invoiceService.getInvoiceById(id);
        return dto != null ? ResponseEntity.ok(dto) : ResponseEntity.notFound().build();
    }

    /**
     * Get invoice context from an order — used by the form to pre-populate line items
     */
    @GetMapping("/context/order/{orderId}")
    public ResponseEntity<InvoiceDTO> getInvoiceContext(@PathVariable Long orderId) {
        return ResponseEntity.ok(invoiceService.buildInvoiceContext(orderId));
    }

    @PostMapping
    public ResponseEntity<InvoiceDTO> createInvoice(@RequestBody InvoiceDTO dto) {
        log.info("Creating invoice for order {}", dto.getOrderId());
        InvoiceDTO saved = invoiceService.saveInvoice(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<InvoiceDTO> updateInvoice(@PathVariable Long id, @RequestBody InvoiceDTO dto) {
        log.info("Updating invoice {}", id);
        dto.setInvoiceId(id);
        InvoiceDTO updated = invoiceService.saveInvoice(dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInvoice(@PathVariable Long id) {
        log.info("Deleting invoice {}", id);
        return invoiceService.softDelete(id) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}
