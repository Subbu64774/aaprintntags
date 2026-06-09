#!/bin/bash
# ╔══════════════════════════════════════════════════════════════╗
# ║   AA Print N Tags — Enable HTTPS (Let's Encrypt)             ║
# ║                                                              ║
# ║  Issues a real, browser-trusted TLS certificate for the      ║
# ║  sslip.io hostname that maps to the VM public IP — no         ║
# ║  domain purchase required — then relaunches the app container ║
# ║  on port 443 and installs an auto-renewal cron job.          ║
# ║                                                              ║
# ║  USAGE:  ./deploy/setup-https.sh                              ║
# ╚══════════════════════════════════════════════════════════════╝
set -euo pipefail

VM_IP="140.245.210.80"
DOMAIN="140-245-210-80.sslip.io"      # sslip.io → resolves to VM_IP automatically
LE_EMAIL="admin@${DOMAIN}"            # used only for expiry notices
SSH_KEY="/Users/subramanianganesan/Downloads/ssh-key-2026-03-20.key"
SSH_USER="opc"
PROJECT_ROOT="$(cd "$(dirname "$0")/.."; pwd)"

chmod 600 "$SSH_KEY" 2>/dev/null || true
SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no -o ConnectTimeout=15"
SSH_CMD="ssh $SSH_OPTS $SSH_USER@$VM_IP"

echo "╔══════════════════════════════════════════════════════╗"
echo "║   🔒 Enabling HTTPS for AA Print N Tags             ║"
echo "╠══════════════════════════════════════════════════════╣"
printf  "║   Host : %-44s║\n" "$DOMAIN"
printf  "║   IP   : %-44s║\n" "$VM_IP"
echo "╚══════════════════════════════════════════════════════╝"

# Push the latest nginx.conf to the VM so the rebuilt image picks it up
echo "── Syncing nginx.conf to VM..."
scp $SSH_OPTS "$PROJECT_ROOT/deploy/nginx.conf" "$SSH_USER@$VM_IP:/home/opc/aaprintntags/deploy/nginx.conf"

$SSH_CMD DOMAIN="$DOMAIN" LE_EMAIL="$LE_EMAIL" bash -s <<'REMOTE'
set -e
DOMAIN="${DOMAIN}"
LE_EMAIL="${LE_EMAIL}"

echo "── Opening firewall port 443..."
sudo firewall-cmd --permanent --add-port=443/tcp 2>/dev/null || true
sudo firewall-cmd --reload 2>/dev/null || true

echo "── Preparing ACME webroot..."
sudo mkdir -p /home/opc/certbot-www /etc/letsencrypt

# ── Obtain (or renew) the certificate ──────────────────────────
if sudo test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem"; then
  echo "✅ Certificate already exists for $DOMAIN — skipping issuance."
else
  echo "── Issuing certificate via Let's Encrypt (standalone, port 80)..."
  echo "   (app container is stopped briefly to free port 80)"
  sudo podman stop aaprintntags-app 2>/dev/null || true

  sudo podman run --rm \
    -p 80:80 \
    -v /etc/letsencrypt:/etc/letsencrypt:Z \
    -v /home/opc/certbot-www:/var/www/certbot:Z \
    docker.io/certbot/certbot:latest certonly \
      --standalone \
      --non-interactive --agree-tos \
      --email "$LE_EMAIL" \
      --preferred-challenges http \
      -d "$DOMAIN"

  echo "✅ Certificate issued."
fi

# ── Relaunch the app container on 80 + 443 with cert mounts ─────
echo "── Relaunching app container with HTTPS..."
sudo podman rm -f aaprintntags-app 2>/dev/null || true
sudo podman start aaprintntags-db 2>/dev/null || true

# Re-use the existing image; mount the HTTPS nginx.conf + certs.
# (No rebuild needed — the JAR + frontend are already baked in the image.)
sudo podman run -d \
  --name aaprintntags-app \
  --network aaprintnet \
  --restart always \
  -p 80:80 \
  -p 443:443 \
  -e SPRING_DATASOURCE_URL='jdbc:mysql://aaprintntags-db:3306/aaprintntags?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC' \
  -e SPRING_DATASOURCE_USERNAME=appuser \
  -e SPRING_DATASOURCE_PASSWORD='AppUser@2026!' \
  -e SPRING_JPA_HIBERNATE_DDL_AUTO=update \
  -e SPRING_JPA_SHOW_SQL=false \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e APP_JWT_SECRET='4a6f686e446f6553616c65734170704a57545365637265744b65793230323621' \
  -e APP_JWT_EXPIRATION_MS=86400000 \
  -v app_logos:/app/logos:Z \
  -v /home/opc/aaprintntags/deploy/nginx.conf:/etc/nginx/http.d/default.conf:ro \
  -v /etc/letsencrypt:/etc/letsencrypt:ro \
  -v /home/opc/certbot-www:/var/www/certbot:ro \
  --memory=512m \
  aaprintntags-app:latest

# ── Auto-renewal: certbot webroot via the running nginx + reload ─
echo "── Installing auto-renewal cron (runs twice daily)..."
sudo tee /usr/local/bin/aaprintntags-renew-cert.sh >/dev/null <<'RENEW'
#!/bin/bash
podman run --rm \
  -v /etc/letsencrypt:/etc/letsencrypt:Z \
  -v /home/opc/certbot-www:/var/www/certbot:Z \
  docker.io/certbot/certbot:latest renew \
    --webroot --webroot-path /var/www/certbot --quiet
# Reload nginx inside the app container to pick up the renewed cert
podman exec aaprintntags-app nginx -s reload 2>/dev/null || true
RENEW
sudo chmod +x /usr/local/bin/aaprintntags-renew-cert.sh
( sudo crontab -l 2>/dev/null | grep -v aaprintntags-renew-cert; \
  echo "17 3,15 * * * /usr/local/bin/aaprintntags-renew-cert.sh" ) | sudo crontab -

echo ""
echo "── Container status:"
sudo podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
REMOTE

echo ""
echo "── Waiting 40s for the app to come up..."
sleep 40
CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/api/health" 2>/dev/null || echo "000")
echo ""
if [ "$CODE" = "200" ]; then
  echo "╔══════════════════════════════════════════════════════╗"
  echo "║   ✅ HTTPS IS LIVE                                   ║"
  echo "║                                                      ║"
  printf "║   🔒 https://%-39s ║\n" "$DOMAIN"
  echo "║                                                      ║"
  echo "║   HTTP automatically redirects to HTTPS.             ║"
  echo "║   Cert auto-renews twice daily via cron.             ║"
  echo "╚══════════════════════════════════════════════════════╝"
else
  echo "⚠️  HTTPS health check returned $CODE — give it another minute, then:"
  echo "    curl -i https://$DOMAIN/api/health"
fi

