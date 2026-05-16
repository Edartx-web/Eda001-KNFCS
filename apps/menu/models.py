"""
apps/menu/models.py

Menu models — branch-scoped, image-capable, fully featured.

Models:
  MenuCategory      — Chicken, Drinks, Sides, Combos etc.
  MenuItem          — Individual product with image, price, dietary info
  ItemCustomisation — Add-on options per item (Extra Spicy, No Sauce)
  ItemReview        — Customer star ratings and photos
"""

import uuid
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


# ─── Dietary Constants ────────────────────────────────────────────────────────

class DietaryType(models.TextChoices):
    VEG     = "veg",      "Vegetarian"
    NON_VEG = "non_veg",  "Non-Vegetarian"
    VEGAN   = "vegan",    "Vegan"


class SpiceLevel(models.TextChoices):
    NONE   = "none",   "Not Applicable"
    MILD   = "mild",   "Mild"
    MEDIUM = "medium", "Medium"
    HOT    = "hot",    "Hot"
    EXTRA  = "extra",  "Extra Hot"


class MeasurementUnit(models.TextChoices):
    """
    How the item quantity is measured and displayed.
    Shown to customer as: '2 pcs', '250 ml', '300 g' etc.
    """
    PCS     = "pcs",     "Pieces"        # Chicken wings, burgers, rolls
    GRAM    = "g",       "Grams"          # Fries, sides, salads
    KG      = "kg",      "Kilograms"      # Large portions, bulk
    ML      = "ml",      "Millilitres"    # Small drinks, sauces
    LITRE   = "l",       "Litres"         # Juices, large beverages
    PORTION = "portion", "Portion"        # Set meals, combos
    BOX     = "box",     "Box"            # Meal boxes, family packs
    CUP     = "cup",     "Cup"            # Ice cream, small drinks


# ─── Menu Category ────────────────────────────────────────────────────────────

class MenuCategory(models.Model):
    """
    Top-level grouping of menu items per branch.
    e.g. Chicken Blast, Cool Drinks, Crispy Sides, Combo Deals
    """
    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch        = models.ForeignKey(
        "branches.Branch",
        on_delete=models.CASCADE,
        related_name="menu_categories",
    )
    name          = models.CharField(max_length=100)
    slug          = models.SlugField(max_length=100)
    description   = models.TextField(blank=True)

    # Category header image — shown on the category scene banner
    image         = models.ImageField(
        upload_to="categories/",
        null=True, blank=True,
        help_text="Banner image shown at the top of the category page"
    )

    # Emoji fallback when no image uploaded
    emoji         = models.CharField(max_length=8, default="🍽️")

    # Gradient colours for the category canvas scene (hex, no #)
    gradient_from = models.CharField(max_length=7, default="#1A0800")
    gradient_to   = models.CharField(max_length=7, default="#2D1200")

    display_order = models.PositiveSmallIntegerField(default=0)
    is_active     = models.BooleanField(default=True)
    # When True, this category is visible across ALL branches, not just its home branch
    all_branches  = models.BooleanField(default=False)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table  = "menu_categories"
        ordering  = ["display_order", "name"]
        unique_together = [("branch", "slug")]

    def __str__(self):
        return f"{self.branch.name} — {self.name}"


# ─── Menu Item ────────────────────────────────────────────────────────────────

