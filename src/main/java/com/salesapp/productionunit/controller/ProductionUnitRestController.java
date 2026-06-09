package com.salesapp.productionunit.controller;

import com.salesapp.productionunit.dto.ProductionUnitDTO;
import com.salesapp.productionunit.service.ProductionUnitService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/production-units")
public class ProductionUnitRestController {

    private final ProductionUnitService service;

    @GetMapping
    public ResponseEntity<List<ProductionUnitDTO>> list() {
        return ResponseEntity.ok(service.getAllByCurrentTenant());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductionUnitDTO> get(@PathVariable Long id) {
        ProductionUnitDTO dto = service.getById(id);
        return dto != null ? ResponseEntity.ok(dto) : ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<ProductionUnitDTO> create(@Valid @RequestBody ProductionUnitDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.save(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductionUnitDTO> update(@PathVariable Long id, @Valid @RequestBody ProductionUnitDTO dto) {
        ProductionUnitDTO updated = service.update(id, dto);
        return updated != null ? ResponseEntity.ok(updated) : ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        return service.softDelete(id) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}

