package com.aaprint.quote.controller;

import com.aaprint.quote.dto.QuoteDTO;
import com.aaprint.quote.service.QuoteService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/quotes")
public class QuoteRestController {

    private static final Logger log = LoggerFactory.getLogger(QuoteRestController.class);
    private final QuoteService quoteService;

    @GetMapping
    public ResponseEntity<Page<QuoteDTO>> listQuotes(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String quoteNumber,
            @RequestParam(required = false) String customerName) {

        boolean hasFilter = (quoteNumber != null && !quoteNumber.isBlank())
                         || (customerName != null && !customerName.isBlank());
        if (hasFilter) {
            return ResponseEntity.ok(quoteService.getFilteredQuotes(PageRequest.of(page, size), quoteNumber, customerName));
        }
        return ResponseEntity.ok(quoteService.getAllQuotes(PageRequest.of(page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<QuoteDTO> getQuote(@PathVariable Long id) {
        QuoteDTO dto = quoteService.getQuoteById(id);
        return dto != null ? ResponseEntity.ok(dto) : ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<QuoteDTO> createQuote(@RequestBody QuoteDTO dto) {
        log.info("Creating quote for customer: {}", dto.getCustomerName() != null ? dto.getCustomerName() : dto.getAdhocCustomerName());
        QuoteDTO saved = quoteService.saveQuote(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<QuoteDTO> updateQuote(@PathVariable Long id, @RequestBody QuoteDTO dto) {
        log.info("Updating quote {}", id);
        dto.setQuoteId(id);
        QuoteDTO updated = quoteService.saveQuote(dto);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteQuote(@PathVariable Long id) {
        log.info("Deleting quote {}", id);
        return quoteService.softDelete(id) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}

