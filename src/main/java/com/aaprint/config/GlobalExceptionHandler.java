package com.aaprint.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Converts "no tenantId in JWT" into HTTP 401 so the frontend's
     * axios interceptor clears the token and redirects to /login.
     * This prevents the misleading HTTP 500 that users were seeing.
     */
    @ExceptionHandler(TenantContextException.class)
    public ResponseEntity<Map<String, String>> handleTenantContext(TenantContextException ex) {
        log.warn("Tenant context missing: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", ex.getMessage()));
    }
}

