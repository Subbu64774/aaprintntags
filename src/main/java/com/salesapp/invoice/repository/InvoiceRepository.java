package com.salesapp.invoice.repository;

import com.salesapp.invoice.entity.Invoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    @Query("SELECT i FROM Invoice i WHERE i.deleted = false AND i.tenant.tenantId = :tenantId ORDER BY i.invoiceId DESC")
    Page<Invoice> findAllByTenant(@Param("tenantId") Long tenantId, Pageable pageable);

    @Query("SELECT i FROM Invoice i WHERE i.deleted = false AND i.order.orderId = :orderId")
    List<Invoice> findByOrderId(@Param("orderId") Long orderId);

    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(i.invoiceNumber, LENGTH(:prefix) + 1) AS int)), 0) " +
           "FROM Invoice i WHERE i.tenant.tenantId = :tenantId AND i.invoiceNumber LIKE CONCAT(:prefix, '%')")
    int findMaxInvoiceSeq(@Param("tenantId") Long tenantId, @Param("prefix") String prefix);

    long countByTenant_TenantIdAndDeletedFalse(Long tenantId);

    // FSC filter
    @Query("SELECT i FROM Invoice i WHERE i.deleted = false AND i.tenant.tenantId = :tenantId AND i.fscInvoice = true ORDER BY i.invoiceId DESC")
    Page<Invoice> findFscInvoicesByTenant(@Param("tenantId") Long tenantId, Pageable pageable);

    // Filtered query with optional params
    @Query("SELECT i FROM Invoice i WHERE i.deleted = false AND i.tenant.tenantId = :tenantId " +
           "AND (:fsc = false OR i.fscInvoice = true) " +
           "AND (:status IS NULL OR i.invoiceStatus = :status) " +
           "AND (:customerId IS NULL OR i.customer.customerId = :customerId) " +
           "AND (:paymentStatus IS NULL OR i.paymentStatus = :paymentStatus) " +
           "AND (:invoiceNumber IS NULL OR LOWER(i.invoiceNumber) LIKE LOWER(CONCAT('%', :invoiceNumber, '%'))) " +
           "AND (:poNumber IS NULL OR LOWER(i.order.poNumber) LIKE LOWER(CONCAT('%', :poNumber, '%'))) " +
           "AND (CAST(:fromDate AS date) IS NULL OR i.invoiceDate >= :fromDate) " +
           "AND (CAST(:toDate AS date) IS NULL OR i.invoiceDate <= :toDate) " +
           "ORDER BY i.invoiceId DESC")
    Page<Invoice> findFiltered(@Param("tenantId") Long tenantId,
                               @Param("fsc") boolean fsc,
                               @Param("status") String status,
                               @Param("customerId") Long customerId,
                               @Param("paymentStatus") String paymentStatus,
                               @Param("invoiceNumber") String invoiceNumber,
                               @Param("poNumber") String poNumber,
                               @Param("fromDate") LocalDate fromDate,
                               @Param("toDate") LocalDate toDate,
                               Pageable pageable);

    // ── Report queries ──

    @Query("SELECT i FROM Invoice i WHERE i.deleted = false AND i.tenant.tenantId = :tenantId " +
           "AND i.invoiceDate >= :from AND i.invoiceDate <= :to ORDER BY i.invoiceDate DESC")
    List<Invoice> findByTenantAndDateRange(@Param("tenantId") Long tenantId,
                                            @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT i FROM Invoice i WHERE i.deleted = false AND i.tenant.tenantId = :tenantId " +
           "AND i.customer.customerId = :customerId AND i.invoiceDate >= :from AND i.invoiceDate <= :to " +
           "ORDER BY i.invoiceDate DESC")
    List<Invoice> findByTenantAndCustomerAndDateRange(@Param("tenantId") Long tenantId,
                                                      @Param("customerId") Long customerId,
                                                      @Param("from") LocalDate from, @Param("to") LocalDate to);
}

