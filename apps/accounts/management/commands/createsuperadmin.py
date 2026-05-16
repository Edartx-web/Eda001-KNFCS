"""
management/commands/createsuperadmin.py

Bootstrap the first Super Admin account.

Interactive:
    python manage.py createsuperadmin

Non-interactive (CI/Docker):
    SA_NAME="Admin" SA_EMAIL="admin@knfc.com" SA_PASSWORD="Secret@123" \
    python manage.py createsuperadmin --no-input
"""

import os
import getpass

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError


class Command(BaseCommand):
    help = "Create the first Super Admin for KNFC."

    def add_arguments(self, parser):
        parser.add_argument(
            "--no-input", action="store_true",
            help="Read from SA_NAME, SA_EMAIL, SA_PASSWORD environment variables.",
        )

    def handle(self, *args, **options):
        from apps.accounts.models import User, Role

        self.stdout.write(self.style.SUCCESS("\n=== KNFC — Create Super Admin ===\n"))

        if User.objects.filter(role=Role.SUPER_ADMIN).exists():
            self.stdout.write(self.style.WARNING("A Super Admin already exists."))
            confirm = input("Continue and create another? (yes/no): ").strip().lower()
            if confirm != "yes":
                self.stdout.write("Aborted.")
                return

        if options["no_input"]:
            name     = os.environ.get("SA_NAME",     "").strip()
            email    = os.environ.get("SA_EMAIL",    "").strip()
            password = os.environ.get("SA_PASSWORD", "").strip()
            if not all([name, email, password]):
                raise CommandError(
                    "SA_NAME, SA_EMAIL, and SA_PASSWORD are required with --no-input."
                )
        else:
            name  = input("Full name:      ").strip()
            email = input("Email address:  ").strip()
            while True:
                password = getpass.getpass("Password:         ")
                confirm  = getpass.getpass("Confirm password: ")
                if password != confirm:
                    self.stdout.write(self.style.ERROR("Passwords do not match."))
                    continue
                try:
                    validate_password(password)
                    break
                except ValidationError as e:
                    self.stdout.write(self.style.ERROR("\n".join(e.messages)))

        # Validate
        if not name:
            raise CommandError("Name cannot be empty.")
        if not email or "@" not in email:
            raise CommandError("A valid email is required.")
        if User.objects.filter(email=email.lower()).exists():
            raise CommandError(f"An account with email '{email}' already exists.")

        user = User.objects.create_superadmin(
            email    = email.lower(),
            name     = name,
            password = password,
        )

        self.stdout.write(self.style.SUCCESS(
            f"\nSuper Admin created!\n"
            f"  Name:  {user.name}\n"
            f"  Email: {user.email}\n"
            f"\nLogin at /login/admin\n"
        ))
