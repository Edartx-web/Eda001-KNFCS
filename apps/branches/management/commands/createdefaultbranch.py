"""
management/commands/createdefaultbranch.py

Creates a default branch if none exists.
Reads branch details from env vars so Render can override them.

Usage:
    python manage.py createdefaultbranch
    python manage.py createdefaultbranch --name "Branch B" --address "123 Main St"
"""
import os
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create a default branch if no branches exist"

    def add_arguments(self, parser):
        parser.add_argument("--name",    type=str, default=None)
        parser.add_argument("--address", type=str, default=None)
        parser.add_argument("--phone",   type=str, default=None)

    def handle(self, *args, **options):
        from apps.branches.models import Branch

        if Branch.objects.exists():
            self.stdout.write("Branch already exists — skipping.")
            return

        name    = options["name"]    or os.environ.get("DEFAULT_BRANCH_NAME",    "KNFC Main Branch")
        address = options["address"] or os.environ.get("DEFAULT_BRANCH_ADDRESS", "Main Branch")
        phone   = options["phone"]   or os.environ.get("DEFAULT_BRANCH_PHONE",   "")

        branch = Branch.objects.create(name=name, address=address, phone=phone)
        self.stdout.write(self.style.SUCCESS(f"Created branch: {branch.name}  ({branch.id})"))
