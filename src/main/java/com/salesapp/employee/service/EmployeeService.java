package com.salesapp.employee.service;

import com.salesapp.config.TenantContext;
import com.salesapp.config.TenantContextException;
import com.salesapp.employee.dto.EmployeeDTO;
import com.salesapp.employee.entity.Employee;
import com.salesapp.employee.repository.EmployeeRepository;
import com.salesapp.tenant.service.TenantService;
import com.salesapp.productionunit.service.ProductionUnitService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeanUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private static final Logger logger = LoggerFactory.getLogger(EmployeeService.class);
    private final EmployeeRepository employeeRepository;
    private final TenantService tenantService;
    private final ProductionUnitService productionUnitService;

    private Long tenantId() {
        Long id = TenantContext.getTenantId();
        if (id == null) throw new TenantContextException();
        return id;
    }

    public Page<EmployeeDTO> getAllEmployees(Pageable pageable) {
        return employeeRepository.findAllActive(tenantId(), pageable).map(this::toDTO);
    }

    public Page<EmployeeDTO> findByName(String name, Pageable pageable) {
        return employeeRepository.findByNameAndTenant(name, tenantId(), pageable).map(this::toDTO);
    }

    public EmployeeDTO getEmployeeById(Long id) {
        return employeeRepository.findById(id)
                .filter(e -> !e.isDeleted() && e.getTenant().getTenantId().equals(tenantId()))
                .map(this::toDTO).orElse(null);
    }

    public List<Employee> searchEmployees(String q) {
        if (q == null || q.isBlank()) {
            return employeeRepository.findAllActive(tenantId());
        }
        return employeeRepository.searchByTenant(q, tenantId());
    }

    public EmployeeDTO saveEmployee(EmployeeDTO dto) {
        logger.info("Saving employee: {} {}", dto.getFirstName(), dto.getLastName());
        Employee employee = new Employee();
        BeanUtils.copyProperties(dto, employee, "employeeId");
        employee.setTenant(tenantService.getTenantEntityById(tenantId()));
        Long puId = TenantContext.getProductionUnitId();
        if (puId != null) employee.setProductionUnit(productionUnitService.getEntityById(puId));
        employee.setCreatedAt(LocalDateTime.now());
        employee.setCreatedBy("SYSTEM");
        employee.setActive(true);
        employee.setDeleted(false);
        return toDTO(employeeRepository.save(employee));
    }

    public EmployeeDTO updateEmployee(Long id, EmployeeDTO dto) {
        return employeeRepository.findById(id)
                .filter(e -> e.getTenant().getTenantId().equals(tenantId()))
                .map(existing -> {
                    BeanUtils.copyProperties(dto, existing, "employeeId", "createdAt", "createdBy", "deleted", "tenant", "productionUnit");
                    existing.setUpdatedAt(LocalDateTime.now());
                    existing.setUpdatedBy("SYSTEM");
                    return toDTO(employeeRepository.save(existing));
                }).orElse(null);
    }

    @Transactional
    public boolean softDeleteEmployee(Long id) {
        return employeeRepository.softDeleteById(id, tenantId()) > 0;
    }

    public long countActive() {
        return employeeRepository.countByTenant_TenantIdAndDeletedFalse(tenantId());
    }

    private EmployeeDTO toDTO(Employee e) {
        EmployeeDTO dto = new EmployeeDTO();
        BeanUtils.copyProperties(e, dto);
        return dto;
    }
}
