package com.salesapp.productionunit.repository;

import com.salesapp.productionunit.entity.ProductionUnit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductionUnitRepository extends JpaRepository<ProductionUnit, Long> {

    List<ProductionUnit> findAllByTenant_TenantIdAndDeletedFalse(Long tenantId);

    long countByTenant_TenantIdAndDeletedFalse(Long tenantId);
}

