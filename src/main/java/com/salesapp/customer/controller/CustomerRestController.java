package com.salesapp.customer.controller;

import com.salesapp.customer.dto.CustomerDTO;
import com.salesapp.customer.service.CustomerService;
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
@RequestMapping("/api/customers")
public class CustomerRestController {

    private static final Logger logger = LoggerFactory.getLogger(CustomerRestController.class);
    private final CustomerService customerService;

    /**
     * List customers with pagination and optional name search
     */
    @GetMapping
    public ResponseEntity<Page<CustomerDTO>> getCustomers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String name) {
        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<CustomerDTO> customers;
            if (name != null && !name.isBlank()) {
                customers = customerService.findByName(name, pageable);
            } else {
                customers = customerService.getAllCustomers(pageable);
            }
            return ResponseEntity.ok(customers);
        } catch (Exception e) {
            logger.error("Error fetching customers", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Search customers (for dropdowns / autocomplete)
     */
    @GetMapping("/search")
    public ResponseEntity<List<CustomerDTO>> searchCustomers(
            @RequestParam(value = "q", required = false, defaultValue = "") String searchTerm) {
        return ResponseEntity.ok(customerService.searchCustomers(searchTerm));
    }

    /**
     * Add a new customer
     */
    @PostMapping
    public ResponseEntity<CustomerDTO> addCustomer(@Valid @RequestBody CustomerDTO customerDTO) {
        try {
            logger.info("Adding new customer: {}", customerDTO);
            CustomerDTO savedCustomer = customerService.saveCustomer(customerDTO);
            return new ResponseEntity<>(savedCustomer, HttpStatus.CREATED);
        } catch (Exception e) {
            logger.error("Error adding customer", e);
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * Show details of a customer
     */
    @GetMapping("/{id}")
    public ResponseEntity<CustomerDTO> viewCustomer(@PathVariable("id") Long id) {
        try {
            CustomerDTO customer = customerService.getCustomerById(id);
            if (customer == null) {
                logger.warn("Customer with ID {} not found", id);
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }
            return new ResponseEntity<>(customer, HttpStatus.OK);
        } catch (Exception e) {
            logger.error("Error fetching customer with ID: {}", id, e);
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Update a customer's information
     */
    @PutMapping("/{id}")
    public ResponseEntity<CustomerDTO> updateCustomer(@PathVariable("id") Long id,
                                                      @Valid @RequestBody CustomerDTO customerDTO) {
        try {
            logger.info("Updating customer with ID: {}", id);
            CustomerDTO updatedCustomer = customerService.updateCustomerById(id, customerDTO);
            if (updatedCustomer == null) {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }
            return new ResponseEntity<>(updatedCustomer, HttpStatus.OK);
        } catch (Exception e) {
            logger.error("Error updating customer with ID: {}", id, e);
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * Soft delete a customer
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCustomer(@PathVariable("id") Long id) {
        try {
            boolean isDeleted = customerService.softDeleteCustomer(id);
            if (isDeleted) {
                logger.info("Successfully deleted customer with ID: {}", id);
                return new ResponseEntity<>(HttpStatus.NO_CONTENT);
            } else {
                logger.error("Failed to delete customer with ID: {}", id);
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }
        } catch (Exception e) {
            logger.error("Error deleting customer with ID: {}", id, e);
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
