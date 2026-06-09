#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════╗
# ║   server-deploy.sh — runs ON the Oracle Cloud VM              ║
# ║   Invoked by the GitHub Actions "deploy" job over SSH.        ║
# ║                                                              ║
# ║   GUARANTEES                                                 ║
# ║    • MySQL runs as a SEPARATE container with a persistent     ║
# ║      named volume. It is created ONCE and NEVER recreated     ║
# ║      or wiped by a deploy → your data is always safe.        ║
# ║    • Only the application container is replaced each deploy.  ║
# ║    • Health check after switch; automatic rollback on fail.  ║
# ╚══════════════════════════════════════════════════════════════╝
set -euo pipefail

# ── Inputs (exported by the GitHub Actions deploy step) ─────────
: "${APP_IMAGE:?APP_IMAGE is required (e.g. ghcr.io/owner/repo:sha)}"
: "${GHCR_USER:?GHCR_USER is required}"
: "${GHCR_TOKEN:?GHCR_TOKEN is required}"
DB_NAME="${DB_NAME:-aaprintntags}"
DB_USER="${DB_USER:-appuser}"
DB_PASSWORD="${DB_PASSWORD:-AppUser@2026!}"
DB_ROOT_PASSWORD="${DB_ROOT_PASSWORD:-StrongP@ss2026!}"
JWT_SECRET="${JWT_SECRET:-4a6f686e446f6553616c65734170704a57545365637265744b65793230323621}"

NETWORK="aaprintnet"
DB_CONTAINER="aaprintntags-db"
DB_VOLUME="mysql_data"
APP_CONTAINER="aaprintntags-app"
LOGOS_VOLUME="app_logos"

echo "━━━ [1/6] Ensuring podman network + volumes ━━━"
sudo podman network exists "$NETWORK" || sudo podman network create "$NETWORK"
sudo podman volume  exists "$DB_VOLUME"    || sudo podman volume create "$DB_VOLUME"
sudo podman volume  exists "$LOGOS_VOLUME" || sudo podman volume create "$LOGOS_VOLUME"

# ───────────────────────────────────────────────────────────────
#  MySQL — created ONCE, never recreated. A deploy must never
#  touch this container or its volume.
# ───────────────────────────────────────────────────────────────
echo "━━━ [2/6] Ensuring separate MySQL instance ━━━"
if sudo podman container exists "$DB_CONTAINER"; then
  # Make sure it is running, but DO NOT recreate it.
  if [ "$(sudo podman inspect -f '{{.State.Running}}' "$DB_CONTAINER")" != "true" ]; then
    echo "   MySQL container exists but is stopped → starting (data preserved)."
    sudo podman start "$DB_CONTAINER"
  else
    echo "   MySQL already running — left untouched (data preserved)."
  fi
else
  echo "   First-time provisioning of MySQL container..."
  sudo podman run -d \
    --name "$DB_CONTAINER" \
    --network "$NETWORK" \
    --restart always \
    -e MYSQL_ROOT_PASSWORD="$DB_ROOT_PASSWORD" \
    -e MYSQL_DATABASE="$DB_NAME" \
    -e MYSQL_USER="$DB_USER" \
    -e MYSQL_PASSWORD="$DB_PASSWORD" \
    -v "${DB_VOLUME}:/var/lib/mysql:Z" \
    --memory=512m \
    docker.io/library/mysql:8.0 \
      --default-authentication-plugin=mysql_native_password \
      --character-set-server=utf8mb4 \
      --collation-server=utf8mb4_unicode_ci \
      --max_connections=50 \
      --innodb_buffer_pool_size=256M \
      --innodb_flush_log_at_trx_commit=2

  echo "   Waiting for MySQL to accept connections..."
  for i in $(seq 1 36); do
    if sudo podman exec "$DB_CONTAINER" mysqladmin ping -h 127.0.0.1 \
         -u root -p"$DB_ROOT_PASSWORD" --silent >/dev/null 2>&1; then
      echo "   ✅ MySQL ready."
      break
    fi
    sleep 5
  done

  # Auto-start MySQL on VM reboot (independent of the app)
  sudo tee /etc/systemd/system/aaprintntags-db.service >/dev/null <<'SVC'
