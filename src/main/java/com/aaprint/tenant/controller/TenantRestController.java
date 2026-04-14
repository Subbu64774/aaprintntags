package com.aaprint.tenant.controller;

import com.aaprint.tenant.dto.TenantDTO;
import com.aaprint.tenant.service.TenantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/tenants")
public class TenantRestController {

    private final TenantService tenantService;

    private static final String LOGO_DIR = "logos";

    @GetMapping
    public ResponseEntity<List<TenantDTO>> listTenants() {
        return ResponseEntity.ok(tenantService.getAllTenants());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TenantDTO> getTenant(@PathVariable Long id) {
        TenantDTO tenant = tenantService.getTenantById(id);
        return tenant != null ? ResponseEntity.ok(tenant) : ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<TenantDTO> createTenant(@Valid @RequestBody TenantDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(tenantService.saveTenant(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TenantDTO> updateTenant(@PathVariable Long id, @Valid @RequestBody TenantDTO dto) {
        TenantDTO updated = tenantService.updateTenant(id, dto);
        return updated != null ? ResponseEntity.ok(updated) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTenant(@PathVariable Long id) {
        return tenantService.softDelete(id) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    @PostMapping("/{id}/logo")
    public ResponseEntity<?> uploadLogo(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        try {
            Path logoDir = Paths.get(LOGO_DIR);
            Files.createDirectories(logoDir);

            String ext = getExtension(file.getOriginalFilename());
            String filename = "tenant_" + id + ext;
            Path dest = logoDir.resolve(filename);
            Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);

            String logoUrl = "/logos/" + filename;
            tenantService.updateLogoUrl(id, logoUrl);

            return ResponseEntity.ok(Map.of("logoUrl", logoUrl));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to upload logo"));
        }
    }

    private String getExtension(String filename) {
        if (filename != null && filename.contains(".")) {
            return filename.substring(filename.lastIndexOf('.'));
        }
        return ".png";
    }
}

