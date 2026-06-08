"""
apps/menu/views.py

All menu API endpoints:
  GET  /api/v1/menu/categories/             → list all categories for branch
  GET  /api/v1/menu/categories/:slug/       → category detail + all items
  GET  /api/v1/menu/items/                  → all items (filter by category, search)
  GET  /api/v1/menu/items/:slug/            → item detail + reviews + related
  GET  /api/v1/menu/featured/              → featured items for home page
  GET  /api/v1/menu/search/               → search items across branch
  POST /api/v1/menu/reviews/              → customer submits review
  POST /api/v1/menu/favourites/toggle/    → toggle item in customer favourites
  GET  /api/v1/menu/favourites/           → customer's favourite items
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Q
from django.core.cache import cache

from apps.menu.models import MenuCategory, MenuItem, ItemReview
from apps.favourites.models import Favourite
from apps.menu.serializers import (
    MenuCategoryListSerializer,
    MenuCategoryDetailSerializer,
    MenuItemListSerializer,
    MenuItemDetailSerializer,
    CreateReviewSerializer,
)
from apps.accounts.permissions import IsCustomer, get_request_branch_id


def ok(data, code=status.HTTP_200_OK):
    return Response({"success": True, **data}, status=code)

def err(msg, code=status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "error": msg}, status=code)

def cached_ok(data, cache_key, ttl=60):
    """Return ok() response with Cache-Control header for Cloudflare edge caching."""
    resp = ok(data)
    resp["Cache-Control"] = f"public, max-age={ttl}, stale-while-revalidate=10"
    return resp


class CategoryListView(APIView):
    """GET /api/v1/menu/categories/ — all active categories for the branch."""
    permission_classes = [AllowAny]

    def get(self, request):
        branch_id = request.query_params.get("branch_id") or get_request_branch_id(request)
        if not branch_id:
            return err("branch_id is required.")

        cache_key = f"menu:categories:{branch_id}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached_ok({"categories": cached}, cache_key)

        from django.db.models import Q
        categories = MenuCategory.objects.filter(
            Q(branch_id=branch_id) | Q(all_branches=True),
            is_active=True,
        ).prefetch_related("items")

        data = MenuCategoryListSerializer(categories, many=True, context={"request": request}).data
        cache.set(cache_key, data, 120)
        return cached_ok({"categories": data}, cache_key, ttl=120)


class CategoryDetailView(APIView):
    """GET /api/v1/menu/categories/:slug/ — category + all its items."""
    permission_classes = [AllowAny]

    def get(self, request, slug):
        branch_id = request.query_params.get("branch_id") or get_request_branch_id(request)
        from django.db.models import Q as _Q
        try:
            category = MenuCategory.objects.get(
                _Q(branch_id=branch_id) | _Q(all_branches=True),
                slug=slug,
                is_active=True,
            )
        except MenuCategory.DoesNotExist:
            return err("Category not found.", status.HTTP_404_NOT_FOUND)

        serializer = MenuCategoryDetailSerializer(category, context={"request": request})
        return ok({"category": serializer.data})


class MenuItemListView(APIView):
    """
    GET /api/v1/menu/items/
    Query params:
      branch_id    — required
      category     — category slug (optional filter)
      search       — text search (optional)
      available    — true/false (default true)
      sort         — popular | price_asc | price_desc | new
    """
    permission_classes = [AllowAny]

    def get(self, request):
        branch_id = request.query_params.get("branch_id") or get_request_branch_id(request)
        if not branch_id:
            return err("branch_id is required.")

        qs = MenuItem.objects.filter(
            Q(branch_id=branch_id) | Q(all_branches=True),
        ).select_related("category").prefetch_related("offers", "stock_records")

        # Deduplicate: if a branch has its own version of an item (same name,
        # all_branches=False), prefer it over the global all_branches=True copy.
        # This prevents the global item from appearing alongside the branch item
        # and ensures stock lookups find the right StockRecord.
        branch_item_names = list(
            MenuItem.objects.filter(branch_id=branch_id, all_branches=False)
            .values_list("name", flat=True)
        )
        if branch_item_names:
            qs = qs.exclude(all_branches=True, name__in=branch_item_names)

        # Filters
        category = request.query_params.get("category")
        if category:
            qs = qs.filter(category__slug=category)

        # Home-page section flags
        for flag in ("is_hotdeals", "is_chicken", "is_snacks", "is_cold_drinks", "is_buckets", "is_combo"):
            if request.query_params.get(flag, "").lower() == "true":
                qs = qs.filter(**{flag: True})

        available = request.query_params.get("available", "true")
        if available.lower() == "true":
            qs = qs.filter(is_available=True)

        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search) |
                Q(category__name__icontains=search)
            )

        # Sort
        sort = request.query_params.get("sort", "popular")
        sort_map = {
            "popular":   "-avg_rating",
            "price_asc":  "price",
            "price_desc": "-price",
            "new":        "-created_at",
        }
        qs = qs.order_by(sort_map.get(sort, "display_order"))

        serializer = MenuItemListSerializer(qs, many=True, context={"request": request})
        return ok({
            "items":       serializer.data,
            "total_count": qs.count(),
        })


class HomeSectionsView(APIView):
    """
    GET /api/v1/menu/home-sections/
    Returns all 6 home-page flag sections in a single request so the customer
    home page doesn't fire 6 parallel /items/ calls (which triggers rate limits).
    Response: { sections: { is_hotdeals: [...], is_buckets: [...], ... } }
    """
    permission_classes = [AllowAny]
    SECTION_FLAGS = ["is_hotdeals", "is_buckets", "is_combo", "is_chicken", "is_snacks", "is_cold_drinks"]
    PAGE_SIZE = 10

    def get(self, request):
        branch_id = request.query_params.get("branch_id") or get_request_branch_id(request)
        if not branch_id:
            return err("branch_id is required.")

        base_qs = MenuItem.objects.filter(
            Q(branch_id=branch_id) | Q(all_branches=True),
            is_available=True,
        ).select_related("category").prefetch_related("offers", "stock_records")

        # Deduplicate branch-specific vs all_branches items (same as MenuItemListView)
        branch_item_names = list(
            MenuItem.objects.filter(branch_id=branch_id, all_branches=False)
            .values_list("name", flat=True)
        )
        if branch_item_names:
            base_qs = base_qs.exclude(all_branches=True, name__in=branch_item_names)

        cache_key = f"menu:home_sections:{branch_id}"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached_ok({"sections": cached}, cache_key)

        sections = {}
        for flag in self.SECTION_FLAGS:
            items = list(base_qs.filter(**{flag: True}).order_by("display_order")[: self.PAGE_SIZE])
            if items:
                sections[flag] = MenuItemListSerializer(items, many=True, context={"request": request}).data

        cache.set(cache_key, sections, 60)
        return cached_ok({"sections": sections}, cache_key)


class MenuItemDetailView(APIView):
    """GET /api/v1/menu/items/:slug/ — full product detail."""
    permission_classes = [AllowAny]

    def get(self, request, slug):
        branch_id = request.query_params.get("branch_id") or get_request_branch_id(request)
        try:
            item = MenuItem.objects.get(
                slug=slug,
                branch_id=branch_id,
            )
        except MenuItem.DoesNotExist:
            return err("Item not found.", status.HTTP_404_NOT_FOUND)

        serializer = MenuItemDetailSerializer(item, context={"request": request})
        return ok({"item": serializer.data})


class FeaturedItemsView(APIView):
    """
    GET /api/v1/menu/featured/
    Returns featured items + order-again items for the home page.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        branch_id = request.query_params.get("branch_id") or get_request_branch_id(request)
        if not branch_id:
            return err("branch_id is required.")

        featured = MenuItem.objects.filter(
            Q(branch_id=branch_id) | Q(all_branches=True),
            is_featured=True,
            is_available=True,
        ).order_by("display_order")[:8]

        # Order again — items from customer's last 3 orders
        order_again = []
        if request.user.is_authenticated:
            from apps.orders.models import Order, OrderStatus
            last_orders = Order.objects.filter(
                branch_id=branch_id,
                customer=request.user,
                status=OrderStatus.COMPLETED,
            ).order_by("-created_at")[:3]

            seen_ids = set()
            for order in last_orders:
                for oi in order.items.all():
                    if oi.menu_item_id not in seen_ids and oi.menu_item.is_available:
                        order_again.append(oi.menu_item)
                        seen_ids.add(oi.menu_item_id)
                        if len(order_again) >= 6:
                            break

        return ok({
            "featured":    MenuItemListSerializer(featured, many=True, context={"request": request}).data,
            "order_again": MenuItemListSerializer(order_again, many=True, context={"request": request}).data,
        })


