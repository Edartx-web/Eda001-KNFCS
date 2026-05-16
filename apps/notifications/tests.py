"""apps/notifications/tests.py — Broadcast split + send tests"""
from unittest.mock import patch, MagicMock

from django.test import TestCase, override_settings

from apps.notifications.models import BroadcastLog
from apps.notifications.tasks import _run_broadcast_body, _send_batch, BATCH_SIZE


def _make_admin():
    from apps.accounts.models import User
    return User.objects.create_superadmin(
        email="admin@test.com", name="Admin", password="testpass123"
    )


def _make_customers(n, branch_id=None):
    from apps.accounts.models import User
    from apps.orders.models import Order
    from apps.branches.models import Branch
    users = []
    for i in range(n):
        u = User.objects.create_customer(phone=f"+9199{i:08d}", name=f"Cust {i}")
        users.append(u)
        if branch_id:
            try:
                branch = Branch.objects.get(id=branch_id)
            except Branch.DoesNotExist:
                branch = Branch.objects.create(id=branch_id, name="Test Branch")
            Order.objects.create(
                customer=u, branch=branch, status="completed", total_price=100,
            )
    return users


class BroadcastSplitTest(TestCase):
    def setUp(self):
        self.admin = _make_admin()
        self.customers = _make_customers(60)

    def _make_broadcast(self, target="all", branch_id=None):
        return BroadcastLog.objects.create(
            title="Test", message="Hello", target=target,
            branch_id=branch_id, created_by=self.admin,
        )

    def test_60_customers_splits_into_3_batches(self):
        bc = self._make_broadcast()
        batches, total = _run_broadcast_body(str(bc.id))
        self.assertEqual(total, 3)                      # ceil(60 / 25) = 3
        self.assertEqual(len(batches[0]), BATCH_SIZE)   # 25
        self.assertEqual(len(batches[1]), BATCH_SIZE)   # 25
        self.assertEqual(len(batches[2]), 10)           # remainder

    def test_status_set_running_with_recipient_count(self):
        bc = self._make_broadcast()
        _run_broadcast_body(str(bc.id))
        bc.refresh_from_db()
        self.assertEqual(bc.status, BroadcastLog.STATUS_RUNNING)
        self.assertEqual(bc.total_recipients, 60)

    def test_zero_recipients_marks_done_immediately(self):
        import uuid
        # Target a branch that has no customers with orders → zero phone list
        bc = self._make_broadcast(
            target="branch",
            branch_id=uuid.uuid4(),   # random branch with no orders
        )
        _run_broadcast_body(str(bc.id))
        bc.refresh_from_db()
        self.assertEqual(bc.status, BroadcastLog.STATUS_DONE)
        self.assertEqual(bc.total_recipients, 0)

    def test_missing_broadcast_id_returns_none(self):
        result = _run_broadcast_body("99999")
        self.assertIsNone(result)

    @patch("apps.notifications.tasks.time")
    @patch("apps.notifications.tasks.req_lib")
    def test_send_batch_all_success(self, mock_req, mock_time):
        mock_time.sleep = MagicMock()
        mock_req.post.return_value = MagicMock(status_code=200)
        bc = self._make_broadcast()

        phones = [f"+9199{i:08d}" for i in range(5)]
        _send_batch(str(bc.id), phones, 0, 1)

        bc.refresh_from_db()
        self.assertEqual(bc.sent_count, 5)
        self.assertEqual(bc.failed_count, 0)
        self.assertEqual(bc.status, BroadcastLog.STATUS_DONE)

    @patch("apps.notifications.tasks.time")
    @patch("apps.notifications.tasks.req_lib")
    def test_send_batch_http_error_counts_failed(self, mock_req, mock_time):
        mock_time.sleep = MagicMock()
        mock_req.post.return_value = MagicMock(status_code=503, text="Unavailable")
        bc = self._make_broadcast()

        phones = [f"+9199{i:08d}" for i in range(3)]
        _send_batch(str(bc.id), phones, 0, 1)

        bc.refresh_from_db()
        self.assertEqual(bc.sent_count, 0)
        self.assertEqual(bc.failed_count, 3)

    @patch("apps.notifications.tasks.time")
    @patch("apps.notifications.tasks.req_lib")
    def test_send_batch_exception_counts_failed(self, mock_req, mock_time):
        mock_time.sleep = MagicMock()
        mock_req.post.side_effect = Exception("Connection refused")
        bc = self._make_broadcast()

        phones = [f"+9199{i:08d}" for i in range(2)]
        _send_batch(str(bc.id), phones, 0, 1)

        bc.refresh_from_db()
        self.assertEqual(bc.failed_count, 2)

    @patch("apps.notifications.tasks.time")
    @patch("apps.notifications.tasks.req_lib")
    def test_intermediate_batch_does_not_mark_done(self, mock_req, mock_time):
        mock_time.sleep = MagicMock()
        mock_req.post.return_value = MagicMock(status_code=200)
        bc = self._make_broadcast()

        phones = [f"+9199{i:08d}" for i in range(5)]
        _send_batch(str(bc.id), phones, 0, 3)   # batch 1 of 3

        bc.refresh_from_db()
        self.assertNotEqual(bc.status, BroadcastLog.STATUS_DONE)

    @patch("apps.notifications.tasks.time")
    @patch("apps.notifications.tasks.req_lib")
    def test_image_url_sends_caption_payload(self, mock_req, mock_time):
        mock_time.sleep = MagicMock()
        mock_req.post.return_value = MagicMock(status_code=200)
        bc = BroadcastLog.objects.create(
            title="Offer", message="50% off!", image_url="http://example.com/img.jpg",
            target="all", created_by=self.admin,
        )
        _send_batch(str(bc.id), ["+919876543210"], 0, 1)

        call_kwargs = mock_req.post.call_args
        payload = call_kwargs[1]["json"]
        self.assertIn("image_url", payload)
        self.assertIn("caption", payload)
        self.assertNotIn("text", payload)


