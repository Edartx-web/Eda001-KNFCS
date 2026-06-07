#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
mkdir -p staticfiles
python manage.py collectstatic --noinput
python manage.py migrate --noinput
python manage.py createsuperadmin --no-input || true
python manage.py createdefaultbranch || true
python manage.py import_menu_xlsx || true
