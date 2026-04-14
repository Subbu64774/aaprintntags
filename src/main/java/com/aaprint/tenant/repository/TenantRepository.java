package com.aaprint.tenant.repository;

import com.aaprint.tenant.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, Long> {

    List<Tenant> findAllByDeletedFalse();

    long countByDeletedFalse();
}

