#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  KNFC — Oracle Cloud VM2 — Baileys WhatsApp Service Setup
#  Run this once on a fresh Ubuntu 22.04 VM
#  Usage: bash vm2-baileys-setup.sh
# ═══════════════════════════════════════════════════════════════════
set -e

echo "==> [1/6] Updating system..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget ufw

echo "==> [2/6] Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt install -y nodejs
node --version

echo "==> [3/6] Installing PM2..."
sudo npm install -g pm2

echo "==> [4/6] Cloning repo and installing dependencies..."
cd /home/ubuntu
git clone https://github.com/Edartx-web/Eda001-KNFCS.git knfc
cd /home/ubuntu/knfc/whatsapp-service
npm install

echo "==> [5/6] Creating .env for Baileys..."
cat > /home/ubuntu/knfc/whatsapp-service/.env << 'ENVEOF'
PORT=3001

# Must match WHATSAPP_INTERNAL_KEY in Django .env
INTERNAL_KEY=REPLACE_WITH_YOUR_SECRET_KEY

# Django backend URL on VM1
DJANGO_URL=https://api.knfcs.com

LOG_LEVEL=info
ENVEOF

echo ""
echo "*** STOP: Edit /home/ubuntu/knfc/whatsapp-service/.env ***"
echo "*** Set INTERNAL_KEY to same value as in Django .env ***"
echo ""
read -p "Press ENTER when .env is filled in..."

echo "==> [6/6] Starting Baileys with PM2..."
cd /home/ubuntu/knfc/whatsapp-service
pm2 start index.js --name whatsapp
pm2 save
pm2 startup | tail -1 | sudo bash

echo ""
echo "=== DONE ==="
echo "Baileys is running. Check status: pm2 status"
echo ""
echo "Next steps:"
echo "  1. Run: cloudflared tunnel login"
echo "  2. Run: cloudflared tunnel create knfc-wa"
echo "  3. Run: bash /home/ubuntu/knfc/deploy/setup-tunnel-vm2.sh"
echo "  4. Scan QR code at https://wa.knfcs.com/status via SuperAdmin panel"
echo ""
