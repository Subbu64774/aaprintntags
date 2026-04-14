package com.aaprint.product.repository;

import com.aaprint.product.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    @Query("SELECT p FROM Product p WHERE p.deleted = false AND p.tenant.tenantId = :tenantId")
    Page<Product> findAllActiveByTenant(@Param("tenantId") Long tenantId, Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.deleted = false AND p.tenant.tenantId = :tenantId")
    List<Product> findAllActiveByTenant(@Param("tenantId") Long tenantId);

    @Query("SELECT p FROM Product p WHERE p.deleted = false AND p.tenant.tenantId = :tenantId AND LOWER(p.productName) LIKE LOWER(CONCAT('%', :name, '%'))")
    Page<Product> findByNameAndTenant(@Param("name") String name, @Param("tenantId") Long tenantId, Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.deleted = false AND p.tenant.tenantId = :tenantId " +
           "AND (:name IS NULL OR LOWER(p.productName) LIKE LOWER(CONCAT('%', :name, '%'))) " +
           "AND (:hsn IS NULL OR p.hsnCode = :hsn)")
    Page<Product> findByFilters(@Param("tenantId") Long tenantId,
                                @Param("name") String name,
                                @Param("hsn") String hsn,
                                Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.deleted = false AND p.tenant.tenantId = :tenantId AND LOWER(p.productName) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<Product> searchByTenant(@Param("q") String q, @Param("tenantId") Long tenantId);

    long countByTenant_TenantIdAndDeletedFalse(Long tenantId);
}
