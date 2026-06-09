package com.salesapp.config;

public class TenantContext {

    private static final ThreadLocal<Long> TENANT_ID = new ThreadLocal<>();
    private static final ThreadLocal<Long> PRODUCTION_UNIT_ID = new ThreadLocal<>();

    public static void setTenantId(Long tenantId) {
        TENANT_ID.set(tenantId);
    }

    public static Long getTenantId() {
        return TENANT_ID.get();
    }

    public static void setProductionUnitId(Long productionUnitId) {
        PRODUCTION_UNIT_ID.set(productionUnitId);
    }

    public static Long getProductionUnitId() {
        return PRODUCTION_UNIT_ID.get();
    }

    public static void clear() {
        TENANT_ID.remove();
        PRODUCTION_UNIT_ID.remove();
    }
}

