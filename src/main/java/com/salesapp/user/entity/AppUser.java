package com.salesapp.user.entity;

import com.salesapp.tenant.entity.Tenant;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "app_users")
@Data
public class AppUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long userId;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String password;

    private String fullName;
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.VIEWER;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "tenant_id")
    private Tenant tenant; // null for ADMIN

    // Comma-separated permissions e.g. "customers:view,customers:edit,products:view"
    // ADMIN and MANAGER have all permissions implicitly
    @Column(length = 2000)
    private String permissions;

    private boolean active = true;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

