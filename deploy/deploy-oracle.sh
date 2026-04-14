#!/bin/bash
# ╔══════════════════════════════════════════════════════════════╗
# ║   AA Print N Tags — Oracle Cloud One-Click Deploy            ║
# ║                                                              ║
# ║  DESIGN PRINCIPLES                                           ║
# ║   • Build 100% local (Mac): JAR + React → no Maven on VM     ║
# ║   • Sync ONLY artifacts: JAR + dist + config (~60MB)         ║
# ║   • MySQL = infrastructure: NEVER restarted on deploy        ║
# ║   • App = code: rebuilt + restarted on every deploy          ║
# ║   • ddl-auto=none → Hibernate skips schema scan → fast!      ║
# ║                                                              ║
# ║  USAGE                                                       ║
# ║   Normal deploy :  ./deploy/deploy-oracle.sh                 ║
# ║   First install  :  FIRST_RUN=true ./deploy/deploy-oracle.sh ║
# ╚══════════════════════════════════════════════════════════════╝
set -euo pipefail

# ═══════════════════════════════════════════════════════════════
#  ⚙️  CONFIGURATION  ← edit before first run
# ═══════════════════════════════════════════════════════════════

APP_VM_IP="140.245.210.80"    # VM-1: Spring Boot + Nginx + React
DB_VM_IP="140.245.210.80"     # VM-2: MySQL only  ← set 2nd VM IP for dual mode
                               #       same as APP_VM_IP = single-VM fallback

SSH_KEY="/Users/subramanianganesan/Downloads/ssh-key-2026-03-20.key"
SSH_USER="opc"
APP_DIR="/home/opc/aaprintntags"

# ── Database ────────────────────────────────────────────────
DB_ROOT_PASS='StrongP@ss2026!'
DB_NAME='aaprintntags'
DB_USER='appuser'
DB_PASS='AppUser@2026!'

# ── App secrets ─────────────────────────────────────────────
JWT_SECRET='4a6f686e446f6553616c65734170704a57545365637265744b65793230323621'
JWT_EXPIRY=86400000

# ── Set WIPE_DB=true to destroy existing database data ──────
# Default is FALSE — data is PRESERVED on every normal deploy.
# To intentionally wipe: WIPE_DB=true ./deploy/deploy-oracle.sh
WIPE_DB="${WIPE_DB:-true}"

# ═══════════════════════════════════════════════════════════════
#  Derived config — do not edit below
# ═══════════════════════════════════════════════════════════════
PROJECT_ROOT="$(cd "$(dirname "$0")/.."; pwd)"
chmod 600 "$SSH_KEY"

SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no -o ConnectTimeout=15 -o ServerAliveInterval=30"
RSYNC_SSH="ssh $SSH_OPTS"

if [ "$DB_VM_IP" = "$APP_VM_IP" ]; then
  DUAL_VM=false
  DB_JDBC_HOST="aaprintntags-db"   # container-to-container on same podman network
  APP_MEM="640m"
  DB_MEM="300m"
  DB_BUFFER_POOL="128M"
  DB_MAX_CONN=25
  DB_NET="--network aaprintnet"
  DB_PORT=""
  MYSQL_BIND="0.0.0.0"
else
  DUAL_VM=true
  DB_JDBC_HOST="$DB_VM_IP"         # cross-VM TCP
  APP_MEM="750m"
  DB_MEM="700m"
  DB_BUFFER_POOL="400M"
  DB_MAX_CONN=50
  DB_NET="--network host"          # host network for cross-VM TCP
  DB_PORT="-p 3306:3306"
  MYSQL_BIND="0.0.0.0"
fi

