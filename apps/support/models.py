"""apps/support/models.py — Customer Support Tickets"""
import uuid
from django.db import models
from django.conf import settings


class TicketStatus(models.TextChoices):
    OPEN       = "open",       "Open"
    IN_REVIEW  = "in_review",  "In Review"
    RESOLVED   = "resolved",   "Resolved"
    CLOSED     = "closed",     "Closed"


class SupportTicket(models.Model):
    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    customer      = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="support_tickets",
    )
    branch        = models.ForeignKey(
        "branches.Branch", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="support_tickets",
    )

    name          = models.CharField(max_length=150)
    email         = models.EmailField()
    phone         = models.CharField(max_length=20, blank=True)
    subject       = models.CharField(max_length=200)
    message       = models.TextField()
    photo         = models.ImageField(upload_to="support/", null=True, blank=True)

    status        = models.CharField(
        max_length=20, choices=TicketStatus.choices, default=TicketStatus.OPEN,
    )

    admin_reply   = models.TextField(blank=True)
    replied_by    = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="support_replies",
    )
    replied_at    = models.DateTimeField(null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "support_tickets"
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.status.upper()}] {self.subject} — {self.name}"
