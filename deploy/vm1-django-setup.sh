#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  KNFC — Oracle Cloud VM1 — Django Backend Setup
#  Run this once on a fresh Ubuntu 22.04 VM
#  Usage: bash vm1-django-setup.sh
# ═══════════════════════════════════════════════════════════════════
set -e

echo "==> [1/8] Updating system..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y git python3.11 python3.11-venv python3-pip curl wget ufw

echo "==> [2/8] Opening firewall port 8000..."
sudo ufw allow ssh
sudo ufw allow 8000
sudo ufw --force enable

echo "==> [3/8] Cloning repo..."
cd /home/ubuntu
git clone https://github.com/Edartx-web/Eda001-KNFCS.git knfc
cd knfc

echo "==> [4/8] Setting up Python virtualenv..."
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo "==> [5/8] Creating .env file — FILL IN YOUR VALUES..."
cat > /home/ubuntu/knfc/.env << 'ENVEOF'
DJANGO_SETTINGS_MODULE=config.settings.production

# Generate a strong secret key — replace this!
SECRET_KEY=REPLACE_WITH_LONG_RANDOM_STRING_50_CHARS

# From Supabase → Project Settings → Database → Connection String (URI)
DATABASE_URL=postgresql://postgres:PASSWORD@db.xxxx.supabase.co:5432/postgres

# From Upstash → Redis → Connect → .env
REDIS_URL=rediss://default:PASSWORD@xxxxx.upstash.io:6379

# Your Oracle VM1 public IP or api.knfcs.com after tunnel is set up
BACKEND_URL=https://api.knfcs.com

# WhatsApp service on VM2
WHATSAPP_SERVICE_URL=https://wa.knfcs.com
WHATSAPP_INTERNAL_KEY=REPLACE_WITH_YOUR_SECRET_KEY

# Gmail SMTP (use App Password — not your real Gmail password)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your@gmail.com
EMAIL_HOST_PASSWORD=YOUR_GMAIL_APP_PASSWORD
DEFAULT_FROM_EMAIL=your@gmail.com

SUPPORT_EMAIL_USER=support@gmail.com
SUPPORT_EMAIL_PASSWORD=YOUR_SUPPORT_APP_PASSWORD
SUPPORT_FROM_EMAIL=support@gmail.com

DB_SSL_REQUIRE=True
OTP_BYPASS=False
ENVEOF

echo ""
echo "*** STOP: Edit /home/ubuntu/knfc/.env with your real values before continuing ***"
echo "*** Run: nano /home/ubuntu/knfc/.env ***"
echo ""
read -p "Press ENTER when .env is filled in..."

echo "==> [6/8] Running migrations and collectstatic..."
source /home/ubuntu/knfc/venv/bin/activate
cd /home/ubuntu/knfc
python manage.py migrate --noinput
python manage.py collectstatic --noinput

echo "==> [7/8] Installing Cloudflare Tunnel..."
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
rm cloudflared-linux-amd64.deb
echo "Run 'cloudflared tunnel login' after this script finishes"

echo "==> [8/8] Installing systemd services..."
sudo cp /home/ubuntu/knfc/deploy/knfc-daphne.service /etc/systemd/system/
sudo cp /home/ubuntu/knfc/deploy/knfc-celery.service  /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable knfc-daphne knfc-celery
sudo systemctl start  knfc-daphne knfc-celery

echo ""
echo "=== DONE ==="
echo "Django is running. Next steps:"
echo "  1. Run: cloudflared tunnel login"
echo "  2. Run: cloudflared tunnel create knfc-api"
echo "  3. Run: bash /home/ubuntu/knfc/deploy/setup-tunnel-vm1.sh"
echo ""
