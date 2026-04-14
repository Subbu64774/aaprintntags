#!/bin/bash
# ============================================================
# Quick helper for Oracle Cloud VM operations
#
# Usage:
#   ./deploy/oracle-vm.sh status     — Show container status
#   ./deploy/oracle-vm.sh logs       — Tail app logs
#   ./deploy/oracle-vm.sh logs-db    — Tail database logs
#   ./deploy/oracle-vm.sh restart    — Restart all containers
#   ./deploy/oracle-vm.sh stop       — Stop all containers
#   ./deploy/oracle-vm.sh start      — Start all containers
#   ./deploy/oracle-vm.sh fix        — Quick fix: recreate app container
#   ./deploy/oracle-vm.sh ssh        — Open SSH session
#   ./deploy/oracle-vm.sh rebuild    — Full rebuild + deploy
#   ./deploy/oracle-vm.sh mysql-port — Open MySQL port for Workbench
# ============================================================

VM_IP="140.245.210.80"
SSH_KEY="/Users/subramanianganesan/Downloads/ssh-key-2026-03-20.key"
SSH_USER="opc"
SSH_CMD="ssh -i $SSH_KEY -o StrictHostKeyChecking=no $SSH_USER@$VM_IP"
PROJECT_ROOT="$(cd "$(dirname "$0")/.."; pwd)"

# Fix key permissions silently
chmod 600 "$SSH_KEY" 2>/dev/null

ACTION="${1:-status}"

case "$ACTION" in
  status)
    echo "📊 Container Status:"
    $SSH_CMD "sudo podman ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
    echo ""
    echo "💾 Disk:"
    $SSH_CMD "df -h / | tail -1"
    echo ""
    echo "🧠 Memory:"
    $SSH_CMD "free -h | head -2"
    echo ""
    echo "🔁 Swap:"
    $SSH_CMD "swapon --show 2>/dev/null || echo 'No swap'"
    ;;

  logs)
    echo "📜 App logs (Ctrl+C to exit):"
    $SSH_CMD "sudo podman logs -f --tail 150 aaprintntags-app"
    ;;

  logs-db)
    echo "📜 Database logs (Ctrl+C to exit):"
    $SSH_CMD "sudo podman logs -f --tail 100 aaprintntags-db"
    ;;

  restart)
    echo "🔄 Restarting containers..."
    $SSH_CMD "sudo podman restart aaprintntags-db 2>/dev/null || sudo podman start aaprintntags-db; sleep 15; sudo podman restart aaprintntags-app 2>/dev/null || sudo podman start aaprintntags-app"
    echo "✅ Restarted. Waiting 30s for startup..."
    sleep 30
    $SSH_CMD "sudo podman ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
    ;;

  stop)
    echo "⏹ Stopping containers..."
    $SSH_CMD "sudo podman stop aaprintntags-app 2>/dev/null || true; sudo podman stop aaprintntags-db 2>/dev/null || true"
    echo "✅ Stopped."
    ;;

  start)
    echo "▶️ Starting containers..."
    $SSH_CMD "sudo podman start aaprintntags-db; sleep 15; sudo podman start aaprintntags-app"
    echo "✅ Started. App available at http://$VM_IP in ~40s"
    ;;

  fix)
    # Quick fix: rebuild and restart the app container without touching MySQL
    echo "🔧 Quick Fix: Rebuilding app container on VM (no Maven/npm build)..."
    echo "   This uses the pre-built JAR + frontend already synced to the VM."
    echo ""

    # First sync latest files
    echo "── Syncing latest files..."
    rsync -az \
      --exclude 'node_modules' --exclude '.git' --exclude '.idea' \
      --exclude 'target/aaprintntags-0.0.1-SNAPSHOT.jar.original' \
      --exclude 'target/classes' --exclude 'target/generated-sources' \
      --exclude 'target/generated-test-sources' --exclude 'target/maven-archiver' \
      --exclude 'target/maven-status' --exclude 'target/surefire-reports' \
      --exclude 'target/test-classes' \
      -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
      "$PROJECT_ROOT/" "$SSH_USER@$VM_IP:/home/opc/aaprintntags/"
    echo "✅ Files synced."

    $SSH_CMD << 'FIXSCRIPT'
set -e
cd /home/opc/aaprintntags

echo "── Stopping old app container..."
sudo podman stop aaprintntags-app 2>/dev/null || true
sudo podman rm -f aaprintntags-app 2>/dev/null || true
sudo podman rmi -f aaprintntags-app:latest 2>/dev/null || true

echo "── Ensuring MySQL is running..."
sudo podman start aaprintntags-db 2>/dev/null || true
sleep 5

echo "── Building lightweight image (Dockerfile.prebuilt)..."
sudo podman build --memory=512m -t aaprintntags-app:latest -f Dockerfile.prebuilt .

echo "── Starting app container..."
sudo podman run -d \
  --name aaprintntags-app \
  --network aaprintnet \
  --restart always \
  -p 80:80 \
  -e SPRING_DATASOURCE_URL='jdbc:mysql://aaprintntags-db:3306/aaprintntags?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC' \
  -e SPRING_DATASOURCE_USERNAME=appuser \
  -e SPRING_DATASOURCE_PASSWORD='AppUser@2026!' \
  -e SPRING_JPA_HIBERNATE_DDL_AUTO=update \
  -e SPRING_JPA_SHOW_SQL=false \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e APP_JWT_SECRET='4a6f686e446f6553616c65734170704a57545365637265744b65793230323621' \
  -e APP_JWT_EXPIRATION_MS=86400000 \
  -v app_logos:/app/logos:Z \
  --memory=512m \
  aaprintntags-app:latest

echo ""
echo "── Container Status:"
sudo podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo "── Memory:"
free -h | head -2
FIXSCRIPT

    echo ""
    echo "✅ Fix applied! Waiting 45s for Spring Boot to start..."
    sleep 45
    HTTP=$(curl -s -o /dev/null -w "%{http_code}" "http://$VM_IP/" 2>/dev/null || echo "000")
    echo "🌐 http://$VM_IP → HTTP $HTTP"
    if [ "$HTTP" != "200" ]; then
      echo "   Still starting? Check: ./deploy/oracle-vm.sh logs"
    fi
    ;;

  mysql-port)
    # Open MySQL port 3306 on the VM firewall for Workbench access
    echo "🔓 Opening MySQL port 3306 on VM firewall..."
    echo "⚠️  WARNING: This exposes MySQL to the internet!"
    echo "   Use SSH tunnel instead for production (safer)."
    echo ""
    $SSH_CMD << 'MYSQLPORT'
sudo firewall-cmd --permanent --add-port=3306/tcp
sudo firewall-cmd --reload
echo "✅ Port 3306 opened in OS firewall."
echo "⚠️  Also open port 3306 in Oracle Cloud Security List!"
echo "   OCI Console → Networking → VCN → Security List → Add Ingress Rule → Port 3306"
MYSQLPORT
    ;;

  ssh)
    echo "🔑 Opening SSH session..."
    exec $SSH_CMD
    ;;

  rebuild)
    echo "🏗 Full rebuild & deploy..."
    exec "$(dirname "$0")/deploy-oracle.sh"
    ;;

  *)
    echo "Usage: $0 {status|logs|logs-db|restart|stop|start|fix|ssh|rebuild|mysql-port}"
    exit 1
    ;;
esac

