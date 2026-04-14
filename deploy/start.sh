#!/bin/sh
set -e

echo "=========================================="
echo "  AA Print N Tags - Starting Application"
echo "=========================================="

# Start nginx in background
echo "[1/2] Starting Nginx (frontend)..."
nginx

# ── JVM Memory Budget (640MB container) ──────────────────
#   Heap (60%):     ~384MB  via MaxRAMPercentage
#   Metaspace:       120MB  (Spring Boot + Hibernate needs ~100-120MB)
#   CodeCache:        48MB
#   JVM overhead:    ~60MB
#   Nginx:           ~20MB
#   Total:          ~632MB  < 640MB  ✓  (minimal swap)
# ─────────────────────────────────────────────────────────
echo "[2/2] Starting Spring Boot (backend)..."
exec java \
  -XX:MaxRAMPercentage=60.0 \
  -XX:InitialRAMPercentage=20.0 \
  -XX:+UseSerialGC \
  -XX:MaxMetaspaceSize=120m \
  -XX:ReservedCodeCacheSize=48m \
  -XX:CompressedClassSpaceSize=32m \
  -XX:+OptimizeStringConcat \
  -Djava.security.egd=file:/dev/./urandom \
  -Dfile.encoding=UTF-8 \
  -Dserver.port=8080 \
  -Dspring.profiles.active=prod \
  -jar /app/app.jar

