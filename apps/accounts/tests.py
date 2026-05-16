"""apps/accounts/tests.py — OTP register/verify flow tests"""
from django.test import TestCase, override_settings
from rest_framework.test import APIClient


OTP_BYPASS_SETTINGS = {
    "OTP_BYPASS": True,
    "OTP_BYPASS_CODE": "123456",
}

THROTTLE_SETTINGS = {
    "DEFAULT_THROTTLE_CLASSES": [],
    "DEFAULT_THROTTLE_RATES": {},
}


@override_settings(**OTP_BYPASS_SETTINGS, REST_FRAMEWORK={**THROTTLE_SETTINGS})
class CustomerOTPFlowTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def _register(self, phone="+919876543210", name="Test User"):
        return self.client.post("/api/v1/auth/customer/register/", {"name": name, "phone": phone})

    def _verify(self, phone="+919876543210", otp="123456"):
        return self.client.post("/api/v1/auth/customer/verify-otp/", {"phone": phone, "otp": otp})

    def test_register_returns_200(self):
        res = self._register()
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["success"])

    def test_register_creates_user(self):
        from apps.accounts.models import User
        self._register(phone="+919000000001")
        self.assertTrue(User.objects.filter(phone="+919000000001").exists())

    def test_register_returns_dev_otp_in_bypass_mode(self):
        res = self._register()
        self.assertIn("dev_otp", res.data)

    def test_verify_correct_otp_returns_tokens(self):
        self._register()
        res = self._verify()
        self.assertEqual(res.status_code, 200)
        self.assertIn("tokens", res.data)
        self.assertIn("access", res.data["tokens"])
        self.assertIn("refresh", res.data["tokens"])

    def test_verify_returns_user_profile(self):
        self._register()
        res = self._verify()
        self.assertIn("user", res.data)
        self.assertEqual(res.data["user"]["phone"], "+919876543210")

    def test_verify_wrong_otp_rejected(self):
        self._register()
        # With bypass=True, any code is accepted — test non-bypass path
        with self.settings(OTP_BYPASS=False):
            res = self._verify(otp="000000")
        self.assertNotEqual(res.status_code, 200)

    def test_verify_unregistered_phone_rejected(self):
        res = self._verify(phone="+919999999999")
        self.assertNotEqual(res.status_code, 200)

    def test_register_same_phone_twice_updates_name(self):
        from apps.accounts.models import User
        self._register(name="Old Name")
        self._register(name="New Name")
        user = User.objects.get(phone="+919876543210")
        self.assertEqual(user.name, "New Name")
        self.assertEqual(User.objects.filter(phone="+919876543210").count(), 1)

    def test_register_missing_phone_returns_error(self):
        res = self.client.post("/api/v1/auth/customer/register/", {"name": "Test"})
        self.assertNotEqual(res.status_code, 200)

    def test_register_missing_name_returns_error(self):
        res = self.client.post("/api/v1/auth/customer/register/", {"phone": "+919876543210"})
        self.assertNotEqual(res.status_code, 200)
