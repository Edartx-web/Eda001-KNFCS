"""
apps/accounts/throttles.py

Custom rate limiting for sensitive endpoints:
  OTPSendThrottle    — 5 OTP sends per phone per 10 minutes
  OTPVerifyThrottle  — 10 verify attempts per phone per 10 minutes
  OrderPlaceThrottle — 20 orders per user per hour
"""
import re
from rest_framework.throttling import SimpleRateThrottle

_UNIT_SECS = {'s': 1, 'm': 60, 'h': 3600, 'd': 86400}


def _parse_rate(rate):
    """parse_rate that supports 'N/Xunit' windows like '5/10m' (10-minute window)."""
    if rate is None:
        return None, None
    num, period = rate.split('/')
    m = re.match(r'^(\d+)?([smhd])', period)
    if m:
        multiplier = int(m.group(1)) if m.group(1) else 1
        return int(num), multiplier * _UNIT_SECS[m.group(2)]
    return int(num), _UNIT_SECS[period[0]]


class OTPSendThrottle(SimpleRateThrottle):
    """5 OTP sends per 10 min per phone number."""
    scope = "otp_send"
    parse_rate = staticmethod(_parse_rate)

    def get_cache_key(self, request, view):
        phone = request.data.get("phone", "")
        if not phone:
            return None
        return self.cache_format % {
            "scope": self.scope,
            "ident": phone.replace("+", "").replace(" ", "")[:20],
        }


class OTPVerifyThrottle(SimpleRateThrottle):
    """10 verify attempts per 10 min per phone."""
    scope = "otp_verify"
    parse_rate = staticmethod(_parse_rate)

    def get_cache_key(self, request, view):
        phone = request.data.get("phone", "")
        if not phone:
            return None
        return self.cache_format % {
            "scope": self.scope,
            "ident": phone.replace("+", "").replace(" ", "")[:20],
        }


class OrderPlaceThrottle(SimpleRateThrottle):
    """20 orders per hour per user — prevents order spam."""
    scope = "order_place"

    def get_cache_key(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return None
        return self.cache_format % {
            "scope": self.scope,
            "ident": str(request.user.pk),
        }