class SearchView(APIView):
    """GET /api/v1/menu/search/?q=chicken — search items and active offers."""
    permission_classes = [AllowAny]

    def get(self, request):
        branch_id = request.query_params.get("branch_id") or get_request_branch_id(request)
        q = request.query_params.get("q", "").strip()

        if not q:
            return ok({"results": [], "offers": [], "query": ""})

        qs = MenuItem.objects.filter(
            branch_id=branch_id,
            is_available=True,
        ).filter(
            Q(name__icontains=q) |
            Q(description__icontains=q) |
            Q(category__name__icontains=q)
        ).select_related("category")[:20]

        # Search active offers
        from apps.offers.models import DailyOffer
        from django.utils import timezone as _tz
        now = _tz.now()
        offer_qs = DailyOffer.objects.filter(
            branch_id=branch_id,
            is_active=True,
        ).filter(
            Q(name__icontains=q) | Q(tagline__icontains=q)
        ).filter(
            Q(end_at__isnull=True) | Q(end_at__gt=now)
        ).filter(start_at__lte=now)[:5]

        offers_data = [
            {
                "id":                  str(o.id),
                "name":                o.name,
                "tagline":             o.tagline or "",
                "emoji":               o.emoji or "🎉",
                "accent_color":        o.accent_color or "#E8521A",
                "discount_percentage": str(o.discount_percentage) if o.discount_percentage else None,
                "discount_flat":       str(o.discount_flat) if o.discount_flat else None,
                "coupon_code":         o.coupon_code or "",
            }
            for o in offer_qs
        ]

        return ok({
            "results": MenuItemListSerializer(qs, many=True, context={"request": request}).data,
            "offers":  offers_data,
            "query":   q,
            "count":   qs.count(),
        })


