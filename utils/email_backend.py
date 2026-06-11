"""
utils/email_backend.py

Custom email backend that forces IPv4 DNS resolution for SMTP connections.

Rationale: on the production server smtp.gmail.com resolves to an IPv6
address first. If the host has no IPv6 routing the OS immediately raises
[Errno 101] ENETUNREACH, causing every email send to fail and staff login
to return 503. Restricting getaddrinfo to AF_INET picks the IPv4 address.
"""
import socket
import smtplib
import logging
from django.core.mail.backends.smtp import EmailBackend

logger = logging.getLogger(__name__)


class _SMTP_IPv4(smtplib.SMTP):
    """smtplib.SMTP that resolves the remote host to an IPv4 address only."""

    def connect(self, host="localhost", port=0, source_address=None):
        results = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
        if not results:
            raise OSError(f"Cannot resolve {host!r} to an IPv4 address")
        af, socktype, proto, _canonname, sa = results[0]
        logger.debug("SMTP IPv4: %s -> %s:%s", host, *sa)
        self.sock = self._get_socket(af, socktype, proto)
        if self.timeout is not socket._GLOBAL_DEFAULT_TIMEOUT:
            self.sock.settimeout(self.timeout)
        self.sock.connect(sa)
        self.source_address = source_address
        code, msg = self.getreply()
        if self.debuglevel > 0:
            self._print_debug("connect:", repr(msg))
        return code, msg


class IPv4EmailBackend(EmailBackend):
    """EmailBackend that forces SMTP to connect over IPv4.

    Drop-in replacement for django.core.mail.backends.smtp.EmailBackend.
    Set EMAIL_BACKEND = 'utils.email_backend.IPv4EmailBackend' in settings.
    """

    def open(self):
        if self.connection:
            return False
        if not self.use_ssl:
            self.connection_class = _SMTP_IPv4
        return super().open()
