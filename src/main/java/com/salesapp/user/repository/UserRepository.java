package com.salesapp.user.repository;

import com.salesapp.user.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByUsernameAndActiveTrue(String username);

    Optional<AppUser> findByUsername(String username);

    List<AppUser> findAllByActiveTrueOrderByUsernameAsc();

    List<AppUser> findAllByTenant_TenantIdAndActiveTrueOrderByUsernameAsc(Long tenantId);

    boolean existsByUsername(String username);
}

