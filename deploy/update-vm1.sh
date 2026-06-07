#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  KNFC — Update Django Backend on VM1
#  Run this whenever you push new code to GitHub
#  Usage: bash update-vm1.sh
# ═══════════════════════════════════════════════════════════════════
set -e

cd /home/ubuntu/knfc

echo "==> Pulling latest code from GitHub..."
git pull origin EDX-KNFC-v2.0

echo "==> Installing any new packages..."
source venv/bin/activate
pip install -r requirements.txt

echo "==> Running migrations..."
python manage.py migrate --noinput

echo "==> Collecting static files..."
python manage.py collectstatic --noinput

echo "==> Restarting Django and Celery..."
sudo systemctl restart knfc-daphne
sudo systemctl restart knfc-celery

echo ""
echo "=== Update complete! Site is live ==="
