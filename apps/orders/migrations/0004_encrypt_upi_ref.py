"""
Migration: 0004_encrypt_upi_ref

1. Alters Order.upi_ref from CharField(max_length=50) to EncryptedCharField (TextField).
2. Data-migrates any existing plain-text UPI reference IDs to Fernet-encrypted tokens.
"""

from django.db import migrations
import apps.core.fields


def _encrypt_existing(apps, schema_editor):
    from apps.core.encryption import encrypt_value, is_encrypted
    Order = apps.get_model("orders", "Order")
    for order in Order.objects.exclude(upi_ref=""):
        val = order.upi_ref or ""
        if val and not is_encrypted(val):
            order.upi_ref = encrypt_value(val)
            order.save(update_fields=["upi_ref"])


def _decrypt_existing(apps, schema_editor):
    from apps.core.encryption import decrypt_value, is_encrypted
    Order = apps.get_model("orders", "Order")
    for order in Order.objects.exclude(upi_ref=""):
        val = order.upi_ref or ""
        if val and is_encrypted(val):
            order.upi_ref = decrypt_value(val)
            order.save(update_fields=["upi_ref"])


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0003_order_payment_serial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="order",
            name="upi_ref",
            field=apps.core.fields.EncryptedCharField(
                blank=True, default="",
            ),
        ),
        migrations.RunPython(_encrypt_existing, reverse_code=_decrypt_existing),
    ]