class AutoBroadcastTargetTest(TestCase):
    """Auto-broadcast from an offer must target=all, branch_id=None."""

    def setUp(self):
        from apps.branches.models import Branch
        self.branch = Branch.objects.create(name="Test Branch")
        self.admin = _make_admin()

    def _mock_request(self):
        from unittest.mock import MagicMock
        req = MagicMock()
        req.user = self.admin
        req.build_absolute_uri.return_value = ""
        return req

    @patch("apps.notifications.tasks.run_broadcast")
    def test_auto_broadcast_uses_target_branch(self, mock_run):
        from apps.offers.models import DailyOffer
        from apps.offers.views import _maybe_auto_broadcast

        offer = DailyOffer.objects.create(
            name="Crispy Combo", branch=self.branch,
            auto_broadcast=True, is_active=True, offer_price=99,
        )
        _maybe_auto_broadcast(offer, self._mock_request())

        bc = BroadcastLog.objects.filter(offer=offer).first()
        self.assertIsNotNone(bc, "BroadcastLog was not created")
        self.assertEqual(bc.target, BroadcastLog.TARGET_BRANCH)
        self.assertEqual(str(bc.branch_id), str(self.branch.id))
        mock_run.delay.assert_called_once_with(str(bc.id))

    @patch("apps.notifications.tasks.run_broadcast")
    def test_auto_broadcast_inactive_offer_skipped(self, mock_run):
        from apps.offers.models import DailyOffer
        from apps.offers.views import _maybe_auto_broadcast

        offer = DailyOffer.objects.create(
            name="Inactive Offer", branch=self.branch,
            auto_broadcast=True, is_active=False, offer_price=99,
        )
        _maybe_auto_broadcast(offer, self._mock_request())
        self.assertFalse(BroadcastLog.objects.filter(offer=offer).exists())
        mock_run.delay.assert_not_called()
