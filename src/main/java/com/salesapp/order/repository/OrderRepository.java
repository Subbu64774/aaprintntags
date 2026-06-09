package com.salesapp.order.repository;

import com.salesapp.order.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    @Query("SELECT o FROM Order o WHERE o.tenant.tenantId = :tenantId AND o.deleted = false ORDER BY o.createdAt DESC")
    Page<Order> findAllByTenant(@Param("tenantId") Long tenantId, Pageable pageable);

    @Query("SELECT o FROM Order o WHERE o.tenant.tenantId = :tenantId AND o.deleted = false " +
           "AND (:status IS NULL OR o.orderStatus = :status) " +
           "AND (:customerId IS NULL OR o.customer.customerId = :customerId) " +
           "AND (:poNumber IS NULL OR LOWER(o.poNumber) LIKE LOWER(CONCAT('%', :poNumber, '%'))) " +
           "AND (CAST(:fromDate AS date) IS NULL OR o.poDate >= :fromDate) " +
           "AND (CAST(:toDate AS date) IS NULL OR o.poDate <= :toDate) " +
           "ORDER BY o.createdAt DESC")
    Page<Order> findFiltered(@Param("tenantId") Long tenantId,
                             @Param("status") String status,
                             @Param("customerId") Long customerId,
                             @Param("poNumber") String poNumber,
                             @Param("fromDate") LocalDate fromDate,
                             @Param("toDate") LocalDate toDate,
                             Pageable pageable);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.tenant.tenantId = :tenantId AND o.deleted = false")
    long countByTenantActive(@Param("tenantId") Long tenantId);

    @Query("SELECT o FROM Order o WHERE o.tenant.tenantId = :tenantId AND o.deleted = false " +
           "AND (:customerId IS NULL OR o.customer.customerId = :customerId) " +
           "AND (CAST(:fromDate AS date) IS NULL OR o.poDate >= :fromDate) " +
           "AND (CAST(:toDate AS date) IS NULL OR o.poDate <= :toDate) " +
           "ORDER BY o.createdAt DESC")
    List<Order> findForReport(@Param("tenantId") Long tenantId,
                              @Param("customerId") Long customerId,
                              @Param("fromDate") LocalDate fromDate,
                              @Param("toDate") LocalDate toDate);
}