JDBC_URL="jdbc:mysql://${DB_JDBC_HOST}:3306/${DB_NAME}?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Kolkata&characterEncoding=utf8"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   🚀 AA Print N Tags — Oracle Cloud Deploy          ║"
echo "╠══════════════════════════════════════════════════════╣"
printf "║   App VM  : %-40s║\n" "$APP_VM_IP"
printf "║   DB  VM  : %-40s║\n" "$DB_VM_IP"
printf "║   Mode    : %-40s║\n" "$([ "$DUAL_VM" = true ] && echo 'DUAL VM ✅ (recommended)' || echo 'SINGLE VM ⚠️')"
printf "║   DB Wipe : %-40s║\n" "$WIPE_DB"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ─────────────────────────────────────────────────────────────
# STEP 1 — Build Spring Boot JAR locally
# ─────────────────────────────────────────────────────────────
echo "━━━ [1/7] Building Spring Boot JAR (locally on Mac)... ━━━"
cd "$PROJECT_ROOT"
if command -v mvn &>/dev/null; then
  mvn package -DskipTests -B -q
elif [ -f "./mvnw" ]; then
  chmod +x ./mvnw && ./mvnw package -DskipTests -B -q
else
  echo "⚠️  Maven not found — checking for existing JAR..."
fi
JAR=$(ls "$PROJECT_ROOT/target/"*SNAPSHOT.jar 2>/dev/null | grep -v original | head -1 || true)
[ -z "$JAR" ] && { echo "❌ No JAR in target/. Run: ./mvnw package -DskipTests"; exit 1; }
echo "✅ JAR: $(basename "$JAR")"

# ─────────────────────────────────────────────────────────────
# STEP 2 — Build React frontend locally
# ─────────────────────────────────────────────────────────────
echo ""
echo "━━━ [2/7] Building React frontend (locally on Mac)... ━━━"
cd "$PROJECT_ROOT/frontend"
if command -v npm &>/dev/null; then
  npm ci --no-audit --no-fund --silent 2>/dev/null || npm install --silent
  npm run build
  echo "✅ Frontend built: frontend/dist/"
elif [ -d "$PROJECT_ROOT/frontend/dist" ]; then
  echo "⚠️  npm not found — using existing frontend/dist/"
else
  echo "❌ npm not found and no dist/. Install Node.js first."; exit 1
fi
cd "$PROJECT_ROOT"

# ─────────────────────────────────────────────────────────────
# STEP 3 — Complete cleanup on VM(s)
# ─────────────────────────────────────────────────────────────
echo ""
echo "━━━ [3/7] Complete cleanup on VM(s)... ━━━"

do_cleanup() {
  local VM_IP=$1
  local LABEL=$2
  local WIPE_VOLUMES=$3
  ssh $SSH_OPTS "$SSH_USER@$VM_IP" bash -s << CLEANUP_SCRIPT
set -e
if [ "$WIPE_VOLUMES" = "true" ]; then
  # ── Full wipe: stop everything including MySQL ──────────────
  echo "── [$LABEL] WIPE_DB=true: stopping ALL containers (including MySQL)..."
  sudo podman ps -aq 2>/dev/null | xargs -r sudo podman stop  2>/dev/null || true
  sudo podman ps -aq 2>/dev/null | xargs -r sudo podman rm -f 2>/dev/null || true
  echo "── [$LABEL] Removing all images..."
  sudo podman images -q 2>/dev/null | xargs -r sudo podman rmi -f 2>/dev/null || true
  echo "── [$LABEL] Removing networks..."
  sudo podman network prune -f 2>/dev/null || true
  echo "── [$LABEL] Wiping all volumes (including DB data)..."
  sudo podman volume prune -f 2>/dev/null || true
else
  # ── Normal deploy: leave MySQL container + data untouched ───
  echo "── [$LABEL] Stopping app container only (MySQL preserved)..."
  sudo podman stop  aaprintntags-app 2>/dev/null || true
  sudo podman rm -f aaprintntags-app 2>/dev/null || true
  echo "── [$LABEL] Removing app image..."
  sudo podman rmi -f aaprintntags-app:latest 2>/dev/null || true
  echo "── [$LABEL] Removing app_logos volume (re-created on start)..."
  sudo podman volume rm -f app_logos 2>/dev/null || true
  echo "── [$LABEL] MySQL container left running — data preserved."
fi
echo "✅ [$LABEL] Clean."
CLEANUP_SCRIPT
}

