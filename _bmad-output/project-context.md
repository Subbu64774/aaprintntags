---
project_name: 'aaprintntags'
user_name: 'Subramanianganesan'
date: '2026-06-10'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'code_quality', 'workflow_rules', 'critical_rules', 'cicd_deployment']
existing_patterns_found: 9
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

### Backend
- **Java 17** (Eclipse Temurin)
- **Spring Boot 3.4.4** (parent POM)
- **Spring Data JPA** (Hibernate, MySQL8Dialect)
- **Spring Security** (stateless JWT auth)
- **jjwt 0.12.6** (JWT token generation/validation)
- **Lombok** (annotation processing via maven-compiler-plugin)
- **MySQL 8** (production database)
- **HikariCP** (connection pool, max 10, min idle 5)
- **Maven** (wrapper: `./mvnw`)

### Frontend
- **React 19.2.4**
- **Ant Design (antd) 6.3.0** — primary UI component library
- **@ant-design/charts 2.6.7** — charting
- **@ant-design/icons 6.1.0**
- **React Router DOM 7.13.0** — client-side routing
- **Axios 1.13.5** — HTTP client (via centralized `api/index.js`)
- **jsPDF 4.2.0 + jspdf-autotable 5.0.7** — PDF generation
- **html2canvas 1.4.1** — screenshot/PDF support
- **Vite 7.3.1** — build tool + dev server
- **@vitejs/plugin-react 5.1.4**

### Deployment
- **CI/CD**: GitHub Actions (`.github/workflows/deploy.yml`) — builds on every push to `main`
- **Registry**: GitHub Container Registry (GHCR) — `ghcr.io/subbu64774/aaprintntags`
- **Host**: Oracle Cloud Always-Free ARM VM (Oracle Linux 9), `140.245.210.80`
- **Runtime**: **Podman** containers (NOT Docker daemon) — `sudo podman` on the VM
- **Docker image**: multi-stage `Dockerfile` (JDK17 build → Node 20 build → JRE17 + Nginx)
- **Nginx** — serves frontend static files, reverse proxies `/api` + `/logos` to Spring Boot
- Port 80 (HTTP, redirects) + 443 (HTTPS) → proxy to port 8080 (Spring Boot) inside the container
- **HTTPS**: Let's Encrypt cert for `140-245-210-80.sslip.io` (sslip.io maps the hostname to the IP; no domain purchase). Public URL: **https://140-245-210-80.sslip.io**
- **Database**: separate `aaprintntags-db` Podman container (MySQL 8) with persistent volume `mysql_data` — never recreated on deploy


---

## Critical Implementation Rules

### Multi-Tenancy Architecture (MOST CRITICAL)

- **TenantContext** uses `ThreadLocal<Long>` for `tenantId` and `productionUnitId`
- The `JwtAuthFilter` extracts `tenantId` from JWT claims and sets it on `TenantContext` per request
- `TenantContext.clear()` is called in the finally block after every request — NEVER skip this
- **Every service method** MUST call `TenantContext.getTenantId()` and filter queries by tenant
- **Every repository query** for tenant-scoped data MUST include `tenantId` in WHERE clause
- If `TenantContext.getTenantId()` is null, throw `TenantContextException` — never proceed without tenant
- Pattern: Services have a private `tenantId()` helper that does the null-check

### Authentication & Authorization

- JWT token contains: `sub` (username), `role` (ADMIN/MANAGER/STAFF/VIEWER), `tenantId`
- Roles: **ADMIN** (cross-tenant, full access), **MANAGER** (tenant-level full access), **STAFF** (permission-based), **VIEWER** (read-only)
- Legacy "USER" role maps to "STAFF" for backward compatibility
- Spring Security uses `ROLE_` prefix convention (`ROLE_ADMIN`, `ROLE_MANAGER`, etc.)
- Public endpoints: `/api/auth/**`, `/api/health`, `/logos/**`
- Tenant management: ADMIN only (`/api/tenants/**`)
- User management: ADMIN or MANAGER (`/api/users/**`)
- All other `/api/**`: authenticated required

### Backend Package-by-Feature Structure

