package com.salesapp.quote.service;

import com.salesapp.config.TenantContext;
import com.salesapp.config.TenantContextException;
import com.salesapp.customer.entity.Customer;
import com.salesapp.customer.repository.CustomerRepository;
import com.salesapp.quote.dto.QuoteDTO;
import com.salesapp.quote.dto.QuoteItemDTO;
import com.salesapp.quote.entity.Quote;
import com.salesapp.quote.entity.QuoteItem;
import com.salesapp.quote.repository.QuoteRepository;
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
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QuoteService {

    private static final Logger log = LoggerFactory.getLogger(QuoteService.class);

    private final QuoteRepository quoteRepository;
    private final CustomerRepository customerRepository;
    private final TenantService tenantService;

    private Long tenantId() {
        Long id = TenantContext.getTenantId();
        if (id == null) throw new TenantContextException();
        return id;
    }

    public Page<QuoteDTO> getAllQuotes(PageRequest pageRequest) {
        return quoteRepository.findAllByTenant(tenantId(), pageRequest).map(this::toDTO);
    }

    public Page<QuoteDTO> getFilteredQuotes(PageRequest pageRequest, String quoteNumber, String customerName) {
        String qn = (quoteNumber != null && !quoteNumber.isBlank()) ? quoteNumber.trim() : null;
        String cn = (customerName != null && !customerName.isBlank()) ? customerName.trim() : null;
        return quoteRepository.findFiltered(tenantId(), qn, cn, pageRequest).map(this::toDTO);
    }

    public QuoteDTO getQuoteById(Long id) {
        return quoteRepository.findById(id)
                .filter(q -> q.getTenant().getTenantId().equals(tenantId()) && !q.isDeleted())
                .map(this::toDTO)
                .orElse(null);
    }

    @Transactional
    public QuoteDTO saveQuote(QuoteDTO dto) {
        Quote quote;
        Long tid = tenantId();

        if (dto.getQuoteId() != null) {
            quote = quoteRepository.findById(dto.getQuoteId())
                    .filter(q -> q.getTenant().getTenantId().equals(tid))
                    .orElseThrow(() -> new RuntimeException("Quote not found"));
            quote.getQuoteItems().clear();
            quote.setUpdatedAt(LocalDateTime.now());
        } else {
            quote = new Quote();
            quote.setTenant(tenantService.getTenantEntityById(tid));
            quote.setQuoteNumber(generateQuoteNumber(tid));
            quote.setCreatedAt(LocalDateTime.now());
        }

        quote.setQuoteDate(dto.getQuoteDate() != null ? dto.getQuoteDate() : LocalDate.now());
        quote.setValidityDays(dto.getValidityDays());
        quote.setIncludeGst(dto.isIncludeGst());
        quote.setStatus(dto.getStatus() != null ? dto.getStatus() : "DRAFT");
        quote.setRemarks(dto.getRemarks());

        // Customer assignment
        if (dto.getCustomerId() != null) {
            Customer customer = customerRepository.findById(dto.getCustomerId())
                    .filter(c -> c.getTenant().getTenantId().equals(tid) && !c.isDeleted())
                    .orElse(null);
            quote.setCustomer(customer);
            // Clear adhoc fields
            quote.setAdhocCustomerName(null);
            quote.setAdhocCustomerEmail(null);
            quote.setAdhocCustomerPhone(null);
            quote.setAdhocCustomerGst(null);
        } else {
            quote.setCustomer(null);
            quote.setAdhocCustomerName(dto.getAdhocCustomerName());
            quote.setAdhocCustomerEmail(dto.getAdhocCustomerEmail());
            quote.setAdhocCustomerPhone(dto.getAdhocCustomerPhone());
            quote.setAdhocCustomerGst(dto.getAdhocCustomerGst());
        }

        // Build line items & compute totals
        double subTotal = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0;

        List<QuoteItemDTO> items = dto.getQuoteItems() != null ? dto.getQuoteItems() : new ArrayList<>();
        for (QuoteItemDTO itemDTO : items) {
            if (itemDTO.getProductName() == null || itemDTO.getProductName().isBlank()) continue;

            QuoteItem item = new QuoteItem();
            item.setQuote(quote);
            item.setProductName(itemDTO.getProductName().trim());
            item.setDescription(itemDTO.getDescription());
            item.setQuantity(itemDTO.getQuantity() != null ? itemDTO.getQuantity() : 0);
            item.setPrice(itemDTO.getPrice() != null ? itemDTO.getPrice() : 0.0);

            double tp = item.getQuantity() * item.getPrice();
            item.setTotalPrice(tp);
            subTotal += tp;

            if (dto.isIncludeGst()) {
                double cgstRate = itemDTO.getCgst() != null ? itemDTO.getCgst() : 0;
                double sgstRate = itemDTO.getSgst() != null ? itemDTO.getSgst() : 0;
                double igstRate = itemDTO.getIgst() != null ? itemDTO.getIgst() : 0;
                double ca = tp * cgstRate / 100;
                double sa = tp * sgstRate / 100;
                double ia = tp * igstRate / 100;
                item.setCgst(cgstRate);
                item.setSgst(sgstRate);
                item.setIgst(igstRate);
                item.setCgstAmount(ca);
                item.setSgstAmount(sa);
                item.setIgstAmount(ia);
                item.setLineTotal(tp + ca + sa + ia);
                totalCgst += ca;
                totalSgst += sa;
                totalIgst += ia;
            } else {
                item.setCgst(0.0);
                item.setSgst(0.0);
                item.setIgst(0.0);
                item.setCgstAmount(0.0);
                item.setSgstAmount(0.0);
                item.setIgstAmount(0.0);
                item.setLineTotal(tp);
            }

            quote.getQuoteItems().add(item);
        }

        quote.setSubTotal(subTotal);
        quote.setTotalCgst(totalCgst);
        quote.setTotalSgst(totalSgst);
        quote.setTotalIgst(totalIgst);
        quote.setGrandTotal(subTotal + totalCgst + totalSgst + totalIgst);

        quote = quoteRepository.save(quote);
        log.info("Saved quote {}", quote.getQuoteNumber());
        return toDTO(quote);
    }

    @Transactional
    public boolean softDelete(Long id) {
        return quoteRepository.findById(id)
                .filter(q -> q.getTenant().getTenantId().equals(tenantId()))
                .map(q -> {
                    q.setDeleted(true);
                    quoteRepository.save(q);
                    return true;
                })
                .orElse(false);
    }

    // ── Helpers ──

    private String generateQuoteNumber(Long tid) {
        String prefix = "QUO-" + LocalDate.now().getYear() + "-";
        int seq = quoteRepository.findMaxQuoteSeq(tid, prefix) + 1;
        return prefix + String.format("%04d", seq);
    }

    private QuoteDTO toDTO(Quote quote) {
        QuoteDTO dto = new QuoteDTO();
        dto.setQuoteId(quote.getQuoteId());
        dto.setQuoteNumber(quote.getQuoteNumber());
        dto.setQuoteDate(quote.getQuoteDate());
        dto.setValidityDays(quote.getValidityDays());
        if (quote.getQuoteDate() != null && quote.getValidityDays() != null) {
            dto.setValidUntil(quote.getQuoteDate().plusDays(quote.getValidityDays()));
        }

        // Customer info
        if (quote.getCustomer() != null) {
            dto.setCustomerId(quote.getCustomer().getCustomerId());
            dto.setCustomerName(quote.getCustomer().getCustomerName());
            dto.setCustomerEmail(quote.getCustomer().getEmail());
            dto.setCustomerPhone(quote.getCustomer().getPhone());
            dto.setCustomerGst(quote.getCustomer().getGstNumber());
        } else {
            dto.setAdhocCustomerName(quote.getAdhocCustomerName());
            dto.setAdhocCustomerEmail(quote.getAdhocCustomerEmail());
            dto.setAdhocCustomerPhone(quote.getAdhocCustomerPhone());
            dto.setAdhocCustomerGst(quote.getAdhocCustomerGst());
        }

        // Tenant info for PDF
        var tenant = quote.getTenant();
        dto.setTenantName(tenant.getTenantName());
        dto.setTenantPhone(tenant.getPhone());
        dto.setTenantEmail(tenant.getContactEmail());
        dto.setTenantGstNumber(tenant.getGstNumber());
        dto.setTenantLogoUrl(tenant.getLogoUrl());
        dto.setTenantRegisteredAddress(tenant.getRegisteredAddress());
        dto.setTenantBankName(tenant.getBankName());
        dto.setTenantBankAccountName(tenant.getBankAccountName());
        dto.setTenantBankAccountNumber(tenant.getBankAccountNumber());
        dto.setTenantBankIfsc(tenant.getBankIfsc());

        dto.setIncludeGst(quote.isIncludeGst());
        dto.setSubTotal(quote.getSubTotal());
        dto.setTotalCgst(quote.getTotalCgst());
        dto.setTotalSgst(quote.getTotalSgst());
        dto.setTotalIgst(quote.getTotalIgst());
        dto.setGrandTotal(quote.getGrandTotal());
        dto.setStatus(quote.getStatus());
        dto.setRemarks(quote.getRemarks());

        // Line items
        List<QuoteItemDTO> items = new ArrayList<>();
        for (QuoteItem qi : quote.getQuoteItems()) {
            QuoteItemDTO i = new QuoteItemDTO();
            i.setQuoteItemId(qi.getQuoteItemId());
            i.setProductName(qi.getProductName());
            i.setDescription(qi.getDescription());
            i.setQuantity(qi.getQuantity());
            i.setPrice(qi.getPrice());
            i.setTotalPrice(qi.getTotalPrice());
            i.setCgst(qi.getCgst());
            i.setSgst(qi.getSgst());
            i.setIgst(qi.getIgst());
            i.setCgstAmount(qi.getCgstAmount());
            i.setSgstAmount(qi.getSgstAmount());
            i.setIgstAmount(qi.getIgstAmount());
            i.setLineTotal(qi.getLineTotal());
            items.add(i);
        }
        dto.setQuoteItems(items);
        return dto;
    }
}

