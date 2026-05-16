"""apps/branches/spin_log.py — SpinLog model for daily spin tracking."""
from django.db   import models
from django.conf import settings


class SpinLog(models.Model):
    customer    = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="spin_logs"
    )
    prize_label = models.CharField(max_length=80, default="")
    prize_pct   = models.PositiveSmallIntegerField(default=0)
    prize_color = models.CharField(max_length=20, default="#E8521A")
    spun_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "spin_logs"
        ordering = ["-spun_at"]

    def __str__(self):
        return f"{self.customer} — {self.prize_label} @ {self.spun_at:%Y-%m-%d}"
