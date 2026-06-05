"""
apps/core/fields.py

EncryptedCharField — a Django TextField that transparently encrypts values
at rest using Fernet (AES-128-CBC + HMAC-SHA256).

    class Branch(models.Model):
        upi_id = EncryptedCharField(blank=True, default="")

The column is stored as TEXT in PostgreSQL (no max-length constraint because
Fernet tokens are ~50 % longer than the plaintext).

Field reads/writes behave identically to a plain CharField: the application
always sees decrypted strings; the database always stores encrypted tokens.
"""

from django.db import models
from apps.core.encryption import encrypt_value, decrypt_value, is_encrypted


class EncryptedCharField(models.TextField):
    """
    TextField that encrypts on write and decrypts on read.
    Existing plain-text rows are decrypted as-is (graceful migration).
    """

    def from_db_value(self, value, expression, connection):
        if value is None or value == "":
            return value
        return decrypt_value(value)

    def to_python(self, value):
        if value is None or value == "":
            return value
        # Encrypted token → decrypt; plain text → return as-is
        return decrypt_value(value) if is_encrypted(value) else value

    def get_prep_value(self, value):
        """Encrypt before persisting. Never double-encrypt."""
        if value is None or value == "":
            return value
        if is_encrypted(value):
            return value          # already encrypted (re-save from DB read)
        return encrypt_value(value)
