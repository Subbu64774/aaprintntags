# ============================================
# Multi-stage Dockerfile for Spring Boot Backend + React Frontend
# ============================================

# --- Stage 1: Build the Spring Boot JAR ---
FROM docker.io/eclipse-temurin:17-jdk-alpine AS backend-build
WORKDIR /app

# Copy only what's necessary first to leverage caching
COPY pom.xml mvnw ./
COPY .mvn .mvn

# Pre-fetch deps for faster repeated builds
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Now copy sources and build
COPY src ./src
RUN ./mvnw package -DskipTests -B

# --- Stage 2: Build the React Frontend ---
FROM docker.io/node:20-alpine AS frontend-build
WORKDIR /app

# ✅ Give Node more heap (tune to 1024 on small VMs)
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Copy manifest first for better caching
COPY frontend/package.json frontend/package-lock.json* ./

# ✅ Deterministic + typically lighter
RUN npm ci --no-audit --no-fund

# Copy the rest and build
COPY frontend/ ./

# Optional: if you want to reduce memory usage further during build, disable source maps
# ENV VITE_SOURCEMAP=false
RUN npm run build

# --- Stage 3: Production Image ---
FROM docker.io/eclipse-temurin:17-jre-alpine
WORKDIR /app

# Install nginx
RUN apk add --no-cache nginx wget

# Copy backend JAR
COPY --from=backend-build /app/target/*.jar app.jar

# Copy frontend build to nginx
COPY --from=frontend-build /app/dist /usr/share/nginx/html

# Copy nginx config and startup script
COPY deploy/nginx.conf /etc/nginx/http.d/default.conf
COPY deploy/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose nginx port (serves UI and (optionally) proxies API to backend)
EXPOSE 80

# 🔎 HEALTHCHECK:
# If nginx proxies /api/health to the backend, keep it on port 80:
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost/api/health || exit 1

# If you do NOT proxy /api/health via nginx, instead probe the Spring Boot port:
# (uncomment this and remove the one above; also expose 8080 if you want it reachable externally)
# HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
#   CMD wget -qO- http://localhost:8080/api/health || exit 1

CMD ["/app/start.sh"]