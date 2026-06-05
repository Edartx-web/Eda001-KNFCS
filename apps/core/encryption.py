"""
apps/core/encryption.py

Fernet symmetric encryption helpers for sensitive model fields.
Key is derived from Django's SECRET_KEY via PBKDF2-HMAC-SHA256 (600 000 iterations).

Algorithm:  AES-128-CBC  +  HMAC-SHA256  (Fernet spec)
Library:    cryptography  (PyCA — NIST-recommended, actively maintained)

Usage:
    from apps.core.encryption import encrypt_value, decrypt_value

    cipher  = encrypt_value("knfc@upi")   # -> "gAAAAA..."
    plain   = decrypt_value("gAAAAA...")  # -> "knfc@upi"
"""

import base64
import threading

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

_lock      = threading.Lock()
_fernet    = None

# Static salt — changing this invalidates all existing ciphertext.
# Bump the version suffix (v2, v3 …) only when rotating keys,
# and write a data migration to re-encrypt all rows first.
_SALT = b"knfc_field_encryption_salt_v1"

# A Fernet token always starts with this prefix (urlsafe-b64 of version byte 0x80)
_FERNET_PREFIX = "gAAAAA"


def _get_fernet() -> Fernet:
    """Return the singleton Fernet instance (lazy-initialised, thread-safe)."""
    global _fernet
    if _fernet is None:
        with _lock:
            if _fernet is None:
                from django.conf import settings
                kdf = PBKDF2HMAC(
                    algorithm  = hashes.SHA256(),
                    length     = 32,
                    salt       = _SALT,
                    iterations = 600_000,
                )
                key     = base64.urlsafe_b64encode(kdf.derive(settings.SECRET_KEY.encode()))
                _fernet = Fernet(key)
    return _fernet


def encrypt_value(plaintext: str) -> str:
    """Encrypt *plaintext* and return a urlsafe-base64 Fernet token."""
    if not plaintext:
        return plaintext
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_value(token: str) -> str:
    """
    Decrypt a Fernet *token*.
    Returns the original plaintext or the token unchanged if decryption fails
    (graceful degradation during the plain-text → encrypted migration window).
    """
    if not token:
        return token
    try:
        return _get_fernet().decrypt(token.encode()).decode()
    except (InvalidToken, Exception):
        # Value is not yet encrypted (legacy plain-text row) — return as-is.
        return token


def is_encrypted(value: str) -> bool:
    """Return True when *value* looks like a Fernet token (not plain text)."""
    return isinstance(value, str) and value.startswith(_FERNET_PREFIX)
