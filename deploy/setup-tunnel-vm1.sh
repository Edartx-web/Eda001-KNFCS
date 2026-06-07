#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  VM1 — Cloudflare Tunnel for Django (api.knfcs.com)
#  Run AFTER: cloudflared tunnel login && cloudflared tunnel create knfc-api
# ═══════════════════════════════════════════════════════════════════
set -e

TUNNEL_NAME="knfc-api"
TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')

mkdir -p /home/ubuntu/.cloudflared

cat > /home/ubuntu/.cloudflared/config.yml << EOF
tunnel: ${TUNNEL_ID}
credentials-file: /home/ubuntu/.cloudflared/${TUNNEL_ID}.json

ingress:
  - hostname: api.knfcs.com
    service: http://localhost:8000
  - service: http_status:404
EOF

echo "Created /home/ubuntu/.cloudflared/config.yml"

# Systemd service for cloudflared
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start  cloudflared

echo ""
echo "=== Tunnel is running ==="
echo "api.knfcs.com → localhost:8000 (Django)"
echo ""
echo "Add this DNS record in Cloudflare dashboard:"
echo "  Type: CNAME  Name: api  Target: ${TUNNEL_ID}.cfargotunnel.com  Proxy: ON"
echo ""
