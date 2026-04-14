package com.aaprint.user.controller;

import com.aaprint.config.security.JwtUtil;
import com.aaprint.user.dto.LoginRequest;
import com.aaprint.user.dto.LoginResponse;
import com.aaprint.user.entity.AppUser;
import com.aaprint.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        AppUser user = userService.findByUsername(request.getUsername());

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ResponseEntity.status(401).body(java.util.Map.of("error", "Invalid username or password"));
        }

        Long tenantId = user.getTenant() != null ? user.getTenant().getTenantId() : null;
        String tenantName = user.getTenant() != null ? user.getTenant().getTenantName() : null;
        String tenantLogoUrl = user.getTenant() != null ? user.getTenant().getLogoUrl() : null;

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole().name(), tenantId);

        return ResponseEntity.ok(new LoginResponse(
                token,
                user.getUsername(),
                user.getFullName(),
                user.getRole().name(),
                tenantId,
                tenantName,
                tenantLogoUrl,
                userService.getEffectivePermissions(user)
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader("Authorization") String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(java.util.Map.of("error", "Not authenticated"));
        }

        String token = authHeader.substring(7);
        if (!jwtUtil.isTokenValid(token)) {
            return ResponseEntity.status(401).body(java.util.Map.of("error", "Token expired"));
        }

        String username = jwtUtil.extractUsername(token);
        AppUser user = userService.findByUsername(username);
        if (user == null) {
            return ResponseEntity.status(401).body(java.util.Map.of("error", "User not found"));
        }

        Long tenantId = user.getTenant() != null ? user.getTenant().getTenantId() : null;
        String tenantName = user.getTenant() != null ? user.getTenant().getTenantName() : null;
        String tenantLogoUrl2 = user.getTenant() != null ? user.getTenant().getLogoUrl() : null;

        return ResponseEntity.ok(new LoginResponse(
                null, user.getUsername(), user.getFullName(),
                user.getRole().name(), tenantId, tenantName, tenantLogoUrl2,
                userService.getEffectivePermissions(user)
        ));
    }
}

