#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-ssl.sh — Run this ONCE on the EC2 instance after DNS is pointing at it.
#
# What it does:
#   1. Installs Certbot on the host (Amazon Linux 2023)
#   2. Reconfigures Nginx to serve the ACME challenge over HTTP
#   3. Issues a Let's Encrypt certificate
#   4. Swaps to the full HTTPS Nginx config
#   5. Schedules auto-renewal via cron
#
# Usage (on the EC2 host as ec2-user):
#   chmod +x setup-ssl.sh
#   sudo ./setup-ssl.sh api.yourdomain.com your@email.com
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DOMAIN="${1:?Usage: sudo ./setup-ssl.sh <domain> <email>}"
EMAIL="${2:?Usage: sudo ./setup-ssl.sh <domain> <email>}"

REPO_DIR="/opt/convopilot"
NGINX_CONF_DIR="$REPO_DIR/infra/nginx"
COMPOSE="docker compose -f $REPO_DIR/infra/docker-compose.prod.yml"

echo ""
echo "=== ConvoPilot SSL setup ==="
echo "Domain : $DOMAIN"
echo "Email  : $EMAIL"
echo ""

# ── 1. Install Certbot (snap version works on AL2023) ──────────────────────
echo "[1/5] Installing Certbot..."
dnf install -y python3-certbot-nginx 2>/dev/null || {
    # Fallback to pip if dnf package not available
    pip3 install certbot certbot-nginx 2>/dev/null || {
        # Final fallback: standalone certbot via snap
        dnf install -y snapd
        systemctl enable --now snapd.socket
        snap install core
        snap refresh core
        snap install --classic certbot
        ln -sf /snap/bin/certbot /usr/bin/certbot
    }
}

# ── 2. Substitute domain in the config files ───────────────────────────────
echo "[2/5] Configuring Nginx for domain: $DOMAIN ..."
sed "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" \
    "$NGINX_CONF_DIR/nginx.ssl.conf" > /tmp/nginx.ssl.conf

# First: use HTTP-only config so ACME challenge works
cp "$NGINX_CONF_DIR/nginx.http.conf" /tmp/nginx.active.conf

# Point docker-compose nginx to the HTTP-only config
$COMPOSE stop nginx 2>/dev/null || true
docker run --rm \
    -v "$NGINX_CONF_DIR:/nginx_src:ro" \
    -v "convopilot_certbot_www:/var/www/certbot" \
    -v "$(dirname $NGINX_CONF_DIR)/:/etc/nginx/conf.d/" \
    nginx:1.25-alpine \
    sh -c "cp /nginx_src/nginx.http.conf /etc/nginx/conf.d/default.conf" 2>/dev/null || true

# Restart Nginx with HTTP-only config
sed -i "s|../backend/nginx.conf|$NGINX_CONF_DIR/nginx.http.conf|g" \
    "$REPO_DIR/infra/docker-compose.prod.yml" 2>/dev/null || true
$COMPOSE up -d nginx

sleep 3

# ── 3. Issue certificate (standalone with webroot) ─────────────────────────
echo "[3/5] Issuing Let's Encrypt certificate..."

# Create webroot directory for ACME challenge
mkdir -p /var/www/certbot

certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    -d "$DOMAIN"

echo "Certificate issued successfully."

# ── 4. Swap to full HTTPS config ───────────────────────────────────────────
echo "[4/5] Switching Nginx to HTTPS config..."

# Write the SSL config (with domain substituted) as the active config
cp /tmp/nginx.ssl.conf "$NGINX_CONF_DIR/default.conf"

# Update docker-compose to mount the SSL config + certs
cat > /tmp/nginx-override.yml << OVERRIDE
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

cp /tmp/nginx-override.yml "$REPO_DIR/infra/docker-compose.override.yml"

# Restart with new config
$COMPOSE up -d --force-recreate nginx

sleep 3
echo "Nginx restarted with HTTPS."

# ── 5. Auto-renewal cron ───────────────────────────────────────────────────
echo "[5/5] Setting up auto-renewal cron..."

# Renew daily at 3am, reload nginx after renewal
CRON_JOB="0 3 * * * certbot renew --quiet --webroot --webroot-path /var/www/certbot && docker exec convopilot_nginx nginx -s reload"
(crontab -l 2>/dev/null | grep -v certbot; echo "$CRON_JOB") | crontab -

echo ""
echo "=== SSL setup complete ==="
echo ""
echo "  HTTPS: https://$DOMAIN"
echo "  WSS  : wss://$DOMAIN"
echo ""
echo "Next: update your frontend VITE_API_URL and VITE_SOCKET_URL to use https:// and wss://"
echo "      then re-run: ./infra/scripts/deploy-frontend.sh"
