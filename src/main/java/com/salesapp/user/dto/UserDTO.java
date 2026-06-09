package com.salesapp.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class UserDTO {
    private Long userId;

    @NotBlank(message = "Username is required")
    private String username;

    private String password; // only required on create

    private String fullName;
    private String email;

    @NotBlank(message = "Role is required")
    private String role;

    private Long tenantId;
    private String tenantName;
    private boolean active;

    // Granular permissions for STAFF / VIEWER roles
    private List<String> permissions;
}

