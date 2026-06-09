package com.salesapp.user.service;

import com.salesapp.config.TenantContext;
import com.salesapp.tenant.entity.Tenant;
import com.salesapp.tenant.repository.TenantRepository;
import com.salesapp.user.dto.UserDTO;
import com.salesapp.user.entity.AppUser;
import com.salesapp.user.entity.Role;
import com.salesapp.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final PasswordEncoder passwordEncoder;

    // All possible permissions in the system
    public static final List<String> ALL_PERMISSIONS = List.of(
        "dashboard:view",
        "customers:view", "customers:edit",
        "products:view", "products:edit",
        "orders:view", "orders:edit",
        "invoices:view", "invoices:edit",
        "payments:view", "payments:edit",
        "employees:view", "employees:edit",
        "production_units:view", "production_units:edit",
        "reports:view"
    );

    /** ADMIN sees all users, MANAGER sees only their tenant's users */
    public List<UserDTO> getAllUsers() {
        return userRepository.findAllByActiveTrueOrderByUsernameAsc()
                .stream().map(this::toDTO).toList();
    }

    public List<UserDTO> getUsersByTenant(Long tenantId) {
        return userRepository.findAllByTenant_TenantIdAndActiveTrueOrderByUsernameAsc(tenantId)
                .stream().map(this::toDTO).toList();
    }

    public UserDTO getUserById(Long id) {
        return userRepository.findById(id).map(this::toDTO).orElse(null);
    }

    public AppUser findByUsername(String username) {
        return userRepository.findByUsernameAndActiveTrue(username).orElse(null);
    }

    public UserDTO createUser(UserDTO dto) {
        if (userRepository.existsByUsername(dto.getUsername())) {
            throw new RuntimeException("Username already exists: " + dto.getUsername());
        }

        AppUser user = new AppUser();
        user.setUsername(dto.getUsername());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setFullName(dto.getFullName());
        user.setEmail(dto.getEmail());
        user.setRole(Role.valueOf(dto.getRole()));
        user.setActive(true);
        user.setCreatedAt(LocalDateTime.now());

        // Set permissions
        if (dto.getPermissions() != null && !dto.getPermissions().isEmpty()) {
            user.setPermissions(String.join(",", dto.getPermissions()));
        }

        if (dto.getTenantId() != null) {
            Tenant tenant = tenantRepository.findById(dto.getTenantId())
                    .orElseThrow(() -> new RuntimeException("Tenant not found"));
            user.setTenant(tenant);
        }

        return toDTO(userRepository.save(user));
    }

    /** Create a user scoped to the caller's tenant (used by MANAGER role) */
    public UserDTO createTenantUser(UserDTO dto, Long callerTenantId) {
        if (userRepository.existsByUsername(dto.getUsername())) {
            throw new RuntimeException("Username already exists: " + dto.getUsername());
        }

        Role role = Role.valueOf(dto.getRole());
        // MANAGER can only create STAFF or VIEWER
        if (role == Role.ADMIN || role == Role.MANAGER) {
            throw new RuntimeException("You can only create STAFF or VIEWER users");
        }

        AppUser user = new AppUser();
        user.setUsername(dto.getUsername());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setFullName(dto.getFullName());
        user.setEmail(dto.getEmail());
        user.setRole(role);
        user.setActive(true);
        user.setCreatedAt(LocalDateTime.now());

        // Force tenant to caller's tenant
        Tenant tenant = tenantRepository.findById(callerTenantId)
                .orElseThrow(() -> new RuntimeException("Tenant not found"));
        user.setTenant(tenant);

        if (dto.getPermissions() != null && !dto.getPermissions().isEmpty()) {
            user.setPermissions(String.join(",", dto.getPermissions()));
        }

        return toDTO(userRepository.save(user));
    }

    public UserDTO updateUser(Long id, UserDTO dto) {
        return userRepository.findById(id).map(user -> {
            user.setFullName(dto.getFullName());
            user.setEmail(dto.getEmail());
            user.setRole(Role.valueOf(dto.getRole()));
            user.setActive(dto.isActive());
            user.setUpdatedAt(LocalDateTime.now());

            if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
                user.setPassword(passwordEncoder.encode(dto.getPassword()));
            }

            // Update permissions
            if (dto.getPermissions() != null) {
                user.setPermissions(String.join(",", dto.getPermissions()));
            }

            if (dto.getTenantId() != null) {
                user.setTenant(tenantRepository.findById(dto.getTenantId()).orElse(null));
            } else if (user.getRole() == Role.ADMIN) {
                user.setTenant(null);
            }

            return toDTO(userRepository.save(user));
        }).orElse(null);
    }

    /** Update scoped to tenant (used by MANAGER) */
    public UserDTO updateTenantUser(Long id, UserDTO dto, Long callerTenantId) {
        return userRepository.findById(id)
                .filter(u -> u.getTenant() != null && u.getTenant().getTenantId().equals(callerTenantId))
                .map(user -> {
                    Role role = Role.valueOf(dto.getRole());
                    if (role == Role.ADMIN || role == Role.MANAGER) {
                        throw new RuntimeException("You can only assign STAFF or VIEWER roles");
                    }
                    user.setFullName(dto.getFullName());
                    user.setEmail(dto.getEmail());
                    user.setRole(role);
                    user.setActive(dto.isActive());
                    user.setUpdatedAt(LocalDateTime.now());

                    if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
                        user.setPassword(passwordEncoder.encode(dto.getPassword()));
                    }
                    if (dto.getPermissions() != null) {
                        user.setPermissions(String.join(",", dto.getPermissions()));
                    }

                    return toDTO(userRepository.save(user));
                }).orElse(null);
    }

    public boolean deleteUser(Long id) {
        return userRepository.findById(id).map(user -> {
            user.setActive(false);
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);
            return true;
        }).orElse(false);
    }

    /** Get effective permissions for a user */
    public List<String> getEffectivePermissions(AppUser user) {
        if (user.getRole() == Role.ADMIN || user.getRole() == Role.MANAGER) {
            return ALL_PERMISSIONS; // full access
        }
        if (user.getPermissions() == null || user.getPermissions().isBlank()) {
            // STAFF gets all permissions by default, VIEWER gets view-only
            if (user.getRole() == Role.STAFF) {
                return ALL_PERMISSIONS;
            }
            return ALL_PERMISSIONS.stream().filter(p -> p.endsWith(":view")).toList();
        }
        return Arrays.asList(user.getPermissions().split(","));
    }

    private UserDTO toDTO(AppUser u) {
        UserDTO dto = new UserDTO();
        dto.setUserId(u.getUserId());
        dto.setUsername(u.getUsername());
        dto.setFullName(u.getFullName());
        dto.setEmail(u.getEmail());
        dto.setRole(u.getRole().name());
        dto.setActive(u.isActive());
        dto.setPermissions(getEffectivePermissions(u));
        if (u.getTenant() != null) {
            dto.setTenantId(u.getTenant().getTenantId());
            dto.setTenantName(u.getTenant().getTenantName());
        }
        return dto;
    }
}

