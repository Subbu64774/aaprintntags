package com.aaprint.user.controller;

import com.aaprint.config.TenantContext;
import com.aaprint.user.dto.UserDTO;
import com.aaprint.user.entity.AppUser;
import com.aaprint.user.entity.Role;
import com.aaprint.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
public class UserRestController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<UserDTO>> listUsers(Authentication auth) {
        AppUser caller = userService.findByUsername(auth.getName());
        if (caller == null) return ResponseEntity.status(403).build();

        if (caller.getRole() == Role.ADMIN) {
            return ResponseEntity.ok(userService.getAllUsers());
        } else if (caller.getRole() == Role.MANAGER && caller.getTenant() != null) {
            return ResponseEntity.ok(userService.getUsersByTenant(caller.getTenant().getTenantId()));
        }
        return ResponseEntity.status(403).build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUser(@PathVariable Long id) {
        UserDTO user = userService.getUserById(id);
        return user != null ? ResponseEntity.ok(user) : ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<?> createUser(@Valid @RequestBody UserDTO dto, Authentication auth) {
        AppUser caller = userService.findByUsername(auth.getName());
        if (caller == null) return ResponseEntity.status(403).build();

        try {
            if (caller.getRole() == Role.ADMIN) {
                return ResponseEntity.status(HttpStatus.CREATED).body(userService.createUser(dto));
            } else if (caller.getRole() == Role.MANAGER && caller.getTenant() != null) {
                return ResponseEntity.status(HttpStatus.CREATED)
                        .body(userService.createTenantUser(dto, caller.getTenant().getTenantId()));
            }
            return ResponseEntity.status(403).body("Insufficient permissions");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @Valid @RequestBody UserDTO dto, Authentication auth) {
        AppUser caller = userService.findByUsername(auth.getName());
        if (caller == null) return ResponseEntity.status(403).build();

        try {
            UserDTO updated;
            if (caller.getRole() == Role.ADMIN) {
                updated = userService.updateUser(id, dto);
            } else if (caller.getRole() == Role.MANAGER && caller.getTenant() != null) {
                updated = userService.updateTenantUser(id, dto, caller.getTenant().getTenantId());
            } else {
                return ResponseEntity.status(403).body("Insufficient permissions");
            }
            return updated != null ? ResponseEntity.ok(updated) : ResponseEntity.notFound().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        return userService.deleteUser(id) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    /** Returns all possible permissions in the system */
    @GetMapping("/permissions")
    public ResponseEntity<List<String>> getPermissions() {
        return ResponseEntity.ok(UserService.ALL_PERMISSIONS);
    }
}
