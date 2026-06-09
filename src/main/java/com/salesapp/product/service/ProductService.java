package com.salesapp.product.service;

import com.salesapp.product.dto.ProductDTO;
import com.salesapp.product.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ProductService {

    List<ProductDTO> getAllProducts();

    Page<ProductDTO> getAllProducts(Pageable pageable);
    Page<ProductDTO> findByProductName(String name, Pageable pageable);
    Page<ProductDTO> findByFilters(String name, String hsn, Pageable pageable);
    ProductDTO getProductById(Long id);

    Product getProductEntityById(Long id);

    ProductDTO saveProduct(ProductDTO productDTO);
    ProductDTO updateProductById(Long id, ProductDTO productDTO);
    boolean softDeleteProduct(Long id);

    List<ProductDTO> searchProducts(String searchTerm);
}
