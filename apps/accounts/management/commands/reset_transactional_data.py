"""
Management command: reset_transactional_data

Wipes all transactional / user-generated data while keeping menu, branches,
stock levels, and offers untouched.

Cleared tables
--------------
  users                — all roles except super_admin
  staff_sessions       — login history
  otp_records          — all pending / used OTPs
  orders + order_items — every order and its lines
  broadcast_logs       — WhatsApp / notification history
  offer_redemptions    — coupon / scratch-card usage
  referral_links       — referral codes
  referral_usage       — who used which referral
  re_engagement_logs   — re-engagement campaign records
  favourites           — customer wishlists
  support_tickets      — customer support threads

Preserved
---------
  branches, site_config, menu categories + items + images,
  stock records + logs + alerts, daily offers, super_admin user
"""

from django.core.management.base import BaseCommand
from django.db import connection, transaction


class Command(BaseCommand):
    help = "Reset all transactional data (users, OTPs, orders, payments). Keeps menu + branches."

    def add_arguments(self, parser):
        parser.add_argument(
            "--yes",
            action="store_true",
            help="Skip confirmation prompt (use in scripts).",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING(
            "\n⚠️  This will permanently delete ALL transactional data:\n"
            "   Users (except super_admin), OTPs, Orders, Payments,\n"
            "   Notifications, Offer redemptions, Favourites, Support tickets\n"
            "\n   Menu, Branches, Stock levels and Offers are NOT touched.\n"
        ))

        if not options["yes"]:
            confirm = input("Type  YES  to continue: ").strip()
            if confirm != "YES":
                self.stdout.write(self.style.ERROR("Aborted."))
                return

        with transaction.atomic():
            counts = self._delete_all()
            self._reset_sequences()

        self.stdout.write(self.style.SUCCESS("\n✅  Reset complete. Rows deleted:\n"))
        for label, n in counts:
            self.stdout.write(f"   {label:<35} {n:>6}")
        self.stdout.write("")

    # ── Deletion ──────────────────────────────────────────────────────────────

    def _delete_all(self):
        from apps.accounts.models import User, OTPRecord, StaffSession, Role
        from apps.orders.models import Order, OrderItem
        from apps.notifications.models import BroadcastLog
        from apps.offers.models import (
            OfferRedemption, ReferralLink, ReferralUsage, ReEngagementLog,
        )
        from apps.favourites.models import Favourite
        from apps.support.models import SupportTicket

        results = []

        def _del(label, qs):
            n, _ = qs.delete()
            results.append((label, n))

        # Order matters — delete children before parents where FK constraints exist.
        _del("OTPRecord",           OTPRecord.objects.all())
        _del("StaffSession",        StaffSession.objects.all())
        _del("BroadcastLog",        BroadcastLog.objects.all())
        _del("OfferRedemption",     OfferRedemption.objects.all())
        _del("ReferralUsage",       ReferralUsage.objects.all())
        _del("ReferralLink",        ReferralLink.objects.all())
        _del("ReEngagementLog",     ReEngagementLog.objects.all())
        _del("Favourite",           Favourite.objects.all())
        _del("SupportTicket",       SupportTicket.objects.all())
        _del("OrderItem",           OrderItem.objects.all())
        _del("Order",               Order.objects.all())
        # Users last — other tables may FK to User
        _del(f"User (non-super_admin)", User.objects.exclude(role=Role.SUPER_ADMIN))

        return results

    # ── Sequence reset (PostgreSQL) ───────────────────────────────────────────

    def _reset_sequences(self):
        """Reset auto-increment PKs so new records start from 1."""
        tables = [
            "accounts_otprecord",
            "accounts_staffsession",
            "accounts_user",
            "orders_order",
            "orders_orderitem",
            "notifications_broadcastlog",
            "offers_ofredemption",
            "offers_referrallink",
            "offers_referralusage",
            "offers_reengagementlog",
            "favourites_favourite",
            "support_supportticket",
        ]
        with connection.cursor() as cur:
            for table in tables:
                seq = f"{table}_id_seq"
                try:
                    cur.execute(f"ALTER SEQUENCE {seq} RESTART WITH 1;")
                except Exception:
                    pass  # table may use UUID pk — no sequence to reset