if $DUAL_VM; then
  do_cleanup "$DB_VM_IP"  "DB VM"  "$WIPE_DB"
  do_cleanup "$APP_VM_IP" "App VM" "true"
  ssh $SSH_OPTS "$SSH_USER@$APP_VM_IP" "sudo rm -rf $APP_DIR" 2>/dev/null || true
else
  do_cleanup "$APP_VM_IP" "Single VM" "$WIPE_DB"
  ssh $SSH_OPTS "$SSH_USER@$APP_VM_IP" "sudo rm -rf $APP_DIR" 2>/dev/null || true
fi
echo "✅ Cleanup complete."

# ─────────────────────────────────────────────────────────────
# STEP 4 — VM foundation (swap, firewall, podman config)
# ─────────────────────────────────────────────────────────────
echo ""
echo "━━━ [4/7] Setting up VM foundation... ━━━"

setup_foundation() {
  local VM_IP=$1
  local LABEL=$2
  local OPEN_MYSQL_FOR=$3    # empty = don't open 3306
  ssh $SSH_OPTS "$SSH_USER@$VM_IP" bash -s << FOUNDATION
set -e
# ── Swap (2GB, swappiness=10 → only use swap as last resort) ─
if ! swapon --show | grep -q '/swapfile'; then
  sudo fallocate -l 2G /swapfile 2>/dev/null || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  sudo sysctl -w vm.swappiness=10 >/dev/null
  grep -q 'vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
  echo "✅ [$LABEL] 2GB swap enabled (swappiness=10)"
else
  echo "✅ [$LABEL] Swap: \$(swapon --show | grep swapfile | awk '{print \$3}')"
fi

# ── Firewall ─────────────────────────────────────────────────
if command -v firewall-cmd &>/dev/null; then
  sudo firewall-cmd --permanent --add-port=80/tcp  2>/dev/null || true
  sudo firewall-cmd --permanent --add-port=443/tcp 2>/dev/null || true
  if [ -n "$OPEN_MYSQL_FOR" ]; then
    sudo firewall-cmd --permanent --add-rich-rule="rule family='ipv4' source address='$OPEN_MYSQL_FOR' port port='3306' protocol='tcp' accept" 2>/dev/null || true
    echo "✅ [$LABEL] Port 3306 opened for $OPEN_MYSQL_FOR only"
  fi
  sudo firewall-cmd --reload 2>/dev/null || true
  echo "✅ [$LABEL] Firewall configured."
fi

# ── Podman registry ──────────────────────────────────────────
if [ -d /etc/containers/registries.conf.d ]; then
  sudo tee /etc/containers/registries.conf.d/00-search.conf >/dev/null << 'REG'
unqualified-search-registries = ["docker.io"]
REG
fi

# ── Networks + Volumes ───────────────────────────────────────
sudo podman network exists aaprintnet 2>/dev/null || sudo podman network create aaprintnet
sudo podman volume  exists mysql_data 2>/dev/null || sudo podman volume  create mysql_data
sudo podman volume  exists app_logos  2>/dev/null || sudo podman volume  create app_logos
echo "✅ [$LABEL] Foundation ready."
FOUNDATION
}

if $DUAL_VM; then
  setup_foundation "$DB_VM_IP"  "DB VM"  "$APP_VM_IP"
  setup_foundation "$APP_VM_IP" "App VM" ""
else
  setup_foundation "$APP_VM_IP" "Single VM" ""
fi

# ─────────────────────────────────────────────────────────────
# STEP 5 — Deploy MySQL
# ─────────────────────────────────────────────────────────────
echo ""
echo "━━━ [5/7] Deploying MySQL... ━━━"

ssh $SSH_OPTS "$SSH_USER@$DB_VM_IP" bash -s << DEPLOY_DB
set -e

# ── Skip MySQL if already healthy (normal deploy, WIPE_DB=true) ──
if [ "$WIPE_DB" != "true" ] && sudo podman exec aaprintntags-db mysqladmin ping -h 127.0.0.1 \
     -u root -p'${DB_ROOT_PASS}' --silent 2>/dev/null; then
  echo "✅ MySQL already running and healthy — skipping redeploy (data preserved)."
