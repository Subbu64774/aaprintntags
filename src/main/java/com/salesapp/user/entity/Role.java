package com.salesapp.user.entity;

public enum Role {
    ADMIN,      // Product Owner / Super Admin — full system access, can create tenants
    MANAGER,    // Tenant MD / Admin — full access within tenant, can create users
    STAFF,      // Tenant user — can view + create + edit (governed by permissions)
    VIEWER      // Tenant user — view-only (governed by permissions)
}