class SubmitReviewView(APIView):
    """POST /api/v1/menu/reviews/ — customer submits a review."""
    permission_classes = [IsCustomer]

    def post(self, request):
        serializer = CreateReviewSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors},
                            status=status.HTTP_400_BAD_REQUEST)

        data     = serializer.validated_data
        item_id  = data["menu_item_id"]
        item     = MenuItem.objects.get(id=item_id)
        order    = None
        if data.get("order_id"):
            from apps.orders.models import Order
            order = Order.objects.filter(id=data["order_id"]).first()

        review, created = ItemReview.objects.get_or_create(
            menu_item=item,
            customer=request.user,
            order=order,
            defaults={
                "rating":  data["rating"],
                "comment": data.get("comment", ""),
                "photo":   data.get("photo"),
            }
        )
        if not created:
            review.rating  = data["rating"]
            review.comment = data.get("comment", "")
            if data.get("photo"):
                review.photo = data["photo"]
            review.save()

        # Update cached avg_rating on MenuItem
        from django.db.models import Avg
        stats = item.reviews.filter(is_visible=True).aggregate(avg=Avg("rating"))
        item.avg_rating   = stats["avg"] or 0
        item.review_count = item.reviews.filter(is_visible=True).count()
        item.save(update_fields=["avg_rating", "review_count"])

        return ok(
            {"message": "Review submitted. Thank you!", "created": created},
            code=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class FavouriteToggleView(APIView):
    """POST /api/v1/menu/favourites/toggle/ {menu_item_id}"""
    permission_classes = [IsCustomer]

    def post(self, request):
        item_id = request.data.get("menu_item_id")
        if not item_id:
            return err("menu_item_id is required.")

        try:
            item = MenuItem.objects.get(id=item_id, branch_id=request.user.branch_id)
        except MenuItem.DoesNotExist:
            return err("Item not found.")

        fav, created = Favourite.objects.get_or_create(
            customer=request.user, menu_item=item
        )
        if not created:
            fav.delete()
            return ok({"favourited": False, "message": "Removed from favourites."})

        return ok({"favourited": True, "message": "Added to favourites."})


class FavouriteListView(APIView):
    """GET /api/v1/menu/favourites/ — customer's favourite items."""
    permission_classes = [IsCustomer]

    def get(self, request):
        favs = Favourite.objects.filter(
            customer=request.user
        ).select_related("menu_item").order_by("-created_at")

        items = [f.menu_item for f in favs if f.menu_item.is_available]
        return ok({"favourites": MenuItemListSerializer(items, many=True, context={"request": request}).data})


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN MENU MANAGEMENT VIEWS
# ══════════════════════════════════════════════════════════════════════════════

from apps.accounts.permissions import IsAdminOrAbove
from django.utils.text import slugify


def str_to_bool(val, default=False):
    if val is None:
        return default
    if isinstance(val, bool):
        return val
    if isinstance(val, str):
        return val.lower() in ('true', '1', 'yes', 't')
    return bool(val)


class AdminCategoryListCreateView(APIView):
    """
    GET  /api/v1/menu/admin/categories/  — list all categories for branch
    POST /api/v1/menu/admin/categories/  — create new category
    """
    permission_classes = [IsAdminOrAbove]

    def get(self, request):
        from apps.accounts.permissions import get_request_branch_id
        from django.db.models import Q
        branch_id = get_request_branch_id(request)
        cats = MenuCategory.objects.filter(
            Q(branch_id=branch_id) | Q(all_branches=True)
        ).prefetch_related("items").order_by("display_order", "name").distinct()
        return ok({"categories": MenuCategoryListSerializer(cats, many=True, context={"request": request}).data})

    def post(self, request):
        from apps.accounts.permissions import get_request_branch_id
        from apps.accounts.models import Role
        branch_id = get_request_branch_id(request)
        # SuperAdmin must send branch_id in request body
        if not branch_id:
            branch_id = request.data.get("branch_id") or request.POST.get("branch_id")
        if not branch_id:
            return err("branch_id is required. SuperAdmin must specify a branch.")
        data = request.data

        name = data.get("name", "").strip()
        if not name:
            return err("name is required.")

        slug = data.get("slug") or slugify(name)
        # Make slug unique within branch
        base_slug, n = slug, 1
        while MenuCategory.objects.filter(branch_id=branch_id, slug=slug).exists():
            slug = f"{base_slug}-{n}"; n += 1

        cat = MenuCategory.objects.create(
            branch_id=branch_id,
            name=name,
            slug=slug,
            description=data.get("description", ""),
            gradient_from=data.get("gradient_from", "#1A0800"),
            gradient_to=data.get("gradient_to", "#2D1200"),
            display_order=int(data.get("display_order", 0)),
            is_active=str_to_bool(data.get("is_active"), True),
            all_branches=str_to_bool(data.get("all_branches"), False),
        )
        if "image" in request.FILES:
            cat.image = request.FILES["image"]
            cat.save(update_fields=["image"])

        return ok(
            {"category": MenuCategoryListSerializer(cat, context={"request": request}).data,
             "message": "Category created."},
            code=status.HTTP_201_CREATED,
        )


class AdminCategoryDetailView(APIView):
    """
    PATCH  /api/v1/menu/admin/categories/<id>/  — update
    DELETE /api/v1/menu/admin/categories/<id>/  — delete
    """
    permission_classes = [IsAdminOrAbove]

    def _get(self, request, cat_id):
        from apps.accounts.models import Role
        try:
            cat = MenuCategory.objects.get(id=cat_id)
            if request.user.role == Role.BRANCH_ADMIN and str(cat.branch_id) != str(request.user.branch_id):
                return None
            return cat
        except MenuCategory.DoesNotExist:
            return None

    def patch(self, request, cat_id):
        cat = self._get(request, cat_id)
        if not cat:
            return err("Category not found.", status.HTTP_404_NOT_FOUND)

        fields = ["name", "description", "gradient_from", "gradient_to",
                  "display_order"]
        bool_fields = ["is_active", "all_branches"]
        updated = []
        for f in fields:
            if f in request.data:
                setattr(cat, f, request.data[f])
                updated.append(f)

        for f in bool_fields:
            if f in request.data:
                setattr(cat, f, str_to_bool(request.data[f]))
                updated.append(f)

        if "image" in request.FILES:
            cat.image = request.FILES["image"]
            updated.append("image")

        if updated:
            cat.save(update_fields=updated)
            cat.refresh_from_db()

        return ok({"category": MenuCategoryListSerializer(cat, context={"request": request}).data, "message": "Updated."})

    def delete(self, request, cat_id):
        cat = self._get(request, cat_id)
        if not cat:
            return err("Category not found.", status.HTTP_404_NOT_FOUND)
        cat_name = cat.name
        cat.delete()
        return ok({"message": f"Category '{cat_name}' deleted."})


class AdminMenuItemListCreateView(APIView):
    """
    GET  /api/v1/menu/admin/items/  — all items for branch (all statuses)
    POST /api/v1/menu/admin/items/  — create new item
    """
    permission_classes = [IsAdminOrAbove]

    def get(self, request):
        from apps.accounts.permissions import get_request_branch_id
        from django.db.models import Q
        branch_id = get_request_branch_id(request)

        qs = MenuItem.objects.filter(
            Q(branch_id=branch_id) | Q(all_branches=True)
        ).select_related("category").prefetch_related(
            "customisations", "offers", "stock_records"
        ).order_by("category__display_order", "display_order", "name").distinct()

        # Optional filters
        cat = request.query_params.get("category")
        if cat:
            qs = qs.filter(category__slug=cat)

        avail = request.query_params.get("available")
        if avail == "true":
            qs = qs.filter(is_available=True)
        elif avail == "false":
            qs = qs.filter(is_available=False)

        return ok({
            "items": MenuItemListSerializer(qs, many=True, context={"request": request}).data,
            "total": qs.count(),
        })

    def post(self, request):
        from apps.accounts.permissions import get_request_branch_id
        branch_id = get_request_branch_id(request)
        # SuperAdmin must send branch_id in request body
        if not branch_id:
            branch_id = request.data.get("branch_id") or request.POST.get("branch_id")
        if not branch_id:
            return err("branch_id is required. SuperAdmin must specify a branch.")
        data = request.data

        # Required fields
        for req in ("name", "category_id", "price"):
            if not data.get(req):
                return err(f"{req} is required.")

        try:
            cat = MenuCategory.objects.get(id=data["category_id"], branch_id=branch_id)
        except MenuCategory.DoesNotExist:
            return err("Category not found.")

        name = data["name"].strip()
        slug = data.get("slug") or slugify(name)
        base_slug, n = slug, 1
        while MenuItem.objects.filter(branch_id=branch_id, slug=slug).exists():
            slug = f"{base_slug}-{n}"; n += 1

        item = MenuItem.objects.create(
            branch_id=branch_id,
            category=cat,
            name=name,
            slug=slug,
            description=data.get("description", ""),
            price=data["price"],
            dietary_type=data.get("dietary_type", "non_veg"),
            spice_level=data.get("spice_level", "medium"),
            calories=data.get("calories") or None,
            prep_time_min=int(data.get("prep_time_min", 8)),
            prep_time_max=int(data.get("prep_time_max", 15)),
            is_available=str_to_bool(data.get("is_available"), True),
            is_featured=str_to_bool(data.get("is_featured"), False),
            is_new=str_to_bool(data.get("is_new"), True),
            is_bestseller=str_to_bool(data.get("is_bestseller"), False),
            is_hotdeals=str_to_bool(data.get("is_hotdeals"), False),
            is_chicken=str_to_bool(data.get("is_chicken"), False),
            is_snacks=str_to_bool(data.get("is_snacks"), False),
            is_cold_drinks=str_to_bool(data.get("is_cold_drinks"), False),
            is_buckets=str_to_bool(data.get("is_buckets"), False),
            is_combo=str_to_bool(data.get("is_combo"), False),
            display_order=int(data.get("display_order", 0)),
            low_stock_threshold=int(data.get("low_stock_threshold", 10)),
            all_branches=str_to_bool(data.get("all_branches"), False),
        )
        if "image" in request.FILES:
            item.image = request.FILES["image"]
            item.save(update_fields=["image"])

        # Create customisations if provided
        for c in data.get("customisations", []):
            from apps.menu.models import ItemCustomisation
            ItemCustomisation.objects.create(
                menu_item=item,
                name=c.get("name", ""),
                extra_price=c.get("extra_price", 0),
            )

        # Create gallery images if provided
        from apps.menu.models import MenuItemImage
        for f in request.FILES.getlist("gallery_add"):
            MenuItemImage.objects.create(menu_item=item, image=f)

        return ok(
            {"item": MenuItemDetailSerializer(item, context={"request": request}).data, "message": "Item created."},
            code=status.HTTP_201_CREATED,
        )


class AdminMenuItemDetailView(APIView):
    """
    GET    /api/v1/menu/admin/items/<id>/  — full detail
    PATCH  /api/v1/menu/admin/items/<id>/  — update
    DELETE /api/v1/menu/admin/items/<id>/  — delete
    """
    permission_classes = [IsAdminOrAbove]

    def _get(self, request, item_id):
        from apps.accounts.models import Role
        try:
            item = MenuItem.objects.get(id=item_id)
            if request.user.role == Role.BRANCH_ADMIN and str(item.branch_id) != str(request.user.branch_id):
                
                return None
            return item
        except MenuItem.DoesNotExist:
            return None

    def get(self, request, item_id):
        item = self._get(request, item_id)
        if not item:
            return err("Item not found.", status.HTTP_404_NOT_FOUND)
        return ok({"item": MenuItemDetailSerializer(item, context={"request": request}).data})

    def patch(self, request, item_id):
        item = self._get(request, item_id)
        if not item:
            return err("Item not found.", status.HTTP_404_NOT_FOUND)

        fields = [
            "name", "description", "price", "dietary_type", "spice_level",
            "calories", "prep_time_min", "prep_time_max",
            "display_order", "low_stock_threshold",
        ]
        bool_fields = ["is_available", "is_featured", "is_new", "is_bestseller", "is_hotdeals", "is_chicken", "is_snacks", "is_cold_drinks", "is_buckets", "is_combo", "all_branches"]
        
        updated = []
        for f in fields:
            if f in request.data:
                setattr(item, f, request.data[f])
                updated.append(f)

        for f in bool_fields:
            if f in request.data:
                setattr(item, f, str_to_bool(request.data[f]))
                updated.append(f)

        if "category_id" in request.data:
            try:
                cat = MenuCategory.objects.get(
                    id=request.data["category_id"],
                    branch_id=item.branch_id,
                )
                item.category = cat
                updated.append("category")
            except MenuCategory.DoesNotExist:
                return err("Category not found.")

        if "image" in request.FILES:
            item.image = request.FILES["image"]
            updated.append("image")

        if updated:
            item.save(update_fields=updated + ["updated_at"])
            item.refresh_from_db()

        # Remove gallery images by ID
        gallery_remove = request.data.get("gallery_remove")
        if gallery_remove:
            import json
            from apps.menu.models import MenuItemImage
            try:
                ids = json.loads(gallery_remove)
                MenuItemImage.objects.filter(id__in=ids, menu_item=item).delete()
            except Exception:
                pass

        # Add new gallery images
        from apps.menu.models import MenuItemImage
        for f in request.FILES.getlist("gallery_add"):
            MenuItemImage.objects.create(menu_item=item, image=f)

        item.refresh_from_db()
        return ok({"item": MenuItemDetailSerializer(item, context={"request": request}).data, "message": "Updated."})

    def delete(self, request, item_id):
        item = self._get(request, item_id)
        if not item:
            return err("Item not found.", status.HTTP_404_NOT_FOUND)
        name = item.name
        item.delete()
        return ok({"message": f"'{name}' deleted."})


class AdminToggleAvailabilityView(APIView):
    """PATCH /api/v1/menu/admin/items/<id>/toggle/ — flip is_available."""
    permission_classes = [IsAdminOrAbove]

    def patch(self, request, item_id):
        from apps.accounts.models import Role
        try:
            item = MenuItem.objects.get(id=item_id)
            if request.user.role == Role.BRANCH_ADMIN and str(item.branch_id) != str(request.user.branch_id):
                return err("Item not found.", status.HTTP_404_NOT_FOUND)
        except MenuItem.DoesNotExist:
            return err("Item not found.", status.HTTP_404_NOT_FOUND)

        item.is_available = not item.is_available
        item.save(update_fields=["is_available"])
        state = "available" if item.is_available else "unavailable"
        return ok({"is_available": item.is_available, "message": f"{item.name} is now {state}."})


class AdminReviewReplyView(APIView):
    """PATCH /api/v1/menu/admin/reviews/<id>/reply/ — admin replies to a review."""
    permission_classes = [IsAdminOrAbove]

    def patch(self, request, review_id):
        from apps.menu.models import ItemReview
        from apps.accounts.models import Role
        try:
            review = ItemReview.objects.get(id=review_id)
            if request.user.role == Role.BRANCH_ADMIN and str(review.menu_item.branch_id) != str(request.user.branch_id):
                return err("Review not found.", status.HTTP_404_NOT_FOUND)
        except ItemReview.DoesNotExist:
            return err("Review not found.", status.HTTP_404_NOT_FOUND)

        reply = request.data.get("admin_reply", "").strip()
        review.admin_reply = reply
        review.save(update_fields=["admin_reply"])
        return ok({"message": "Reply saved."})


class AdminReviewListView(APIView):
    """
    GET  /api/v1/menu/admin/reviews/
    All reviews for the branch — paginated, filterable by item or rating.
    PATCH /api/v1/menu/admin/reviews/<id>/visibility/
    Toggle is_visible on a review (hide/show from customers).
    """
    permission_classes = [IsAdminOrAbove]

    def get(self, request):
        from apps.accounts.permissions import get_request_branch_id
        from apps.accounts.models import Role
        if request.user.role == Role.SUPER_ADMIN:
            qs = ItemReview.objects.select_related("menu_item", "menu_item__branch", "customer").order_by("-created_at")
            branch_id_param = request.query_params.get("branch_id")
            if branch_id_param:
                qs = qs.filter(menu_item__branch_id=branch_id_param)
        else:
            branch_id = get_request_branch_id(request)
            qs = ItemReview.objects.filter(
                menu_item__branch_id=branch_id
            ).select_related("menu_item", "menu_item__branch", "customer").order_by("-created_at")

        # Optional filters
        item_id = request.query_params.get("item_id")
        if item_id:
            qs = qs.filter(menu_item_id=item_id)

        rating = request.query_params.get("rating")
        if rating:
            qs = qs.filter(rating=int(rating))

        visible = request.query_params.get("visible")
        if visible == "true":
            qs = qs.filter(is_visible=True)
        elif visible == "false":
            qs = qs.filter(is_visible=False)

        data = [{
            "id":           str(r.id),
            "item_id":      str(r.menu_item_id),
            "item_name":    r.menu_item.name,
            "item_emoji":   r.menu_item.emoji,
            "branch_name":  r.menu_item.branch.name if r.menu_item.branch else "—",
            "customer_name": r.customer.name,
            "customer_phone": (r.customer.phone or "")[-4:].rjust(10, "•"),
            "rating":       r.rating,
            "comment":      r.comment,
            "admin_reply":  r.admin_reply,
            "is_visible":   r.is_visible,
            "photo_url": (lambda u: u if u.startswith("http") else request.build_absolute_uri(u))(r.photo.url) if r.photo else None,
            "created_at":   r.created_at.isoformat(),
        } for r in qs[:200]]

        return ok({"reviews": data, "count": len(data)})


class AdminReviewVisibilityView(APIView):
    """PATCH /api/v1/menu/admin/reviews/<id>/visibility/ — hide or show a review."""
    permission_classes = [IsAdminOrAbove]

    def patch(self, request, review_id):
        from apps.accounts.models import Role
        try:
            review = ItemReview.objects.get(id=review_id)
            if request.user.role == Role.BRANCH_ADMIN and str(review.menu_item.branch_id) != str(request.user.branch_id):
                return err("Review not found.", 404)
        except ItemReview.DoesNotExist:
            return err("Review not found.", 404)

        review.is_visible = not review.is_visible
        review.save(update_fields=["is_visible"])

        # Recompute cached avg_rating
        from django.db.models import Avg
        item = review.menu_item
        stats = item.reviews.filter(is_visible=True).aggregate(avg=Avg("rating"))
        item.avg_rating   = stats["avg"] or 0
        item.review_count = item.reviews.filter(is_visible=True).count()
        item.save(update_fields=["avg_rating", "review_count"])

        return ok({
            "is_visible": review.is_visible,
            "message": f"Review {'shown' if review.is_visible else 'hidden'}.",
        })
