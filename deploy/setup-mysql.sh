#!/bin/bash
# ============================================================
# setup-mysql.sh  — Run ONCE on first server setup.
# Creates the persistent MySQL container + shared network.
# NEVER run this again unless you intentionally want to
# recreate MySQL from scratch (DATA WILL BE LOST).
# ============================================================
set -e

echo "=============================="
echo " MySQL One-Time Setup"
echo "=============================="

# 1. Create shared app network (idempotent)
echo "[1] Creating shared network 'aaprintntags-net'..."
podman network inspect aaprintntags-net >/dev/null 2>&1 && \
  echo "  Network already exists — skipping." || \
  podman network create aaprintntags-net
echo "  OK"

# 2. Create named volume (idempotent)
echo "[2] Ensuring named volume 'mysql_data' exists..."
podman volume inspect mysql_data >/dev/null 2>&1 && \
  echo "  Volume already exists — skipping." || \
  podman volume create mysql_data
echo "  OK"

# 3. Create MySQL container (only if it doesn't already exist)
if podman inspect mysql >/dev/null 2>&1; then
  echo "[3] MySQL container already exists — skipping creation."
  echo "  Connecting to aaprintntags-net (if needed)..."
  podman network connect aaprintntags-net mysql 2>/dev/null || true
else
  echo "[3] Starting MySQL container..."
  podman run -d \
    --name mysql \
    --network aaprintntags-net \
    -e MYSQL_ROOT_PASSWORD=Aaprint@2024 \
    -e MYSQL_DATABASE=aaprintntags \
    -p 127.0.0.1:3306:3306 \
    -v mysql_data:/var/lib/mysql \
    --restart=always \
    docker.io/library/mysql:8.0 \
    --character-set-server=utf8mb4 \
    --collation-server=utf8mb4_unicode_ci
  echo "  MySQL container started."
fi

echo "[4] Waiting 20s for MySQL to initialise..."
sleep 20

echo "[5] Verifying MySQL is up..."
podman exec mysql mysqladmin ping -uroot -pAaprint@2024 --silent && \
  echo "  MySQL is READY" || \
  echo "  MySQL still initialising — wait a minute and check: podman logs mysql"

echo ""
echo "=============================="
echo " MySQL setup complete."
echo " Now run: bash deploy_aaprintntags.sh"
echo "=============================="

