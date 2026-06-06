"""apps/menu/signals.py — clear home-page caches when menu items or categories change."""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache

from apps.menu.models import MenuItem, MenuCategory


def _bust_menu_cache(branch_id):
    if not branch_id:
        return
    cache.delete(f"menu:home_sections:{branch_id}")
    cache.delete(f"menu:categories:{branch_id}")


@receiver([post_save, post_delete], sender=MenuItem)
def on_menu_item_change(sender, instance, **kwargs):
    _bust_menu_cache(instance.branch_id)


@receiver([post_save, post_delete], sender=MenuCategory)
def on_category_change(sender, instance, **kwargs):
    _bust_menu_cache(instance.branch_id)
