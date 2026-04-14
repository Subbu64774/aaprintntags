package com.aaprint.tenant.service;

import com.aaprint.tenant.dto.TenantDTO;
import com.aaprint.tenant.entity.Tenant;
import com.aaprint.tenant.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository tenantRepository;

    public List<TenantDTO> getAllTenants() {
        return tenantRepository.findAllByDeletedFalse().stream().map(this::toDTO).toList();
    }

    public TenantDTO getTenantById(Long id) {
        return tenantRepository.findById(id).filter(t -> !t.isDeleted()).map(this::toDTO).orElse(null);
    }

    public Tenant getTenantEntityById(Long id) {
        return tenantRepository.findById(id).orElseThrow(() -> new RuntimeException("Tenant not found: " + id));
    }

    public TenantDTO saveTenant(TenantDTO dto) {
        Tenant tenant = new Tenant();
        BeanUtils.copyProperties(dto, tenant, "tenantId");
        tenant.setActive(true);
        tenant.setCreatedAt(LocalDateTime.now());
        tenant.setCreatedBy("SYSTEM");
        return toDTO(tenantRepository.save(tenant));
    }

    public TenantDTO updateTenant(Long id, TenantDTO dto) {
        return tenantRepository.findById(id).map(existing -> {
            BeanUtils.copyProperties(dto, existing, "tenantId", "createdAt", "createdBy", "deleted");
            existing.setUpdatedAt(LocalDateTime.now());
            existing.setUpdatedBy("SYSTEM");
            return toDTO(tenantRepository.save(existing));
        }).orElse(null);
    }

    public void updateLogoUrl(Long id, String logoUrl) {
        tenantRepository.findById(id).ifPresent(t -> {
            t.setLogoUrl(logoUrl);
            t.setUpdatedAt(LocalDateTime.now());
            tenantRepository.save(t);
        });
    }

    public boolean softDelete(Long id) {
        return tenantRepository.findById(id).map(t -> {
            t.setDeleted(true);
            t.setUpdatedAt(LocalDateTime.now());
            tenantRepository.save(t);
            return true;
        }).orElse(false);
    }

    private TenantDTO toDTO(Tenant t) {
        TenantDTO dto = new TenantDTO();
        BeanUtils.copyProperties(t, dto);
        return dto;
    }
}

