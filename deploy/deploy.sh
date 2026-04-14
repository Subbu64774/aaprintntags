#!/bin/bash
# ============================================================
# Deploy/Update script - Run from your local machine
# Builds, transfers, and deploys to your cloud VM
#
# Usage: ./deploy/deploy.sh YOUR_VM_IP [SSH_KEY_PATH]
# Example: ./deploy/deploy.sh 129.154.xx.xx ~/.ssh/oracle-key.pem
# ============================================================
set -e

VM_IP="${1:?Usage: ./deploy/deploy.sh VM_IP [SSH_KEY_PATH]}"
SSH_KEY="${2:-~/.ssh/id_rsa}"
REMOTE_DIR="/opt/aaprintntags"
SSH_USER="ubuntu"
SSH_CMD="ssh -i $SSH_KEY -o StrictHostKeyChecking=no $SSH_USER@$VM_IP"

echo "============================================"
echo "  Deploying to $VM_IP"
echo "============================================"

# Step 1: Sync project files to server
echo "[1/3] Syncing files to server..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'target' \
  --exclude '.git' \
  --exclude '.idea' \
  --exclude '.env' \
  --exclude 'frontend/dist' \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  . $SSH_USER@$VM_IP:$REMOTE_DIR/

# Step 2: Build and deploy on server
echo "[2/3] Building and starting containers on server..."
$SSH_CMD << 'REMOTE_SCRIPT'
cd /opt/aaprintntags

# Create .env if it doesn't exist
if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠️  Created .env from .env.example - please edit with real passwords!"
fi

# Build and start
docker compose -f docker-compose.prod.yml down || true
docker compose -f docker-compose.prod.yml up -d --build

# Wait for startup
echo "Waiting for application to start..."
sleep 15

# Check status
docker compose -f docker-compose.prod.yml ps
REMOTE_SCRIPT

# Step 3: Health check
echo "[3/3] Checking application health..."
sleep 5
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://$VM_IP/ 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo ""
  echo "============================================"
  echo "  ✅ Deployment successful!"
  echo "  🌐 App: http://$VM_IP"
  echo "============================================"
else
  echo ""
  echo "⚠️  App returned HTTP $HTTP_CODE - it may still be starting up."
  echo "  Check logs: $SSH_CMD 'cd /opt/aaprintntags && docker compose -f docker-compose.prod.yml logs -f'"
fi

