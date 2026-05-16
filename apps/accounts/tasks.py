"""
apps/accounts/tasks.py

Celery tasks for staff activity monitoring.

Tasks:
  check_idle_staff()     — runs every 15 min, flags sessions idle > 60 min
                           and sends WebSocket notification to branch admins
  daily_duty_reminder()  — runs at 08:00 IST, reminds staff to log on-duty
"""

from celery import shared_task
from django.utils import timezone
from django.db import transaction
import logging

logger = logging.getLogger(__name__)

IDLE_THRESHOLD_MINUTES = 60  # flag as idle after 1 hour of no ping


@shared_task(name="accounts.check_idle_staff")
def check_idle_staff():
    """
    Runs every 15 minutes via Celery Beat.

    1. Finds all open StaffSessions where last_seen > IDLE_THRESHOLD_MINUTES ago
    2. Marks them as is_idle = True
    3. Sends a WebSocket push to the branch queue channel so admins see it live
    4. Sends a notify() call via the NotificationSystem for branch admins

    Returns count of sessions newly flagged as idle.
    """
    from apps.accounts.models import StaffSession

    now       = timezone.now()
    threshold = now - timezone.timedelta(minutes=IDLE_THRESHOLD_MINUTES)

    # Find open sessions (no logout) that haven't pinged recently
    newly_idle = StaffSession.objects.filter(
        logout_at__isnull=True,
        is_idle=False,
        last_seen__lt=threshold,
    ).select_related("user", "user__branch")

    count = 0
    for session in newly_idle:
        with transaction.atomic():
            session.is_idle = True
            session.save(update_fields=["is_idle"])
            count += 1

            # Push WebSocket notification to the branch queue channel
            try:
                from channels.layers import get_channel_layer
                from asgiref.sync import async_to_sync

                channel_layer = get_channel_layer()
                if channel_layer and session.user.branch_id:
                    async_to_sync(channel_layer.group_send)(
                        f"queue_{session.user.branch_id}",
                        {
                            "type":     "staff_idle_alert",
                            "staff_id": str(session.user.id),
                            "name":     session.user.name,
                            "idle_since": session.last_seen.isoformat(),
                            "message":  f"⚠ {session.user.name} has been inactive for over 1 hour",
                        }
                    )
            except Exception as e:
                logger.warning("WebSocket push failed for idle alert: %s", e)

            logger.info(
                "Staff %s (%s) flagged as idle — last seen %s",
                session.user.name,
                session.user.branch_id,
                session.last_seen.isoformat(),
            )

    if count:
        logger.info("check_idle_staff: %d session(s) newly flagged idle", count)
    return count


@shared_task(name="accounts.daily_duty_reminder")
def daily_duty_reminder():
    """
    Runs at 08:00 IST every morning via Celery Beat.

    Finds all staff users who have not logged in today and sends
    a push notification (WebSocket) to their branch queue so the
    branch admin can see who hasn't checked in yet.

    This task does NOT force the login — the frontend DailyLoginPrompt
    modal handles the UX when the user opens the app.
    """
    from apps.accounts.models import User, StaffSession, Role

    today = timezone.now().date()

    staff_users = User.objects.filter(
        role__in=[Role.STAFF, Role.BRANCH_ADMIN],
        is_active=True,
    ).select_related("branch")

    count = 0
    for user in staff_users:
        has_session_today = StaffSession.objects.filter(
            user=user,
            login_at__date=today,
        ).exists()

        if not has_session_today:
            count += 1
            logger.info("Daily reminder: %s has not logged in today", user.name)

            # Notify branch admin via WebSocket
            try:
                from channels.layers import get_channel_layer
                from asgiref.sync import async_to_sync

                channel_layer = get_channel_layer()
                if channel_layer and user.branch_id:
                    async_to_sync(channel_layer.group_send)(
                        f"queue_{user.branch_id}",
                        {
                            "type":    "staff_not_logged_in",
                            "staff_id": str(user.id),
                            "name":    user.name,
                            "message": f"📋 {user.name} has not logged in today",
                        }
                    )
            except Exception as e:
                logger.warning("WebSocket push failed for daily reminder: %s", e)

    logger.info("daily_duty_reminder: %d staff not yet logged in today", count)
    return count
