"""apps/menu/signals.py — clear all menu caches when items or categories change."""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache

from apps.menu.models import MenuItem, MenuCategory


def _bust(branch_id):
    if not branch_id:
        return
    cache.delete(f"menu:home_sections:{branch_id}")
    cache.delete(f"menu:categories:{branch_id}")
    cache.delete(f"menu:featured:{branch_id}")
    cache.delete(f"menu:home_bundle:{branch_id}")
    try:
        cache.delete_pattern(f"menu:items:{branch_id}:*")
        cache.delete_pattern(f"menu:cat_detail:{branch_id}:*")
        cache.delete_pattern(f"menu:item_detail:{branch_id}:*")
        cache.delete_pattern(f"admin:menu:items:{branch_id}:*")
    except Exception:
        pass


@receiver([post_save, post_delete], sender=MenuItem)
def on_menu_item_change(sender, instance, **kwargs):
    _bust(instance.branch_id)
    if instance.all_branches:
        from apps.branches.models import Branch
        for bid in Branch.objects.values_list("id", flat=True):
            _bust(str(bid))


@receiver([post_save, post_delete], sender=MenuCategory)
def on_category_change(sender, instance, **kwargs):
    _bust(instance.branch_id)
