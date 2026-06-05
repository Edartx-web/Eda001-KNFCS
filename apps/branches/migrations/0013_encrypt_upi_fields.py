"""
Migration: 0013_encrypt_upi_fields

1. Alters the four UPI CharField columns to TextField (EncryptedCharField is
   a subclass of TextField; the DB type changes from VARCHAR to TEXT).
2. Data-migrates existing plain-text values to Fernet-encrypted tokens so
   there is no window where rows are in a mixed state.
"""

from django.db import migrations
import apps.core.fields


def _encrypt_existing(apps, schema_editor):
    """Encrypt any plain-text UPI values already in the database."""
    from apps.core.encryption import encrypt_value, is_encrypted
    Branch = apps.get_model("branches", "Branch")
    fields = ["upi_id", "gpay_upi_id", "phonepe_upi_id", "supermoney_upi_id"]
    for branch in Branch.objects.all():
        dirty = False
        for f in fields:
            val = getattr(branch, f) or ""
            if val and not is_encrypted(val):
                setattr(branch, f, encrypt_value(val))
                dirty = True
        if dirty:
            branch.save(update_fields=fields)


def _decrypt_existing(apps, schema_editor):
    """Reverse: decrypt encrypted values back to plain text (for rollback)."""
    from apps.core.encryption import decrypt_value, is_encrypted
    Branch = apps.get_model("branches", "Branch")
    fields = ["upi_id", "gpay_upi_id", "phonepe_upi_id", "supermoney_upi_id"]
    for branch in Branch.objects.all():
        dirty = False
        for f in fields:
            val = getattr(branch, f) or ""
            if val and is_encrypted(val):
                setattr(branch, f, decrypt_value(val))
                dirty = True
        if dirty:
            branch.save(update_fields=fields)


class Migration(migrations.Migration):

    dependencies = [
        ("branches", "0012_siteconfig_home_section_images"),
    ]

    operations = [
        # --- Step 1: alter column types (VARCHAR → TEXT) ---
        migrations.AlterField(
            model_name="branch",
            name="upi_id",
            field=apps.core.fields.EncryptedCharField(
                blank=True, default="",
                help_text="General UPI ID — encrypted at rest",
            ),
        ),
        migrations.AlterField(
            model_name="branch",
            name="gpay_upi_id",
            field=apps.core.fields.EncryptedCharField(
                blank=True, default="",
                help_text="Google Pay UPI ID — encrypted at rest",
            ),
        ),
        migrations.AlterField(
            model_name="branch",
            name="phonepe_upi_id",
            field=apps.core.fields.EncryptedCharField(
                blank=True, default="",
                help_text="PhonePe UPI ID — encrypted at rest",
            ),
        ),
        migrations.AlterField(
            model_name="branch",
            name="supermoney_upi_id",
            field=apps.core.fields.EncryptedCharField(
                blank=True, default="",
                help_text="SuperMoney UPI ID — encrypted at rest",
            ),
        ),
        # --- Step 2: encrypt existing rows ---
        migrations.RunPython(_encrypt_existing, reverse_code=_decrypt_existing),
    ]