```
com.aaprint.{module}/
  ├── controller/{Module}RestController.java
  ├── service/{Module}Service.java
  ├── entity/{Module}.java
  ├── dto/{Module}DTO.java
  ├── repository/{Module}Repository.java
  └── exception/{Module}NotFoundException.java (optional)
```

Modules: `tenant`, `order`, `customer`, `product`, `invoice`, `quote`, `payment`, `employee`, `productionunit`, `report`, `user`, `home/dashboard`
Config: `com.aaprint.config` (security, web, tenant context, exception handler, data seeder)

### Backend Coding Conventions

- All controllers are `@RestController` with `@RequestMapping("/api/{plural-noun}")`
- Use `@RequiredArgsConstructor` (Lombok) for constructor injection — NO `@Autowired`
- Use `ResponseEntity<T>` return types with explicit HTTP status codes
- Use SLF4J `Logger` with `LoggerFactory.getLogger(ClassName.class)` — not `@Slf4j`
- Soft delete pattern: entities have `deleted` boolean, use `setDeletedById()` repository method
- Timestamp fields: `createdAt`, `updatedAt` using `LocalDateTime.now()`
- Audit fields: `createdBy`, `updatedBy` (currently "SYSTEM")
- Pagination: Spring `Pageable` with `page` and `size` query params
- Validation: `@Valid @RequestBody` on POST/PUT endpoints
- Manual DTO ↔ Entity mapping via `convertToDTO()` private methods (no MapStruct)

### Frontend Architecture

- **Single API instance** in `frontend/src/api/index.js` — always import from there
- Axios interceptor adds `Bearer {token}` from localStorage automatically
- On 401 response: token cleared, redirect to `/login`
- **AuthContext** (`useAuth()`) provides: `user`, `login`, `logout`, `isAdmin`, `isManager`, `hasPerm()`
- Permission check: `hasPerm('module:action')` format (e.g., `'customers:edit'`, `'orders:view'`)
- ADMIN and MANAGER always return `true` for `hasPerm()` — only STAFF/VIEWER are restricted

### Frontend File Conventions

```
frontend/src/pages/{module}/
  ├── {Module}ListPage.jsx     — table with pagination, search
  ├── {Module}FormPage.jsx     — create/edit form (shared)
  └── {Module}ViewPage.jsx     — detail view
```

- Use Ant Design components exclusively (Button, Table, Form, Input, Modal, message, etc.)
- Use `useNavigate()` and `useLocation()` from react-router-dom
- Responsive: `Grid.useBreakpoint()` with `!screens.lg` check for mobile
- Page transitions: wrap content in `<div className="page-transition">`

### Frontend State & Data Patterns

- No global state library — use React Context (AuthContext) + local state
- Data fetching: `useEffect` + `useState` + `api.get()`/`api.post()` directly in pages
- Loading states: Ant Design `<Spin spinning={loading}>` wrapper
- Error feedback: `message.success()` / `message.error()` from antd
- Tables use server-side pagination: pass `page` and `size` params to API

### Invoice Print Template (GST Format)

- The invoice uses a **formal Indian GST invoice format** (bordered table-based layout)
- Located at `frontend/src/pages/invoices/InvoicePrintTemplate.jsx`
- Structure follows: INVOICE title → Header (logo/company/contact) → Meta (Invoice No, Date, PO) → GSTIN/State Code → Billed To / Shipped To → Line Items Table with per-line CGST/SGST/IGST columns → Bank Details + Totals → Declaration + Signature → Terms
- Line items table has **13 columns**: S.no, Description, HSN/SAC, QTY, Rate, Total Value, Total Taxable Value, CGST Rate, CGST Amt, SGST Rate, SGST Amt, IGST Rate, IGST Amt
- Each line item can have its own GST rates (line-level `cgst`/`sgst`/`igst` on `InvoiceProductDTO`) — falls back to invoice-level GST
- Customer GSTIN (`customerGstNumber`) and phone (`customerPhone`) are included in the DTO and shown in Billed To / Shipped To
- Amount in words uses Indian numbering system (Lakh, Crore)
- The template is rendered via React `forwardRef` for print/PDF capture with `html2canvas`
- A separate `invoicePdfGenerator.js` generates PDFs directly via jsPDF (independent of the print template)

