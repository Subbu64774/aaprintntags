package com.aaprint.product.controller;

import com.aaprint.product.dto.ProductDTO;
import com.aaprint.product.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/products")
public class ProductRestController {

    private static final Logger logger = LoggerFactory.getLogger(ProductRestController.class);
    private final ProductService productService;

    /**
     * Get a paginated list of products with optional name search
     */
    @GetMapping
    public ResponseEntity<Page<ProductDTO>> listProducts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String hsn) {
        Pageable pageable = PageRequest.of(page, size);
        Page<ProductDTO> products;
        if ((name != null && !name.isBlank()) || (hsn != null && !hsn.isBlank())) {
            products = productService.findByFilters(name, hsn, pageable);
        } else {
            products = productService.getAllProducts(pageable);
        }
        return ResponseEntity.ok(products);
    }

    /**
     * Search products (for dropdowns / autocomplete)
     */
    @GetMapping("/search")
    public ResponseEntity<List<ProductDTO>> searchProducts(
            @RequestParam(value = "q", required = false, defaultValue = "") String searchTerm) {
        return ResponseEntity.ok(productService.searchProducts(searchTerm));
    }

    /**
     * Get a product by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<ProductDTO> getProduct(@PathVariable("id") Long id) {
        logger.debug("Fetching product with ID: {}", id);
        ProductDTO product = productService.getProductById(id);
        return product != null ? ResponseEntity.ok(product) : ResponseEntity.notFound().build();
    }

    /**
     * Create a new product
     */
    @PostMapping
    public ResponseEntity<ProductDTO> createProduct(@Valid @RequestBody ProductDTO dto) {
        logger.info("Creating new product: {}", dto);
        ProductDTO createdProduct = productService.saveProduct(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdProduct);
    }

    /**
     * Update an existing product
     */
    @PutMapping("/{id}")
    public ResponseEntity<ProductDTO> updateProduct(
            @PathVariable("id") Long id, @Valid @RequestBody ProductDTO dto) {
        logger.info("Updating product with ID: {}", id);
        ProductDTO updatedProduct = productService.updateProductById(id, dto);
        return updatedProduct != null ? ResponseEntity.ok(updatedProduct) : ResponseEntity.notFound().build();
    }

    /**
     * Delete a product by ID
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable("id") Long id) {
        logger.info("Attempting to delete product with ID: {}", id);
        boolean isDeleted = productService.softDeleteProduct(id);
        return isDeleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}
