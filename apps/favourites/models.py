"""
apps/favourites/models.py
Customer's saved favourite items — persisted server-side and synced
with localStorage on the frontend.
"""
import uuid
from django.db import models
from django.conf import settings


class Favourite(models.Model):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="favourites",
    )
    menu_item  = models.ForeignKey(
        "menu.MenuItem",
        on_delete=models.CASCADE,
        related_name="favourited_by",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table        = "favourites"
        unique_together = [("customer", "menu_item")]
        ordering        = ["-created_at"]

    def __str__(self):
        return f"{self.customer.name} ❤ {self.menu_item.name}"
