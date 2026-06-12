"""
utils/email_backend.py

Custom email backend that forces IPv4 DNS resolution for SMTP connections.

Rationale: on the production server smtp.gmail.com resolves to an IPv6
address first. If the host has no IPv6 routing the OS immediately raises
[Errno 101] ENETUNREACH. Restricting getaddrinfo to AF_INET picks IPv4.

Implementation note: override _get_socket() — the single-purpose socket
factory called by Django's EmailBackend.open(). This is cleaner than
overriding connect() which carries extra SMTP protocol responsibilities.
"""
import socket
import smtplib
import logging
from django.core.mail.backends.smtp import EmailBackend

logger = logging.getLogger(__name__)


class _SMTP_IPv4(smtplib.SMTP):
    """smtplib.SMTP that forces IPv4 by overriding the socket factory."""

    def _get_socket(self, host, port, timeout):
        results = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
        if not results:
            raise OSError(f"Cannot resolve {host!r} to an IPv4 address")
        _af, _socktype, _proto, _canonname, sa = results[0]
        logger.debug("SMTP IPv4: %s -> %s:%s", host, *sa)
        return socket.create_connection(sa, timeout, self.source_address)


class IPv4EmailBackend(EmailBackend):
    """
    Drop-in replacement for django.core.mail.backends.smtp.EmailBackend.
    Forces SMTP over IPv4. Set EMAIL_BACKEND = 'utils.email_backend.IPv4EmailBackend'.
    connection_class set at class level — newer Django made it a read-only property.
    """
    connection_class = _SMTP_IPv4
