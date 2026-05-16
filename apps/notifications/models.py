"""apps/notifications/models.py"""
from django.db   import models
from django.conf import settings


class BroadcastLog(models.Model):
    STATUS_PENDING  = "pending"
    STATUS_RUNNING  = "running"
    STATUS_DONE     = "done"
    STATUS_FAILED   = "failed"
    STATUS_CHOICES  = [
        (STATUS_PENDING,  "Pending"),
        (STATUS_RUNNING,  "Running"),
        (STATUS_DONE,     "Done"),
        (STATUS_FAILED,   "Failed"),
    ]

    TARGET_ALL    = "all"
    TARGET_BRANCH = "branch"

    title             = models.CharField(max_length=200)
    intro_message     = models.CharField(max_length=300, blank=True, default="")
    message           = models.TextField()
    image_url         = models.URLField(blank=True, default="", max_length=500)
    offer             = models.ForeignKey(
        "offers.DailyOffer", on_delete=models.SET_NULL, null=True, blank=True, related_name="broadcasts"
    )
    target            = models.CharField(max_length=20, default=TARGET_ALL)
    branch_id         = models.UUIDField(null=True, blank=True)
    status            = models.CharField(max_length=20, default=STATUS_PENDING, choices=STATUS_CHOICES)
    total_recipients  = models.PositiveIntegerField(default=0)
    sent_count        = models.PositiveIntegerField(default=0)
    failed_count      = models.PositiveIntegerField(default=0)
    created_by        = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="broadcasts"
    )
    created_at        = models.DateTimeField(auto_now_add=True)
    completed_at      = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} [{self.status}]"
