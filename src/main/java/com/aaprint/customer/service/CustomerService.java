package com.aaprint.customer.service;

import com.aaprint.config.TenantContext;
import com.aaprint.config.TenantContextException;
import com.aaprint.customer.dto.CustomerDTO;
import com.aaprint.customer.entity.Customer;
import com.aaprint.customer.repository.CustomerRepository;
import com.aaprint.tenant.service.TenantService;
import com.aaprint.productionunit.service.ProductionUnitService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private static final Logger logger = LoggerFactory.getLogger(CustomerService.class);
    private final CustomerRepository customerRepository;
    private final TenantService tenantService;
    private final ProductionUnitService productionUnitService;

    private Long tenantId() {
        Long id = TenantContext.getTenantId();
        if (id == null) throw new TenantContextException();
        return id;
    }

    public List<CustomerDTO> getAllCustomers() {
        logger.debug("Fetching all active customers");

        return customerRepository.findAllActive(tenantId()).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public Page<CustomerDTO> getAllCustomers(Pageable pageable) {
        logger.debug("Fetching all active customers for page");
        Page<Customer> customerPage = customerRepository.findAllActive(tenantId(), pageable);
        return customerPage.map(this::convertToDTO);
    }

    public Page<CustomerDTO> findByName(String name, Pageable pageable) {
        logger.debug("Searching customers with name containing '{}'", name);
        Page<Customer> customerPage = customerRepository.findByNameAndTenant(name, tenantId(), pageable);
        return customerPage.map(this::convertToDTO);
    }

    public CustomerDTO getCustomerById(Long id) {
        logger.info("Fetching customerDTO by ID: {}", id);
        return customerRepository.findById(id)
                .filter(c -> c.getTenant().getTenantId().equals(tenantId()))
                .map(this::convertToDTO)
                .orElse(null);
    }

    public Customer getCustomerEntityById(Long id) {
        logger.info("Fetching customer by ID: {}", id);
        return customerRepository.findById(id)
                .filter(c -> c.getTenant().getTenantId().equals(tenantId()))
                .orElseThrow();
    }

    public CustomerDTO saveCustomer(CustomerDTO dto) {
        logger.info("Saving new customer: {}", dto.getCustomerName());
        Customer customer = new Customer();
        customer.setTenant(tenantService.getTenantEntityById(tenantId()));
        Long puId = TenantContext.getProductionUnitId();
        if (puId != null) customer.setProductionUnit(productionUnitService.getEntityById(puId));
        customer.setCustomerName(dto.getCustomerName());
        customer.setPhone(dto.getPhone());
        customer.setEmail(dto.getEmail());
        customer.setGstNumber(dto.getGstNumber());
        customer.setCurrentAddress(dto.getCurrentAddress());
        customer.setBillingAddress(dto.getBillingAddress());
        customer.setDeliveryAddress(dto.getDeliveryAddress());
        customer.setCreatedAt(LocalDateTime.now());
        customer.setDeleted(false);
        customer.setCreatedBy("SYSTEM");
        Customer saved = customerRepository.save(customer);
        logger.debug("Customer saved with ID: {}", saved.getCustomerId());
        return convertToDTO(saved);
    }

    public CustomerDTO updateCustomerById(Long id, CustomerDTO dto) {
        logger.info("Updating customer with ID: {}", id);
        return customerRepository.findById(id)
                .filter(c -> c.getTenant().getTenantId().equals(tenantId()))
                .map(existing -> {
                    existing.setCustomerName(dto.getCustomerName());
                    existing.setPhone(dto.getPhone());
                    existing.setEmail(dto.getEmail());
                    existing.setGstNumber(dto.getGstNumber());
                    existing.setCurrentAddress(dto.getCurrentAddress());
                    existing.setBillingAddress(dto.getBillingAddress());
                    existing.setDeliveryAddress(dto.getDeliveryAddress());
                    existing.setUpdatedAt(LocalDateTime.now());
                    existing.setUpdatedBy("SYSTEM");

                    Customer updatedCustomer = customerRepository.save(existing);
                    logger.debug("Customer with ID: {} updated successfully", id);
                    return convertToDTO(updatedCustomer);
                }).orElse(null);
    }

    @Transactional
    public boolean softDeleteCustomer(Long id) {
        logger.info("Soft deleting customer with ID: {}", id);
        int updatedCount = customerRepository.setDeletedById(id, true, tenantId());
        if (updatedCount > 0) {
            logger.debug("Customer with ID: {} marked as deleted", id);
            return true;
        } else {
            logger.warn("Customer with ID: {} could not be deleted (not found or already deleted)", id);
            return false;
        }
    }

    private CustomerDTO convertToDTO(Customer c) {
        CustomerDTO dto = new CustomerDTO();
        dto.setCustomerId(c.getCustomerId());
        dto.setCustomerName(c.getCustomerName());
        dto.setEmail(c.getEmail());
        dto.setPhone(c.getPhone());
        dto.setBillingAddress(c.getBillingAddress());
        dto.setCurrentAddress(c.getCurrentAddress());
        dto.setDeliveryAddress(c.getDeliveryAddress());
        dto.setGstNumber(c.getGstNumber());
        return dto;
    }

    public List<CustomerDTO> searchCustomers(String searchTerm) {
        List<Customer> customers;
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            customers = customerRepository.findAllActive(tenantId());
        } else {
            customers = customerRepository.searchByTenant(searchTerm, tenantId());
        }
        return customers.stream().map(this::convertToDTO).toList();
    }

}
