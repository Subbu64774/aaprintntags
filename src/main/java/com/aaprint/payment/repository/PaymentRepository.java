package com.aaprint.payment.repository;

import com.aaprint.payment.entity.Payment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    @Query("SELECT p FROM Payment p WHERE p.deleted = false AND p.tenant.tenantId = :tenantId ORDER BY p.paymentId DESC")
    Page<Payment> findAllByTenant(@Param("tenantId") Long tenantId, Pageable pageable);

    @Query("SELECT p FROM Payment p WHERE p.deleted = false AND p.invoice.invoiceId = :invoiceId ORDER BY p.paymentDate DESC")
    List<Payment> findByInvoiceId(@Param("invoiceId") Long invoiceId);

    @Query("SELECT p FROM Payment p WHERE p.deleted = false AND p.customer.customerId = :customerId AND p.tenant.tenantId = :tenantId ORDER BY p.paymentDate DESC")
    Page<Payment> findByCustomerId(@Param("customerId") Long customerId, @Param("tenantId") Long tenantId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.deleted = false AND p.invoice.invoiceId = :invoiceId")
    double sumAmountByInvoiceId(@Param("invoiceId") Long invoiceId);

    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(p.paymentNumber, LENGTH(:prefix) + 1) AS int)), 0) " +
           "FROM Payment p WHERE p.tenant.tenantId = :tenantId AND p.paymentNumber LIKE CONCAT(:prefix, '%')")
    int findMaxPaymentSeq(@Param("tenantId") Long tenantId, @Param("prefix") String prefix);

    @Query("SELECT COUNT(p) FROM Payment p WHERE p.deleted = false AND p.tenant.tenantId = :tenantId")
    long countByTenantActive(@Param("tenantId") Long tenantId);

    // ── Report queries ──

    @Query("SELECT p FROM Payment p WHERE p.deleted = false AND p.tenant.tenantId = :tenantId " +
           "AND p.paymentDate >= :from AND p.paymentDate <= :to ORDER BY p.paymentDate DESC")
    List<Payment> findByTenantAndDateRange(@Param("tenantId") Long tenantId,
                                           @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT p FROM Payment p WHERE p.deleted = false AND p.tenant.tenantId = :tenantId " +
           "AND p.customer.customerId = :customerId AND p.paymentDate >= :from AND p.paymentDate <= :to " +
           "ORDER BY p.paymentDate DESC")
    List<Payment> findByTenantAndCustomerAndDateRange(@Param("tenantId") Long tenantId,
                                                      @Param("customerId") Long customerId,
                                                      @Param("from") LocalDate from, @Param("to") LocalDate to);
}

