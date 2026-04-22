#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-ssl.sh — Run this ONCE on the EC2 instance after DNS is pointing at it.
#
# Usage (on the EC2 host as ec2-user, from /opt/convopilot):
#   sudo bash infra/scripts/setup-ssl.sh convo-test-api.neary.in your@email.com
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DOMAIN="${1:?Usage: sudo bash setup-ssl.sh <domain> <email>}"
EMAIL="${2:?Usage: sudo bash setup-ssl.sh <domain> <email>}"

REPO_DIR="/opt/convopilot"
NGINX_CONF_DIR="$REPO_DIR/infra/nginx"
COMPOSE="docker compose -f $REPO_DIR/infra/docker-compose.prod.yml"

echo ""
echo "=== ConvoPilot SSL setup ==="
echo "Domain : $DOMAIN"
echo "Email  : $EMAIL"
echo ""

# ── 1. Install Certbot ─────────────────────────────────────────────────────
echo "[1/4] Installing Certbot..."
if ! command -v certbot &>/dev/null; then
    dnf install -y augeas-libs 2>/dev/null || true
    pip3 install certbot 2>/dev/null || {
        pip3 install --break-system-packages certbot 2>/dev/null || true
    }
    # Make sure certbot is findable
    ln -sf "$(python3 -m site --user-base)/bin/certbot" /usr/local/bin/certbot 2>/dev/null || true
fi

if ! command -v certbot &>/dev/null; then
    # Last resort: snap
    dnf install -y snapd 2>/dev/null || true
    systemctl enable --now snapd.socket 2>/dev/null || true
    sleep 5
    snap install --classic certbot
    ln -sf /snap/bin/certbot /usr/bin/certbot
fi

echo "Certbot: $(certbot --version)"

# ── 2. Stop Nginx, get cert via standalone, restart Nginx ─────────────────
echo "[2/4] Issuing certificate (stopping Nginx briefly for port 80)..."

# Stop only nginx — don't touch backend/postgres/redis
$COMPOSE stop nginx 2>/dev/null || true
sleep 2

# Standalone mode: certbot temporarily binds port 80 itself
certbot certonly \
    --standalone \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    -d "$DOMAIN"

echo "Certificate issued at /etc/letsencrypt/live/$DOMAIN/"

# ── 3. Write the active SSL nginx config ──────────────────────────────────
echo "[3/4] Writing HTTPS Nginx config..."

sed "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" \
    "$NGINX_CONF_DIR/nginx.ssl.conf" > "$NGINX_CONF_DIR/default.conf"

echo "Config written to $NGINX_CONF_DIR/default.conf"

# ── 4. Restart Nginx with SSL config + cert mounts ────────────────────────
echo "[4/4] Restarting Nginx with TLS..."

# Write a docker-compose override to expose 443 and mount certs
cat > "$REPO_DIR/infra/docker-compose.override.yml" << OVERRIDE
services:
  nginx:
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - $NGINX_CONF_DIR/default.conf:/etc/nginx/conf.d/default.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - /var/www/certbot:/var/www/certbot:ro
OVERRIDE

$COMPOSE up -d --force-recreate nginx

sleep 3

# Test nginx config
docker exec convopilot_nginx nginx -t && echo "Nginx config OK"

# ── 5. Auto-renewal via cron ──────────────────────────────────────────────
echo "Setting up auto-renewal..."

CRON_JOB="0 3 * * * certbot renew --quiet --pre-hook 'docker stop convopilot_nginx' --post-hook 'docker start convopilot_nginx'"
(crontab -l 2>/dev/null | grep -v certbot; echo "$CRON_JOB") | crontab -

echo ""
echo "=== SSL setup complete ==="
echo ""
echo "  HTTPS : https://$DOMAIN"
echo "  WSS   : wss://$DOMAIN  (Socket.io uses this automatically)"
echo ""
echo "Next: redeploy frontend with HTTPS URLs:"
echo "  ./infra/scripts/deploy-frontend.sh convopilot-demo default ssl $DOMAIN"
