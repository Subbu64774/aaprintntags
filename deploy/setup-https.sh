#!/bin/bash
# ╔══════════════════════════════════════════════════════════════╗
# ║   AA Print N Tags — Provision HTTPS certificate (one-time)    ║
# ║                                                              ║
# ║  Issues a real, browser-trusted Let's Encrypt certificate    ║
# ║  for the sslip.io hostname that maps to the VM public IP     ║
# ║  (no domain purchase needed) and installs an auto-renewal    ║
# ║  cron job.                                                   ║
# ║                                                              ║
# ║  The CI/CD pipeline (deploy/server-deploy.sh) automatically  ║
# ║  detects the cert and serves the app on 443 — so after       ║
# ║  running this once, just trigger a normal deploy.            ║
# ║                                                              ║
# ║  USAGE:  ./deploy/setup-https.sh                             ║
# ╚══════════════════════════════════════════════════════════════╝
set -euo pipefail

VM_IP="140.245.210.80"
DOMAIN="140-245-210-80.sslip.io"      # sslip.io → resolves to VM_IP automatically
LE_EMAIL="admin@${DOMAIN}"            # used only for expiry notices
SSH_KEY="${SSH_KEY:-$HOME/Downloads/ssh-key-2026-03-20.key}"
SSH_USER="opc"

chmod 600 "$SSH_KEY" 2>/dev/null || true
SSH_CMD="ssh -i $SSH_KEY -o StrictHostKeyChecking=no -o ConnectTimeout=15 $SSH_USER@$VM_IP"

echo "🔒 Provisioning Let's Encrypt certificate for $DOMAIN ($VM_IP)"

$SSH_CMD DOMAIN="$DOMAIN" LE_EMAIL="$LE_EMAIL" bash -s <<'REMOTE'
set -e
DOMAIN="${DOMAIN}"
LE_EMAIL="${LE_EMAIL}"

echo "── Opening firewall port 443..."
sudo firewall-cmd --permanent --add-port=443/tcp 2>/dev/null || true
sudo firewall-cmd --reload 2>/dev/null || true

echo "── Preparing ACME webroot..."
sudo mkdir -p /home/opc/certbot-www /etc/letsencrypt

if sudo test -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem"; then
  echo "✅ Certificate already exists for $DOMAIN — nothing to do."
else
  echo "── Issuing certificate (certbot standalone; app paused briefly on port 80)..."
  sudo podman stop aaprintntags-app 2>/dev/null || true
  sudo podman run --rm \
    -p 80:80 \
    -v /etc/letsencrypt:/etc/letsencrypt:Z \
    -v /home/opc/certbot-www:/var/www/certbot:Z \
    docker.io/certbot/certbot:latest certonly \
      --standalone --non-interactive --agree-tos \
      --email "$LE_EMAIL" --preferred-challenges http -d "$DOMAIN"
  sudo podman start aaprintntags-app 2>/dev/null || true
  echo "✅ Certificate issued."
fi

echo "── Installing auto-renewal cron (twice daily)..."
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
echo "✅ Renewal cron installed."
REMOTE

echo ""
echo "✅ Certificate ready. Now trigger a deploy (git push to main, or re-run the"
echo "   GitHub Actions workflow) — the pipeline will serve the app on https://$DOMAIN"

