#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  KNFC — Update Baileys WhatsApp Service on VM2
#  Run this whenever you push new code to GitHub
#  Usage: bash update-vm2.sh
# ═══════════════════════════════════════════════════════════════════
set -e

cd /home/ubuntu/knfc

echo "==> Pulling latest code from GitHub..."
git pull origin EDX-KNFC-v2.0

echo "==> Installing any new packages..."
cd whatsapp-service
npm install

echo "==> Restarting Baileys..."
pm2 restart whatsapp

echo ""
echo "=== Update complete! WhatsApp service is live ==="
