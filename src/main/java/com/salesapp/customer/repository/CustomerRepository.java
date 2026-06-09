package com.salesapp.customer.repository;

import com.salesapp.customer.entity.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    @Query("SELECT c FROM Customer c WHERE c.deleted = false AND c.tenant.tenantId = :tenantId")
    Page<Customer> findAllActive(@Param("tenantId") Long tenantId, Pageable pageable);

    @Query("SELECT c FROM Customer c WHERE c.deleted = false AND c.tenant.tenantId = :tenantId")
    List<Customer> findAllActive(@Param("tenantId") Long tenantId);

    @Modifying
    @Transactional
    @Query("UPDATE Customer c SET c.deleted = :deleted WHERE c.customerId = :customerId AND c.tenant.tenantId = :tenantId")
    int setDeletedById(@Param("customerId") Long customerId, @Param("deleted") boolean deleted, @Param("tenantId") Long tenantId);

    @Query("SELECT c FROM Customer c WHERE c.deleted = false AND c.tenant.tenantId = :tenantId AND LOWER(c.customerName) LIKE LOWER(CONCAT('%', :name, '%'))")
    Page<Customer> findByNameAndTenant(@Param("name") String name, @Param("tenantId") Long tenantId, Pageable pageable);

    Optional<Customer> findByCustomerNameAndTenant_TenantId(String name, Long tenantId);

    @Query("SELECT c FROM Customer c WHERE c.deleted = false AND c.tenant.tenantId = :tenantId AND " +
           "(LOWER(c.customerName) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(c.email) LIKE LOWER(CONCAT('%', :q, '%')))")
    List<Customer> searchByTenant(@Param("q") String q, @Param("tenantId") Long tenantId);

    long countByTenant_TenantIdAndDeletedFalse(Long tenantId);
}
