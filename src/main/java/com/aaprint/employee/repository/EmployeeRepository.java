package com.aaprint.employee.repository;

import com.aaprint.employee.entity.Employee;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    @Query("SELECT e FROM Employee e WHERE e.deleted = false AND e.tenant.tenantId = :tenantId")
    Page<Employee> findAllActive(@Param("tenantId") Long tenantId, Pageable pageable);

    @Query("SELECT e FROM Employee e WHERE e.deleted = false AND e.tenant.tenantId = :tenantId")
    List<Employee> findAllActive(@Param("tenantId") Long tenantId);

    @Query("SELECT e FROM Employee e WHERE e.deleted = false AND e.tenant.tenantId = :tenantId AND LOWER(e.firstName) LIKE LOWER(CONCAT('%', :name, '%'))")
    Page<Employee> findByNameAndTenant(@Param("name") String name, @Param("tenantId") Long tenantId, Pageable pageable);

    @Query("SELECT e FROM Employee e WHERE e.deleted = false AND e.tenant.tenantId = :tenantId AND " +
           "(LOWER(e.firstName) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(e.lastName) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(e.email) LIKE LOWER(CONCAT('%', :q, '%')))")
    List<Employee> searchByTenant(@Param("q") String q, @Param("tenantId") Long tenantId);

    @Modifying
    @Transactional
    @Query("UPDATE Employee e SET e.deleted = true WHERE e.employeeId = :id AND e.tenant.tenantId = :tenantId")
    int softDeleteById(@Param("id") Long id, @Param("tenantId") Long tenantId);

    long countByTenant_TenantIdAndDeletedFalse(Long tenantId);
}
