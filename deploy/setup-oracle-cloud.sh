#!/bin/bash
# ============================================================
# Oracle Cloud Free Tier - Server Setup Script
# Run this on your Oracle Cloud VM after SSH-ing in
#
# Usage: ssh -i your-key.pem ubuntu@YOUR_VM_IP
#        chmod +x deploy/setup-oracle-cloud.sh
#        sudo ./deploy/setup-oracle-cloud.sh
# ============================================================
set -e

echo "============================================"
echo "  AA Print N Tags - Oracle Cloud Setup"
echo "============================================"

# Update system
echo "[1/6] Updating system packages..."
apt-get update && apt-get upgrade -y

# Install Docker
echo "[2/6] Installing Docker..."
apt-get install -y ca-certificates curl gnupg lsb-release
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Enable Docker for ubuntu user
usermod -aG docker ubuntu

# Install Docker Compose
echo "[3/6] Installing Docker Compose..."
apt-get install -y docker-compose-plugin

# Open firewall ports
echo "[4/6] Configuring firewall..."
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
netfilter-persistent save

# Create app directory
echo "[5/6] Creating application directory..."
mkdir -p /opt/aaprintntags
chown ubuntu:ubuntu /opt/aaprintntags

# Install Certbot for free SSL (optional)
echo "[6/6] Installing Certbot for SSL..."
apt-get install -y certbot python3-certbot-nginx || true

echo ""
echo "============================================"
echo "  ✅ Server setup complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Upload your project: scp -r ./* ubuntu@YOUR_IP:/opt/aaprintntags/"
echo "  2. SSH in: ssh ubuntu@YOUR_IP"
echo "  3. cd /opt/aaprintntags"
echo "  4. cp .env.example .env && nano .env  (edit passwords)"
echo "  5. docker compose -f docker-compose.prod.yml up -d --build"
echo "  6. Access: http://YOUR_IP"
echo ""
echo "For SSL (after pointing domain to IP):"
echo "  certbot --nginx -d yourdomain.com"
echo ""

