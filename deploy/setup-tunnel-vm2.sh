#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  VM2 — Cloudflare Tunnel for Baileys (wa.knfcs.com)
#  Run AFTER: cloudflared tunnel login && cloudflared tunnel create knfc-wa
# ═══════════════════════════════════════════════════════════════════
set -e

TUNNEL_NAME="knfc-wa"
TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')

mkdir -p /home/ubuntu/.cloudflared

cat > /home/ubuntu/.cloudflared/config.yml << EOF
tunnel: ${TUNNEL_ID}
credentials-file: /home/ubuntu/.cloudflared/${TUNNEL_ID}.json

ingress:
  - hostname: wa.knfcs.com
    service: http://localhost:3001
  - service: http_status:404
EOF

echo "Created /home/ubuntu/.cloudflared/config.yml"

sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start  cloudflared

echo ""
echo "=== Tunnel is running ==="
echo "wa.knfcs.com → localhost:3001 (Baileys)"
echo ""
echo "Add this DNS record in Cloudflare dashboard:"
echo "  Type: CNAME  Name: wa  Target: ${TUNNEL_ID}.cfargotunnel.com  Proxy: ON"
echo ""
