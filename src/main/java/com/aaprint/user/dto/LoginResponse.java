package com.aaprint.user.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private String username;
    private String fullName;
    private String role;
    private Long tenantId;
    private String tenantName;
    private String tenantLogoUrl;
    private List<String> permissions;
}