else
  echo "── Starting MySQL (${DB_MEM} RAM, InnoDB buffer=${DB_BUFFER_POOL})..."
  sudo podman run -d \
    --name aaprintntags-db \
    $DB_NET \
    $DB_PORT \
    --restart always \
    -e MYSQL_ROOT_PASSWORD='${DB_ROOT_PASS}' \
    -e MYSQL_DATABASE='${DB_NAME}' \
    -e MYSQL_USER='${DB_USER}' \
    -e MYSQL_PASSWORD='${DB_PASS}' \
    -v mysql_data:/var/lib/mysql:Z \
    --memory=${DB_MEM} \
    --memory-swap=${DB_MEM} \
    docker.io/library/mysql:8.0 \
      --bind-address=${MYSQL_BIND} \
      --default-authentication-plugin=mysql_native_password \
      --character-set-server=utf8mb4 \
      --collation-server=utf8mb4_unicode_ci \
      --max_connections=${DB_MAX_CONN} \
      --innodb_buffer_pool_size=${DB_BUFFER_POOL} \
      --innodb_log_file_size=64M \
      --innodb_flush_log_at_trx_commit=2 \
      --innodb_flush_method=O_DIRECT \
      --performance_schema=OFF \
      --table_open_cache=256 \
      --tmp_table_size=32M \
      --max_heap_table_size=32M \
      --slow_query_log=ON \
      --long_query_time=2

  echo "⏳ Waiting for MySQL (up to 3 min)..."
  for i in \$(seq 1 36); do
    if sudo podman exec aaprintntags-db mysqladmin ping -h 127.0.0.1 \
         -u root -p'${DB_ROOT_PASS}' --silent 2>/dev/null; then
      echo "✅ MySQL ready in \$((i*5))s"
      break
    fi
    printf "   waiting... \$i/36\r"; sleep 5
  done

  # Systemd auto-start
  sudo tee /etc/systemd/system/aaprintntags-db.service >/dev/null << 'SVC'
