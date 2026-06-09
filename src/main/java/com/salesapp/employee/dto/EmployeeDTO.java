package com.salesapp.employee.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class EmployeeDTO {

    private Long employeeId;

    @NotBlank(message = "First name is required")
    @Size(max = 100)
    private String firstName;

    @Size(max = 100)
    private String lastName;

    @Email(message = "Invalid email format")
    @Size(max = 100)
    private String email;

    @Size(max = 15)
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

    private boolean active;
}

