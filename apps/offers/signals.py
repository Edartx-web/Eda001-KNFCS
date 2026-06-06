"""apps/offers/signals.py — clear offers cache when offers change."""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache

from apps.offers.models import DailyOffer


@receiver([post_save, post_delete], sender=DailyOffer)
def on_offer_change(sender, instance, **kwargs):
    branch_id = instance.branch_id
    if branch_id:
        cache.delete(f"offers:active:{branch_id}")
    # If it's an all_branches offer, we can't easily bust all branches —
    # the 60s TTL is short enough that it self-heals quickly.
