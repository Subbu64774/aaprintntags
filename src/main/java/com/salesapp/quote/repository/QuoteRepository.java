package com.salesapp.quote.repository;

import com.salesapp.quote.entity.Quote;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface QuoteRepository extends JpaRepository<Quote, Long> {

    @Query("SELECT q FROM Quote q WHERE q.deleted = false AND q.tenant.tenantId = :tenantId ORDER BY q.quoteId DESC")
    Page<Quote> findAllByTenant(@Param("tenantId") Long tenantId, Pageable pageable);

    @Query("SELECT q FROM Quote q WHERE q.deleted = false AND q.tenant.tenantId = :tenantId " +
           "AND (:quoteNumber IS NULL OR LOWER(q.quoteNumber) LIKE LOWER(CONCAT('%', :quoteNumber, '%'))) " +
           "AND (:customerName IS NULL OR LOWER(COALESCE(q.adhocCustomerName, '')) LIKE LOWER(CONCAT('%', :customerName, '%')) " +
           "     OR (q.customer IS NOT NULL AND LOWER(q.customer.customerName) LIKE LOWER(CONCAT('%', :customerName, '%')))) " +
           "ORDER BY q.quoteId DESC")
    Page<Quote> findFiltered(@Param("tenantId") Long tenantId,
                             @Param("quoteNumber") String quoteNumber,
                             @Param("customerName") String customerName,
                             Pageable pageable);

    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(q.quoteNumber, LENGTH(:prefix) + 1) AS int)), 0) " +
           "FROM Quote q WHERE q.tenant.tenantId = :tenantId AND q.quoteNumber LIKE CONCAT(:prefix, '%')")
    int findMaxQuoteSeq(@Param("tenantId") Long tenantId, @Param("prefix") String prefix);
}