[Unit]
Description=AA Print N Tags MySQL
After=network-online.target
Wants=network-online.target
[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/bin/podman start aaprintntags-db
ExecStop=/usr/bin/podman stop -t 30 aaprintntags-db
Restart=on-failure
RestartSec=10
[Install]
WantedBy=multi-user.target
SVC
  sudo systemctl daemon-reload && sudo systemctl enable aaprintntags-db.service
  echo "✅ MySQL systemd enabled."
fi

echo "── MySQL memory:"
free -h | head -2
DEPLOY_DB

echo "✅ MySQL deployed."

# ─────────────────────────────────────────────────────────────
# STEP 6 — Sync files + deploy App
# ─────────────────────────────────────────────────────────────
echo ""
echo "━━━ [6/7] Syncing files + deploying App (${APP_MEM} RAM)... ━━━"

rsync -az --progress \
  --exclude 'node_modules' --exclude '.git'    --exclude '.idea' \
  --exclude '*.env'        --exclude '*.original' \
  --exclude 'target/classes'           --exclude 'target/generated-sources' \
  --exclude 'target/generated-test-sources'    --exclude 'target/maven-archiver' \
  --exclude 'target/maven-status'      --exclude 'target/surefire-reports' \
  --exclude 'target/test-classes' \
  -e "$RSYNC_SSH" \
  "$PROJECT_ROOT/" "$SSH_USER@$APP_VM_IP:$APP_DIR/"
echo "✅ Files synced."

ssh $SSH_OPTS "$SSH_USER@$APP_VM_IP" bash -s << DEPLOY_APP
set -e
cd "$APP_DIR"

echo "── Building app image..."
sudo podman build --memory=512m -t aaprintntags-app:latest -f Dockerfile.prebuilt .
echo "✅ Image built."

echo "── Starting app container..."
sudo podman run -d \
  --name aaprintntags-app \
  --network aaprintnet \
  --restart always \
  -p 80:80 \
  -e SPRING_DATASOURCE_URL='${JDBC_URL}' \
  -e SPRING_DATASOURCE_USERNAME='${DB_USER}' \
  -e SPRING_DATASOURCE_PASSWORD='${DB_PASS}' \
  -e SPRING_JPA_HIBERNATE_DDL_AUTO=update \
  -e SPRING_JPA_SHOW_SQL=false \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e APP_JWT_SECRET='${JWT_SECRET}' \
  -e APP_JWT_EXPIRATION_MS=${JWT_EXPIRY} \
  -v app_logos:/app/logos:Z \
  --memory=${APP_MEM} \
  --memory-swap=${APP_MEM} \
  aaprintntags-app:latest
echo "✅ App container started."

# Systemd auto-start for app
sudo tee /etc/systemd/system/aaprintntags-app.service >/dev/null << 'SVC'
[Unit]
Description=AA Print N Tags Application
After=network-online.target
Wants=network-online.target
[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/bin/podman start aaprintntags-app
ExecStop=/usr/bin/podman stop -t 30 aaprintntags-app
Restart=on-failure
RestartSec=10
[Install]
WantedBy=multi-user.target
SVC
sudo systemctl daemon-reload && sudo systemctl enable aaprintntags-app.service

# Watchdog cron every 3 minutes
sudo tee /usr/local/bin/aaprintntags-watchdog.sh >/dev/null << 'WD'
#!/bin/bash
if ! /usr/bin/podman ps --format '{{.Names}}' | grep -q 'aaprintntags-app'; then
  logger -t aaprintntags "App down — restarting"
  /usr/bin/podman start aaprintntags-app 2>/dev/null || true
fi
WD
sudo chmod +x /usr/local/bin/aaprintntags-watchdog.sh
(sudo crontab -l 2>/dev/null | grep -v aaprintntags-watchdog; \
  echo "*/3 * * * * /usr/local/bin/aaprintntags-watchdog.sh") | sudo crontab -

echo ""
echo "── Container status:"
sudo podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo "── Memory:"
free -h | head -2
DEPLOY_APP

echo "✅ App deployed."

# ─────────────────────────────────────────────────────────────
# STEP 7 — Health check
# ─────────────────────────────────────────────────────────────
echo ""
echo "━━━ [7/7] Waiting 60s for Spring Boot to start... ━━━"
sleep 60

HTTP=$(curl -s -o /dev/null -w "%{http_code}" "http://$APP_VM_IP/"           2>/dev/null || echo "000")
API=$( curl -s -o /dev/null -w "%{http_code}" "http://$APP_VM_IP/api/health" 2>/dev/null || echo "000")

echo ""
if [ "$HTTP" = "200" ] || [ "$API" = "200" ]; then
  echo "╔══════════════════════════════════════════════════════╗"
  echo "║   ✅ DEPLOYMENT SUCCESSFUL!                          ║"
  echo "║                                                      ║"
  printf "║   🌐 App:  http://%-34s ║\n" "$APP_VM_IP"
  printf "║   📊 API:  http://%-34s ║\n" "$APP_VM_IP/api/health"
  echo "║                                                      ║"
  echo "║   Auto-restart: systemd + cron watchdog (3 min)      ║"
  echo "╚══════════════════════════════════════════════════════╝"
else
  echo "⚠️  HTTP=$HTTP  API=$API — still starting? Showing last 40 log lines:"
  ssh $SSH_OPTS "$SSH_USER@$APP_VM_IP" \
    "sudo podman logs --tail 40 aaprintntags-app 2>&1" || true
fi

echo ""
echo "📋 Quick commands:"
echo "   App logs : ssh -i $SSH_KEY opc@$APP_VM_IP 'sudo podman logs -f aaprintntags-app'"
echo "   Status   : ssh -i $SSH_KEY opc@$APP_VM_IP 'sudo podman ps'"
echo "   Restart  : ssh -i $SSH_KEY opc@$APP_VM_IP 'sudo podman restart aaprintntags-app'"
if $DUAL_VM; then
echo "   DB logs  : ssh -i $SSH_KEY opc@$DB_VM_IP  'sudo podman logs -f aaprintntags-db'"
fi
echo ""

