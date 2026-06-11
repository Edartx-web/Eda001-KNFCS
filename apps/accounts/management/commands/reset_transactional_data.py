"""
Management command: reset_transactional_data

Wipes all transactional / user-generated data while keeping menu, branches,
stock levels, and offers untouched.  Also purges user-generated files from
the Supabase S3 bucket (reviews/ and support/ prefixes).

Cleared — database
------------------
  users                — all roles except super_admin
  staff_sessions       — login history
  otp_records          — all pending / used OTPs
  orders + order_items — every order and its lines
  item_reviews         — customer reviews and star ratings
  broadcast_logs       — WhatsApp / notification history
  offer_redemptions    — coupon / scratch-card usage
  referral_links       — referral codes
  referral_usage       — who used which referral
  re_engagement_logs   — re-engagement campaign records
  favourites           — customer wishlists
  support_tickets      — customer support threads

Cleared — Supabase S3 storage
------------------------------
  reviews/*            — customer review photos
  support/*            — support ticket attachments

Preserved
---------
  branches, site_config, menu categories + items + images,
  stock records + logs + alerts, daily offers, super_admin user
"""

import logging
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection, transaction

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Reset all transactional data (users, OTPs, orders, reviews). Keeps menu + branches."

    def add_arguments(self, parser):
        parser.add_argument(
            "--yes",
            action="store_true",
            help="Skip confirmation prompt (use in scripts).",
        )
        parser.add_argument(
            "--skip-storage",
            action="store_true",
            help="Skip Supabase S3 file deletion (DB reset only).",
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING(
            "\n⚠️  This will permanently delete ALL transactional data:\n"
            "   Users (except super_admin), OTPs, Orders, Reviews, Payments,\n"
            "   Notifications, Offer redemptions, Favourites, Support tickets\n"
            "   + Supabase S3 files: reviews/* and support/*\n"
            "\n   Menu, Branches, Stock levels and Offers are NOT touched.\n"
        ))

        if not options["yes"]:
            confirm = input("Type  YES  to continue: ").strip()
            if confirm != "YES":
                self.stdout.write(self.style.ERROR("Aborted."))
                return

        with transaction.atomic():
            db_counts = self._delete_db()
            self._reset_sequences()

        if not options["skip_storage"]:
            s3_counts = self._purge_s3(["reviews/", "support/"])
        else:
            s3_counts = []
            self.stdout.write(self.style.WARNING("   (Supabase S3 cleanup skipped)"))

        self.stdout.write(self.style.SUCCESS("\n✅  Reset complete.\n"))
        self.stdout.write("   Database rows deleted:")
        for label, n in db_counts:
            self.stdout.write(f"      {label:<38} {n:>6}")

        if s3_counts:
            self.stdout.write("\n   Supabase S3 files deleted:")
            for label, n in s3_counts:
                self.stdout.write(f"      {label:<38} {n:>6}")

        self.stdout.write("")

    # ── DB deletion ───────────────────────────────────────────────────────────

    def _delete_db(self):
        from apps.accounts.models import User, OTPRecord, StaffSession, Role
        from apps.orders.models import Order, OrderItem
        from apps.menu.models import ItemReview
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

        # Children before parents to respect FK constraints.
        _del("OTPRecord",               OTPRecord.objects.all())
        _del("StaffSession",            StaffSession.objects.all())
        _del("BroadcastLog",            BroadcastLog.objects.all())
        _del("OfferRedemption",         OfferRedemption.objects.all())
        _del("ReferralUsage",           ReferralUsage.objects.all())
        _del("ReferralLink",            ReferralLink.objects.all())
        _del("ReEngagementLog",         ReEngagementLog.objects.all())
        _del("Favourite",               Favourite.objects.all())
        _del("SupportTicket",           SupportTicket.objects.all())
        _del("ItemReview",              ItemReview.objects.all())
        _del("OrderItem",               OrderItem.objects.all())
        _del("Order",                   Order.objects.all())
        _del("User (non-super_admin)",  User.objects.exclude(role=Role.SUPER_ADMIN))

        return results

    # ── Sequence reset (PostgreSQL) ───────────────────────────────────────────

    def _reset_sequences(self):
        tables = [
            "accounts_otprecord",
            "accounts_staffsession",
            "accounts_user",
            "orders_order",
            "orders_orderitem",
            "item_reviews",
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
                    pass  # UUID PKs have no sequence — safe to ignore

    # ── Supabase S3 purge ─────────────────────────────────────────────────────

    def _purge_s3(self, prefixes: list[str]):
        endpoint   = getattr(settings, "AWS_S3_ENDPOINT_URL", "")
        access_key = getattr(settings, "AWS_ACCESS_KEY_ID", "")
        secret_key = getattr(settings, "AWS_SECRET_ACCESS_KEY", "")
        bucket     = getattr(settings, "AWS_STORAGE_BUCKET_NAME", "")
        region     = getattr(settings, "AWS_S3_REGION_NAME", "ap-southeast-2")

        if not all([endpoint, access_key, secret_key, bucket]):
            self.stdout.write(self.style.WARNING(
                "   Supabase S3 credentials not configured — skipping file cleanup."
            ))
            return []

        try:
            import boto3
            from botocore.config import Config
        except ImportError:
            self.stdout.write(self.style.WARNING(
                "   boto3 not installed — skipping file cleanup."
            ))
            return []

        s3 = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
            config=Config(signature_version="s3v4"),
        )

        results = []
        for prefix in prefixes:
            deleted = self._delete_prefix(s3, bucket, prefix)
            results.append((f"s3://{bucket}/{prefix}", deleted))

        return results

    def _delete_prefix(self, s3_client, bucket: str, prefix: str) -> int:
        """Delete all objects under *prefix* in batches of 1000. Returns count."""
        deleted_total = 0
        continuation_token = None

        while True:
            list_kwargs = {"Bucket": bucket, "Prefix": prefix, "MaxKeys": 1000}
            if continuation_token:
                list_kwargs["ContinuationToken"] = continuation_token

            try:
                resp = s3_client.list_objects_v2(**list_kwargs)
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f"   S3 list error for {prefix}: {exc}"))
                break

            objects = resp.get("Contents", [])
            if not objects:
                break

            delete_payload = {"Objects": [{"Key": o["Key"]} for o in objects]}
            try:
                del_resp = s3_client.delete_objects(Bucket=bucket, Delete=delete_payload)
                deleted_total += len(del_resp.get("Deleted", []))
                errors = del_resp.get("Errors", [])
                for err in errors:
                    self.stdout.write(self.style.ERROR(
                        f"   S3 delete error: {err.get('Key')} — {err.get('Message')}"
                    ))
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f"   S3 delete_objects error: {exc}"))
                break

            if resp.get("IsTruncated"):
                continuation_token = resp.get("NextContinuationToken")
            else:
                break

        return deleted_total