[Unit]
Description=AA Print N Tags MySQL
After=network-online.target
Wants=network-online.target
[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/bin/podman start aaprintntags-db
ExecStop=/usr/bin/podman stop -t 30 aaprintntags-db
[Install]
WantedBy=multi-user.target
SVC
  sudo systemctl daemon-reload && sudo systemctl enable aaprintntags-db.service
fi

# ───────────────────────────────────────────────────────────────
#  Pull the new application image from GHCR
# ───────────────────────────────────────────────────────────────
echo "━━━ [3/6] Pulling new app image: $APP_IMAGE ━━━"
echo "$GHCR_TOKEN" | sudo podman login ghcr.io -u "$GHCR_USER" --password-stdin
sudo podman pull "$APP_IMAGE"

# Remember the currently-running image so we can roll back if needed
PREVIOUS_IMAGE=""
if sudo podman container exists "$APP_CONTAINER"; then
  PREVIOUS_IMAGE="$(sudo podman inspect -f '{{.ImageName}}' "$APP_CONTAINER" 2>/dev/null || true)"
fi

# ───────────────────────────────────────────────────────────────
#  Replace ONLY the application container
# ───────────────────────────────────────────────────────────────
run_app() {
  local image="$1"
  sudo podman rm -f "$APP_CONTAINER" 2>/dev/null || true
  sudo podman run -d \
    --name "$APP_CONTAINER" \
    --network "$NETWORK" \
    --restart always \
    -p 80:80 \
    -e SPRING_DATASOURCE_URL="jdbc:mysql://${DB_CONTAINER}:3306/${DB_NAME}?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Kolkata&characterEncoding=utf8" \
    -e SPRING_DATASOURCE_USERNAME="$DB_USER" \
    -e SPRING_DATASOURCE_PASSWORD="$DB_PASSWORD" \
    -e SPRING_JPA_HIBERNATE_DDL_AUTO=update \
    -e SPRING_JPA_SHOW_SQL=false \
    -e SPRING_PROFILES_ACTIVE=prod \
    -e APP_JWT_SECRET="$JWT_SECRET" \
    -e APP_JWT_EXPIRATION_MS=86400000 \
    -v "${LOGOS_VOLUME}:/app/logos:Z" \
    --memory=640m \
    "$image"
}

echo "━━━ [4/6] Starting new application container ━━━"
run_app "$APP_IMAGE"

# ───────────────────────────────────────────────────────────────
#  Health check with retries; roll back on failure
# ───────────────────────────────────────────────────────────────
echo "━━━ [5/6] Health check ━━━"
HEALTHY=false
for i in $(seq 1 24); do          # up to ~2 minutes
  CODE="$(curl -s -o /dev/null -w '%{http_code}' http://localhost/api/health || echo 000)"
  if [ "$CODE" = "200" ]; then HEALTHY=true; echo "   ✅ Healthy (HTTP 200)"; break; fi
  printf '   waiting for app... %s/24 (HTTP %s)\r' "$i" "$CODE"; sleep 5
done

if [ "$HEALTHY" != "true" ]; then
  echo ""
  echo "❌ New version failed health check. Recent logs:"
  sudo podman logs --tail 40 "$APP_CONTAINER" 2>&1 || true
  if [ -n "$PREVIOUS_IMAGE" ]; then
    echo "↩️  Rolling back to previous image: $PREVIOUS_IMAGE"
    run_app "$PREVIOUS_IMAGE"
  fi
  sudo podman logout ghcr.io >/dev/null 2>&1 || true
  exit 1
fi

# ───────────────────────────────────────────────────────────────
#  Auto-start app on reboot + cleanup
# ───────────────────────────────────────────────────────────────
echo "━━━ [6/6] Finalizing ━━━"
sudo tee /etc/systemd/system/aaprintntags-app.service >/dev/null <<'SVC'
[Unit]
Description=AA Print N Tags Application
After=network-online.target aaprintntags-db.service
Wants=network-online.target
[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/bin/podman start aaprintntags-app
ExecStop=/usr/bin/podman stop -t 30 aaprintntags-app
[Install]
WantedBy=multi-user.target
SVC
sudo systemctl daemon-reload && sudo systemctl enable aaprintntags-app.service

# Free disk: drop dangling images (keeps named tags)
sudo podman image prune -f >/dev/null 2>&1 || true
sudo podman logout ghcr.io >/dev/null 2>&1 || true

echo ""
sudo podman ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo "✅ Deployment complete — app updated, database untouched."

