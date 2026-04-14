package com.aaprint.config;

import com.aaprint.tenant.entity.Tenant;
import com.aaprint.tenant.repository.TenantRepository;
import com.aaprint.user.entity.AppUser;
import com.aaprint.user.entity.Role;
import com.aaprint.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);
    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        // Seed admin user
        if (!userRepository.existsByUsername("admin")) {
            AppUser admin = new AppUser();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setFullName("System Admin");
            admin.setEmail("admin@salesapp.com");
            admin.setRole(Role.ADMIN);
            admin.setActive(true);
            admin.setCreatedAt(LocalDateTime.now());
            userRepository.save(admin);
            log.info("Seeded admin user (admin / admin123)");
        }

        // Seed AA PRINT N TAGS tenant
        Tenant aapnt = tenantRepository.findAllByDeletedFalse().stream()
                .filter(t -> "AAPNT".equals(t.getTenantCode()))
                .findFirst().orElse(null);

        if (aapnt == null) {
            aapnt = new Tenant();
            aapnt.setTenantCode("AAPNT");
            aapnt.setTenantName("AA PRINT N TAGS");
            aapnt.setContactPerson("Owner");
            aapnt.setContactEmail("info@aaprintntags.com");
            aapnt.setPhone("9876543210");
            aapnt.setBusinessType("Printing");
            aapnt.setCity("Chennai");
            aapnt.setState("Tamil Nadu");
            aapnt.setCountry("India");
            aapnt.setPlan("PRO");
            aapnt.setActive(true);
            aapnt.setCreatedAt(LocalDateTime.now());
            aapnt.setCreatedBy("SYSTEM");
            aapnt = tenantRepository.save(aapnt);
            log.info("Seeded tenant: AA PRINT N TAGS");
        }

        // Seed a user for AA PRINT N TAGS
        if (!userRepository.existsByUsername("aapnt_user")) {
            AppUser tenantUser = new AppUser();
            tenantUser.setUsername("aapnt_user");
            tenantUser.setPassword(passwordEncoder.encode("user123"));
            tenantUser.setFullName("AA Print User");
            tenantUser.setEmail("user@aaprintntags.com");
            tenantUser.setRole(Role.MANAGER);
            tenantUser.setTenant(aapnt);
            tenantUser.setActive(true);
            tenantUser.setCreatedAt(LocalDateTime.now());
            userRepository.save(tenantUser);
            log.info("Seeded tenant user (aapnt_user / user123)");
        }

        // Seed test data (customers & products) if none exist
        seedTestData(aapnt.getTenantId());
    }

    private void seedTestData(Long tenantId) {
        Integer custCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM customers WHERE tenant_id = ? AND created_by = 'SEED'", Integer.class, tenantId);
        if (custCount != null && custCount > 0) {
            log.info("Test data already exists for tenant {}, skipping", tenantId);
            return;
        }

        try {
            String sql = new String(
                    new ClassPathResource("data-seed.sql").getInputStream().readAllBytes(),
                    StandardCharsets.UTF_8);

            // Replace :tid placeholder with actual tenant ID
            sql = sql.replace(":tid", String.valueOf(tenantId));

            // Execute each statement
            for (String stmt : sql.split(";")) {
                String trimmed = stmt.trim();
                if (!trimmed.isEmpty() && !trimmed.startsWith("--")) {
                    jdbcTemplate.execute(trimmed);
                }
            }
            log.info("Seeded test customers & products for tenant {}", tenantId);
        } catch (Exception e) {
            log.warn("Could not seed test data: {}", e.getMessage());
        }
    }
}