class MenuItem(models.Model):
    """
    A single orderable product.
    Linked to a branch and category.
    Supports images, dietary info, ratings, and customisations.
    """
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch      = models.ForeignKey(
        "branches.Branch",
        on_delete=models.CASCADE,
        related_name="menu_items",
    )
    category    = models.ForeignKey(
        MenuCategory,
        on_delete=models.CASCADE,
        related_name="items",
    )

    # Core fields
    name        = models.CharField(max_length=150)
    slug        = models.SlugField(max_length=150)
    description = models.TextField(blank=True)
    price       = models.DecimalField(max_digits=8, decimal_places=2)

    # Images
    image       = models.ImageField(
        upload_to="menu_items/",
        null=True, blank=True,
        help_text="Primary product photo"
    )
    image_thumb = models.ImageField(
        upload_to="menu_items/thumbs/",
        null=True, blank=True,
        help_text="Auto-generated thumbnail (128×128)"
    )
    emoji       = models.CharField(max_length=8, default="🍽️")

    # Dietary
    dietary_type = models.CharField(
        max_length=10,
        choices=DietaryType.choices,
        default=DietaryType.NON_VEG,
    )
    spice_level  = models.CharField(
        max_length=10,
        choices=SpiceLevel.choices,
        default=SpiceLevel.MEDIUM,
    )
    calories     = models.PositiveSmallIntegerField(null=True, blank=True)

    # Stock — linked to StockRecord in stock app
    low_stock_threshold = models.PositiveSmallIntegerField(default=10)
    carries_over        = models.BooleanField(
        default=True,
        help_text="If True, remaining stock rolls over to the next day at midnight."
    )

    # Availability
    is_available    = models.BooleanField(default=True)
    is_featured     = models.BooleanField(default=False)
    is_new          = models.BooleanField(default=False)

    # Discount — percentage off (0-100). None = no discount.
    discount          = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text="Discount percentage, e.g. 20 = 20% off. Leave blank for no discount."
    )

    # Measurement unit — how quantity is expressed on the menu
    measurement_unit  = models.CharField(
        max_length=10,
        choices=MeasurementUnit.choices,
        default=MeasurementUnit.PCS,
        help_text="Unit used to describe quantity: pcs, g, kg, ml, l, portion, box, cup"
    )
    # Quantity value — the number that goes with the unit (e.g. 500 for 500g, 6 for 6 pcs)
    unit_quantity = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text="e.g. 500 (for 500g), 6 (for 6 pcs), 1 (for 1kg)"
    )

    # Bestseller badge — shown with a flame/star badge on the menu card
    is_bestseller     = models.BooleanField(default=False)

    # Home-page section flags — admin marks items to appear in themed sections
    is_hotdeals   = models.BooleanField(default=False, help_text="Appears in Hot Deals section on home page")
    is_chicken    = models.BooleanField(default=False, help_text="Appears in Chicken Items section on home page")
    is_snacks     = models.BooleanField(default=False, help_text="Appears in Snacks & Munchies section on home page")
    is_cold_drinks= models.BooleanField(default=False, help_text="Appears in Cold Drinks section on home page")

    # Rating cache — updated by signals when reviews are added
    avg_rating      = models.DecimalField(
        max_digits=3, decimal_places=2,
        default=0.00, validators=[MinValueValidator(0), MaxValueValidator(5)]
    )
    review_count    = models.PositiveIntegerField(default=0)

    # Prep time estimate (minutes)
    prep_time_min   = models.PositiveSmallIntegerField(default=8)
    prep_time_max   = models.PositiveSmallIntegerField(default=15)

    display_order   = models.PositiveSmallIntegerField(default=0)
    # When True, this item appears in menus across ALL branches
    all_branches    = models.BooleanField(default=False)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table  = "menu_items"
        ordering  = ["display_order", "name"]
        unique_together = [("branch", "slug")]
        indexes   = [
            models.Index(fields=["branch", "category"]),
            models.Index(fields=["branch", "is_available"]),
            models.Index(fields=["is_featured"]),
        ]

    def __str__(self):
        return f"{self.name} — ₹{self.price}"

    # ── Pricing helpers ──────────────────────────────────────────────
    def get_discounted_price(self):
        """Returns price after discount as Decimal. Same as price if no discount."""
        from decimal import Decimal, ROUND_HALF_UP
        if self.discount:
            factor = Decimal(self.discount) / Decimal(100)
            discounted = self.price * (Decimal('1') - factor)
            return discounted.quantize(Decimal('1'), rounding=ROUND_HALF_UP)
        return self.price.quantize(Decimal('1'), rounding=ROUND_HALF_UP)

    def get_total_price(self, quantity):
        """Total price for a given quantity at discounted rate."""
        return self.get_discounted_price() * quantity

    @property
    def savings_amount(self):
        """How much the customer saves. 0 if no discount."""
        return self.price - self.get_discounted_price() if self.discount else 0

    @property
    def image_url(self):
        """Returns image URL or None. Frontend uses emoji fallback."""
        if self.image:
            return self.image.url
        return None

    @property
    def dietary_dot(self):
        """Veg = green, Non-veg = red, Vegan = green outlined."""
        return {
            DietaryType.VEG:     "green",
            DietaryType.NON_VEG: "red",
            DietaryType.VEGAN:   "green",
        }.get(self.dietary_type, "gray")

    @property
    def prep_time_display(self):
        return f"{self.prep_time_min}–{self.prep_time_max} min"


# ─── Item Gallery Image ───────────────────────────────────────────────────────

class MenuItemImage(models.Model):
    """Additional gallery images for a menu item (beyond the primary image)."""
    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    menu_item = models.ForeignKey(
        MenuItem,
        on_delete=models.CASCADE,
        related_name="gallery_images",
    )
    image     = models.ImageField(upload_to="menu_items/gallery/")
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "menu_item_images"
        ordering = ["display_order"]

    @property
    def image_url(self):
        return self.image.url if self.image else None


# ─── Item Customisation ───────────────────────────────────────────────────────

class ItemCustomisation(models.Model):
    """
    Add-on options for a menu item.
    e.g. Extra Spicy (+₹0), Extra Sauce (+₹20), No Salt (+₹0)
    Customer selects these on the product detail page.
    """
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    menu_item   = models.ForeignKey(
        MenuItem,
        on_delete=models.CASCADE,
        related_name="customisations",
    )
    name        = models.CharField(max_length=100)   # "Extra Spicy"
    extra_price = models.DecimalField(
        max_digits=6, decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0)]
    )
    is_default  = models.BooleanField(default=False)
    display_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "item_customisations"
        ordering = ["display_order"]

    def __str__(self):
        price_str = f"+₹{self.extra_price}" if self.extra_price > 0 else "free"
        return f"{self.menu_item.name} — {self.name} ({price_str})"


# ─── Item Review ──────────────────────────────────────────────────────────────

class ItemReview(models.Model):
    """
    Customer review with star rating and optional photo.
    Avg rating is cached back on MenuItem via post_save signal.
    """
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    menu_item   = models.ForeignKey(
        MenuItem,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    customer    = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    order       = models.ForeignKey(
        "orders.Order",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="reviews",
    )

    rating      = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment     = models.TextField(blank=True)

    # Customer-uploaded review photo
    photo       = models.ImageField(
        upload_to="reviews/",
        null=True, blank=True,
    )

    admin_reply = models.TextField(blank=True)
    is_visible  = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table        = "item_reviews"
        ordering        = ["-created_at"]
        # One review per customer per order item
        unique_together = [("menu_item", "customer", "order")]

    def __str__(self):
        return f"{self.customer.name} → {self.menu_item.name} ({self.rating}★)"