### Vite Dev Server

- Port: 5173
- Proxy `/api` → `http://localhost:8080` (Spring Boot backend)
- Proxy `/logos` → `http://localhost:8080`
- Build output: `frontend/dist/`

---

## Testing Rules

- Backend: Spring Boot Test (`@SpringBootTest`)
- Test location: `src/test/java/com/aaprint/`
- Currently minimal test coverage — when adding tests:
  - Unit test services with mocked repositories
  - Always mock `TenantContext.getTenantId()` in service tests
  - Integration tests should set up tenant context explicitly

---

## Development Workflow Rules

### Running Locally
1. Start MySQL on port 3306, database `aaprintntags`
2. Run Spring Boot: `./mvnw spring-boot:run` (port 8080)
3. Run frontend: `cd frontend && npm run dev` (port 5173)
4. Access app at `http://localhost:5173`

### Building for Production
- Local build (optional): `./mvnw package -DskipTests` → `target/aaprintntags-0.0.1-SNAPSHOT.jar`; `cd frontend && npm run build` → `frontend/dist/`
- Production builds happen in **CI** via the multi-stage `Dockerfile` — you normally never build manually for prod

### CI/CD & Production Deployment Rules (IMPORTANT)
- **Deploy = `git push origin main`.** GitHub Actions builds the image, pushes to GHCR, then SSHes to the Oracle VM and runs `deploy/server-deploy.sh`.
- **NEVER** SSH in and hand-edit containers as the source of truth — all prod changes go through the repo + pipeline (infra-as-code).
- The deploy **only replaces the `aaprintntags-app` container**. The `aaprintntags-db` MySQL container + `mysql_data` volume are NEVER touched on deploy → data is always preserved.
- Health check + **automatic rollback** to the previous image if the new release is unhealthy (`/api/health` must return 200).
- Secrets live in **GitHub Actions secrets** (`ORACLE_SSH_*`, `DB_*`, `JWT_SECRET`) — never commit secrets. `.env`, `*.key`, `*.pem` are gitignored.
- TLS: `deploy/start.sh` auto-enables HTTPS when a cert exists for `$CERT_DOMAIN`; `deploy/server-deploy.sh` auto-publishes 443 + mounts the cert. Cert is provisioned once via `deploy/setup-https.sh` and auto-renews via cron.
- Key deploy files: `.github/workflows/deploy.yml`, `deploy/server-deploy.sh`, `deploy/nginx.conf`, `deploy/nginx-https.conf`, `deploy/start.sh`, `deploy/setup-https.sh`. Setup guide: `docs/CICD_SETUP.md`.

### API URL Pattern
- All REST endpoints: `/api/{resource}` (plural)
- CRUD: GET (list), GET/{id} (detail), POST (create), PUT/{id} (update), DELETE/{id} (soft delete)
- Search endpoints: GET `/api/{resource}/search?q={term}`
- Pagination params: `?page=0&size=10`

---

## Critical Don't-Miss Rules

### NEVER Do These
- ❌ Never query data without filtering by `tenantId` (data leak risk)
- ❌ Never use `@Autowired` field injection — use `@RequiredArgsConstructor`
- ❌ Never hard-delete records — always soft delete (`deleted = true`)
- ❌ Never use a state management library — this project uses plain React state + Context
- ❌ Never use a UI library other than Ant Design — no Material UI, Tailwind, etc.
- ❌ Never create a separate axios instance — always use `import api from '../api'`
- ❌ Never store sensitive data in frontend state beyond the JWT token in localStorage

### ALWAYS Do These
- ✅ Always validate tenant isolation in service layer before returning/modifying data
- ✅ Always use `ResponseEntity` with explicit status codes in controllers
- ✅ Always add SLF4J logging at INFO level for mutations, DEBUG for reads
- ✅ Always use Ant Design's `message` for user feedback (not alert/custom toasts)
- ✅ Always check permissions with `hasPerm()` before rendering edit/delete UI elements
- ✅ Always handle loading/error states in frontend pages
- ✅ Always use `@Transactional` for operations that modify multiple records
