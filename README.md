# KNFC — Fried Chicken POS & Ordering System

A full-stack point-of-sale and online ordering platform for **KNFC Fried Chicken** with multi-branch support, WhatsApp OTP authentication, real-time order management, and automated stock alerts.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 4.2 + Django REST Framework |
| Frontend | React 18 (Vite) |
| Database | PostgreSQL |
| Task Queue | Celery 5.4 + Redis |
| Real-time | Django Channels (WebSocket) |
| WhatsApp | Baileys (Node.js service) |
| Tunnel | Cloudflare Tunnel |
| Auth | JWT (SimpleJWT) with role-based claims |

---

## Project Structure

```
KNFC/
├── apps/
│   ├── accounts/        # Users, roles, JWT auth
│   ├── branches/        # Multi-branch management
│   ├── favourites/      # Customer saved items
│   ├── menu/            # Categories, items, customisations
│   ├── notifications/   # WhatsApp broadcasts, alerts
│   ├── offers/          # Promotions and discounts
│   ├── orders/          # Order lifecycle management
│   └── stock/           # Inventory tracking and alerts
├── config/
│   ├── settings/        # Base / dev / production settings
│   ├── celery.py        # Celery app + beat schedule
│   ├── urls.py
│   └── asgi.py
├── frontend/            # React 18 (Vite) SPA
│   └── src/
│       └── pages/
│           ├── admin/   # Admin & SuperAdmin dashboards
│           ├── auth/    # Login, register, OTP pages
│           ├── customer/# Storefront, cart, orders
│           └── staff/   # Kitchen / order fulfilment UI
├── whatsapp-service/    # Node.js Baileys WhatsApp bridge
│   └── index.js
├── utils/               # Shared helpers
├── manage.py
├── requirements.txt
└── .env.example
```

---

## Roles

| Role | Access |
|---|---|
| **Customer** | Browse menu, place orders, track delivery, manage favourites |
| **Staff** | View and update order status, mark items ready |
| **Admin** | Manage menu, offers, stock, broadcasts per branch |
| **Super Admin** | Full access across all branches, user management, stock refill |

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+

---

## Setup

### 1. Clone & configure

```bash
git clone https://github.com/your-org/knfc.git
cd knfc
cp .env.example .env
# Edit .env and fill in all required values
```

### 2. Backend

```bash
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/macOS

pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput

# Optional: seed demo menu data
python manage.py seed_menu
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev        # development
npm run build      # production build
```

### 4. WhatsApp Service

```bash
cd whatsapp-service
npm install
node index.js
```

Scan the QR code shown in the terminal to link the WhatsApp account. Two sessions are maintained: `otp` (for customer login) and `broadcast` (for bulk messaging).

### 5. Celery (background tasks)

```bash
# Worker
celery -A config worker -l info -P eventlet

# Beat scheduler (stock alerts, scheduled broadcasts)
celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

---

## Environment Variables

Copy `.env.example` to `.env` and set each value. Key variables:

| Variable | Description |
|---|---|
| `SECRET_KEY` | Django secret key (generate with `django-admin generate-secret-key`) |
| `DB_*` | PostgreSQL connection details |
| `REDIS_URL` | Redis URL for Celery broker and cache |
| `TWO_FACTOR_API_KEY` | 2Factor.in API key for SMS OTP fallback |
| `EMAIL_HOST_*` | Gmail SMTP credentials (use an App Password) |
| `WHATSAPP_SERVICE_URL` | URL of the Baileys Node.js service (default: `http://127.0.0.1:3001`) |
| `WHATSAPP_INTERNAL_KEY` | Shared secret between Django and WhatsApp service |
| `SITE_URL` | Public-facing site URL |

---

## Management Commands

```bash
# Seed 10 categories × 15 menu items with randomised test data
python manage.py seed_menu

# Seed for a specific branch, clear existing data first
python manage.py seed_menu --branch 2 --clear

# Skip image generation (faster)
python manage.py seed_menu --no-images
```

---

## API Overview

Base URL: `https://api.knfcs.com/api/`

All protected endpoints require `Authorization: Bearer <token>`.

| Prefix | Description |
|---|---|
| `/auth/` | Login, OTP, token refresh |
| `/menu/` | Categories and items |
| `/orders/` | Place and track orders |
| `/stock/` | Inventory levels and refills |
| `/notifications/` | WhatsApp broadcasts |
| `/offers/` | Promotions |

---

## Production Deployment

This project uses **Cloudflare Tunnel** for public access without opening firewall ports.

```yaml
# ~/.cloudflared/config.yml
ingress:
  - hostname: knfcs.com
    service: http://localhost:3000
  - hostname: api.knfcs.com
    service: http://localhost:1000
  - hostname: wa.knfcs.com
    service: http://localhost:3001
  - service: http_status:404
```

Django is served by **Daphne** (ASGI) for WebSocket support:

```bash
daphne -b 0.0.0.0 -p 1000 config.asgi:application
```

---

## Assets

Hero video files (`frontend/src/components/videoclips/`) are excluded from git due to size (42 MB).  
Place `KNFC-hero.mp4` and `KNFC-hero2.mp4` in that folder after cloning.

---

## License

Private — All rights reserved © KNFC Fried Chicken.
