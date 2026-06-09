package com.salesapp.employee.entity;

import com.salesapp.productionunit.entity.ProductionUnit;
import com.salesapp.tenant.entity.Tenant;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employees")
@Data
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long employeeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "production_unit_id")
    private ProductionUnit productionUnit;

    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String designation;
    private String department;

    private LocalDate dateOfJoining;
    private Double salary;

    private String address;
    private String city;
    private String state;
    private String pincode;

    private String bloodGroup;
    private String emergencyContact;
    private String aadharNumber;
    private String bankAccountNumber;
    private String bankAccountName;
    private String bankIfsc;

    private boolean active = true;
    private boolean deleted = false;

    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
}
