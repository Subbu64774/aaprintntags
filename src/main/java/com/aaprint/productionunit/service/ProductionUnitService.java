package com.aaprint.productionunit.service;

import com.aaprint.config.TenantContext;
import com.aaprint.productionunit.dto.ProductionUnitDTO;
import com.aaprint.productionunit.entity.ProductionUnit;
import com.aaprint.productionunit.repository.ProductionUnitRepository;
import com.aaprint.tenant.service.TenantService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductionUnitService {

    private final ProductionUnitRepository repository;
    private final TenantService tenantService;

    public List<ProductionUnitDTO> getAllByCurrentTenant() {
        Long tenantId = TenantContext.getTenantId();
        return repository.findAllByTenant_TenantIdAndDeletedFalse(tenantId)
                .stream().map(this::toDTO).toList();
    }

    public ProductionUnitDTO getById(Long id) {
        return repository.findById(id).filter(p -> !p.isDeleted()).map(this::toDTO).orElse(null);
    }

    public ProductionUnit getEntityById(Long id) {
        return repository.findById(id).orElse(null);
    }

    public ProductionUnitDTO save(ProductionUnitDTO dto) {
        ProductionUnit pu = new ProductionUnit();
        BeanUtils.copyProperties(dto, pu, "productionUnitId", "tenantId");
        pu.setTenant(tenantService.getTenantEntityById(dto.getTenantId()));
        pu.setActive(true);
        pu.setCreatedAt(LocalDateTime.now());
        pu.setCreatedBy("SYSTEM");
        return toDTO(repository.save(pu));
    }

    public ProductionUnitDTO update(Long id, ProductionUnitDTO dto) {
        return repository.findById(id).map(existing -> {
            BeanUtils.copyProperties(dto, existing, "productionUnitId", "tenantId", "createdAt", "createdBy", "deleted");
            existing.setUpdatedAt(LocalDateTime.now());
            existing.setUpdatedBy("SYSTEM");
            return toDTO(repository.save(existing));
        }).orElse(null);
    }

    public boolean softDelete(Long id) {
        return repository.findById(id).map(pu -> {
            pu.setDeleted(true);
            pu.setUpdatedAt(LocalDateTime.now());
            repository.save(pu);
            return true;
        }).orElse(false);
    }

    private ProductionUnitDTO toDTO(ProductionUnit pu) {
        ProductionUnitDTO dto = new ProductionUnitDTO();
        BeanUtils.copyProperties(pu, dto);
        dto.setTenantId(pu.getTenant().getTenantId());
        return dto;
    }
}

