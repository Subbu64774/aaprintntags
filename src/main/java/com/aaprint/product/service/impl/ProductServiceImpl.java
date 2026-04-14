package com.aaprint.product.service.impl;

import com.aaprint.config.TenantContext;
import com.aaprint.config.TenantContextException;
import com.aaprint.product.dto.ProductDTO;
import com.aaprint.product.entity.Product;
import com.aaprint.product.repository.ProductRepository;
import com.aaprint.product.service.ProductService;
import com.aaprint.tenant.service.TenantService;
import com.aaprint.productionunit.service.ProductionUnitService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final TenantService tenantService;
    private final ProductionUnitService productionUnitService;

    private Long tenantId() {
        Long id = TenantContext.getTenantId();
        if (id == null) throw new TenantContextException();
        return id;
    }

    @Override
    public List<ProductDTO> getAllProducts() {
        return productRepository.findAllActiveByTenant(tenantId())
                .stream().map(this::convertToDTO).toList();
    }

    /**
     * Get all products (non-deleted) with pagination.
     */
    @Override
    public Page<ProductDTO> getAllProducts(Pageable pageable) {
        return productRepository.findAllActiveByTenant(tenantId(), pageable).map(this::convertToDTO);
    }

    /**
     * Get products by name with pagination and case-insensitive search.
     */
    @Override
    public Page<ProductDTO> findByProductName(String name, Pageable pageable) {
        return productRepository.findByNameAndTenant(name, tenantId(), pageable).map(this::convertToDTO);
    }

    @Override
    public Page<ProductDTO> findByFilters(String name, String hsn, Pageable pageable) {
        return productRepository.findByFilters(tenantId(),
                name != null && !name.isBlank() ? name : null,
                hsn != null && !hsn.isBlank() ? hsn : null,
                pageable).map(this::convertToDTO);
    }

    /**
     * Get a product by its ID.
     * Throws an exception if the product is not found.
     */
    @Override
    public ProductDTO getProductById(Long id) {
        Product product = productRepository.findById(id)
                .filter(p -> p.getTenant().getTenantId().equals(tenantId()))
                .orElseThrow(() -> new RuntimeException("Product not found with ID: " + id));
        return convertToDTO(product);
    }

    /**
     * Get a product by its ID.
     * Throws an exception if the product is not found.
     */
    @Override
    public Product getProductEntityById(Long id) {
        return productRepository.findById(id)
                .filter(p -> p.getTenant().getTenantId().equals(tenantId()))
                .orElseThrow(() -> new RuntimeException("Product not found with ID: " + id));
    }

    /**
     * Create a new product.
     * Sets the creation timestamp before saving.
     *
     * @return
     */
    @Override
    public ProductDTO saveProduct(ProductDTO productDTO) {
        Product product = convertToEntity(productDTO);
        product.setTenant(tenantService.getTenantEntityById(tenantId()));
        Long puId = TenantContext.getProductionUnitId();
        if (puId != null) product.setProductionUnit(productionUnitService.getEntityById(puId));
        product.setCreatedAt(LocalDateTime.now());
        product.setUpdatedAt(LocalDateTime.now());
        return convertToDTO(productRepository.save(product));
    }

    /**
     * Update an existing product by its ID.
     * Only updates the fields passed in DTO (ignoring ID, createdAt, createdBy fields).
     *
     * @return
     */
    @Override
    public ProductDTO updateProductById(Long id, ProductDTO productDTO) {
        Product existing = productRepository.findById(id)
                .filter(p -> p.getTenant().getTenantId().equals(tenantId()))
                .orElseThrow(() -> new RuntimeException("Product not found with ID: " + id));
        BeanUtils.copyProperties(productDTO, existing, "productId", "createdAt", "createdBy", "tenant", "productionUnit");
        existing.setUpdatedAt(LocalDateTime.now());
        return convertToDTO(productRepository.save(existing));
    }

    /**
     * Soft delete a product by setting its 'deleted' flag to true.
     * Returns a boolean indicating success/failure.
     */
    @Override
    public boolean softDeleteProduct(Long id) {
        return productRepository.findById(id)
                .filter(p -> p.getTenant().getTenantId().equals(tenantId()))
                .map(product -> {
                    product.setDeleted(true);
                    product.setUpdatedAt(LocalDateTime.now());
                    productRepository.save(product);
                    return true;
                }).orElse(false);
    }

    @Override
    public List<ProductDTO> searchProducts(String searchTerm) {
        List<Product> products;
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            products = productRepository.findAllActiveByTenant(tenantId());
        } else {
            products = productRepository.searchByTenant(searchTerm, tenantId());
        }
        return products.stream().map(this::convertToDTO).toList();
    }

    /**
     * Convert entity to DTO
     */
    private ProductDTO convertToDTO(Product product) {
        ProductDTO dto = new ProductDTO();
        BeanUtils.copyProperties(product, dto);
        return dto;
    }

    /**
     * Convert DTO to entity
     */
    private Product convertToEntity(ProductDTO dto) {
        Product product = new Product();
        BeanUtils.copyProperties(dto, product);
        return product;
    }
}
