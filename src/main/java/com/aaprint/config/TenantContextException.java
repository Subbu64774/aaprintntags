package com.aaprint.config;

/**
 * Thrown when a tenant-scoped API is called without a tenantId in the JWT.
 * Mapped to HTTP 401 by GlobalExceptionHandler so the frontend clears
 * the token and redirects to the login page automatically.
 */
public class TenantContextException extends RuntimeException {
    public TenantContextException() {
        super("Tenant context not set. Please log in with a tenant-scoped account.");
    }
}

