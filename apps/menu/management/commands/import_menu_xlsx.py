"""
management/commands/import_menu_xlsx.py

Import menu categories + items from KNFCMENULIST.xlsx.

Column layout (KNFCMENULIST.xlsx):
    0  Category
    1  Subcategory      (ignored)
    2  Item_Number
    3  Item_Name
    4  Serving_Size     → stored as description
    5  Price            → selling / discounted price (what customer pays)
    6  Actual_Price     → MRP / original price (shown crossed-out on menu)

The command stores  Actual_Price  as  MenuItem.price  (the MRP that appears
crossed-out), then computes  discount %  from the difference so that
get_discounted_price() returns exactly the selling Price shown in the sheet.

Usage:
    python manage.py import_menu_xlsx
    python manage.py import_menu_xlsx --branch-id  <UUID>
    python manage.py import_menu_xlsx --branch-name "Branch B"
    python manage.py import_menu_xlsx --file KNFCMENU(KNFCMENU).csv.xlsx
"""
import os
import math
from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.files import File


# Default file — new price-list format
DEFAULT_XLSX = os.path.join(settings.BASE_DIR, "KNFCMENULIST.xlsx")

IMG_DIR     = os.path.join(settings.BASE_DIR, "MenuImage")
CAT_IMG_DIR = os.path.join(IMG_DIR, "Category")

# ── Column indices (0-based) ────────────────────────────────────────────────
COL_CATEGORY   = 0
COL_SUBCAT     = 1
COL_ITEM_NUM   = 2
COL_ITEM_NAME  = 3
COL_SERVING    = 4
COL_PRICE      = 5   # selling / offer price  (what customer pays)
COL_ACTUAL     = 6   # MRP / original price   (shown crossed-out)

# ── Category display order ──────────────────────────────────────────────────
CAT_ORDER = {
    "Fried Chicken": 1,
    "Buckets":       2,
    "Combo":         3,
    "Burger":        4,
    "Snacks":        5,
    "Fries":         6,
    "Mojito":        7,
    "Drinks":        8,
}

CAT_IMAGE_MAP = {
    "Fried Chicken": "Fried Chicken.png",
    "Buckets":       "Buckets.png",
    "Combo":         "Combo.png",
    "Burger":        "Burgers.png",
    "Snacks":        "Snacks.png",
    "Fries":         "Fries.png",
    "Mojito":        "Mojito.png",
    "Drinks":        "Drinks.png",
}

ITEM_IMAGE_MAP = {
    "Plain Fries":                          "Plain Fries.jpg",
    "Hot & Spicy Fries":                    "Hot & Spicy Fries.jpg",
    "Peri Peri Fries":                      "Peri peri Fries.png",
    "Mayo Loaded Fries with Popcorn":       "Mayo Loaded Fries with Popcorn.png",
    "Blue Mojito":                          "Blue Mojito.jpg",
    "Green Mojito":                         "Green Mojito.jpg",
    "Lime Mojito":                          "Lime Mojito.jpg",
    "Popcorn Chicken":                      "Chicken Popcorn.png",
    "Hot Wings":                            "Hot Wings.png",
    "Chicken Lollipop":                     "Chicken Lollipop.jpg",
    "Mini Wings":                           "Mini Wings.jpg",
    "Chicken Leg Piece":                    "Chicken Leg Piece.png",
    "Chicken Chest Piece":                  "Chicken Cheast Piece.png",
    "Veg Burger":                           "Veg Burger.jpg",
    "Fried Chicken Burger":                 "Fried Chicken Burger.jpg",
    "Fish Finger":                          "Fish Finger.jpg",
    "Crab Lollipop":                        "Crab Lollipop.png",
    "Crispy Roll":                          "Crispy Roll.png",
    "Crispy Momos":                         "Crispy Momos.png",
    "Cola (Coca Cola) 250ml":               "Cola (Coca Cola).png",
    "Cola (Coca Cola) 500ml":               "Cola (Coca Cola).png",
    "Cola (Coca Cola) 750ml":               "Cola (Coca Cola).png",
    "Sprite 250 ml":                        "Sprite 500ml.png",
    "Sprite 500 ml":                        "Sprite 500ml.png",
    "Lemonade 300 ml":                      "Lemonade 300ML.png",
    "Orange Juice 300 ml":                  "Orange Juice.png",
    "Mini Chicken Bucket":                  "Mini Chicken Bucket (6 pcs Mixed (Wings + Lollipop).png",
    "Family Chicken Bucket":                "Family Chicken Bucket.png",
    "Party Chicken Bucket":                 "Party Bucket.png",
    "Deluxe Bucket":                        "Deluxe Bucket.png",
    "Big Bucket Feast":                     "Big Bucket Feast.png",
    "Fries + Mojito":                       "Fries + Mojito.png",
    "Chicken Combo":                        "Chicken Combo.png",
    "Snacks Platter":                       "Snacks Platter.png",
    "Mini Bucket Combo":                    "Mini Bucket Combo.png",
    "Family Bucket Combo":                  "Family Bucket.png",
    "Party Bucket Combo":                   "Party Bucket Combo.png",
    "Family Feast":                         "Family Feast.png",
}


def _attach_image(instance, field_name, src_path):
    if not src_path or not os.path.exists(src_path):
        return
    fname = os.path.basename(src_path)
    with open(src_path, "rb") as f:
        getattr(instance, field_name).save(fname, File(f), save=False)


def _compute_discount_pct(selling: float, actual: float) -> int:
    """
    Return the nearest whole-number discount % that maps actual → selling.
    Returns 0 if actual <= selling (no discount) or either value is zero.
    """
    if not actual or not selling or actual <= selling:
        return 0
    raw = (1 - selling / actual) * 100
    return max(0, min(99, round(raw)))


class Command(BaseCommand):
    help = "Import menu from KNFCMENULIST.xlsx — stores MRP as price, computes discount %"

    def add_arguments(self, parser):
        parser.add_argument("--branch-id",   type=str, default=None, help="Branch UUID")
        parser.add_argument("--branch-name", type=str, default=None, help='Branch name, e.g. "Branch B"')
        parser.add_argument("--file",        type=str, default=None, help="Path to XLSX (default: KNFCMENULIST.xlsx)")
        parser.add_argument("--update",      action="store_true",    help="Update prices/discounts on existing items")

    def handle(self, *args, **options):
        try:
            import openpyxl
        except ImportError:
            self.stderr.write("openpyxl is required: pip install openpyxl")
            return

        from apps.menu.models import MenuCategory, MenuItem
        from apps.branches.models import Branch
        from django.utils.text import slugify

        # ── Resolve branch ───────────────────────────────────────────────────
        branch = None
        if options.get("branch_id"):
            try:
                branch = Branch.objects.get(id=options["branch_id"])
            except Branch.DoesNotExist:
                self.stderr.write(f"Branch ID {options['branch_id']} not found.")
                return

        if branch is None and options.get("branch_name"):
            branch = Branch.objects.filter(name__iexact=options["branch_name"]).first()
            if not branch:
                # Try partial match
                branch = Branch.objects.filter(name__icontains=options["branch_name"]).first()
            if not branch:
                self.stderr.write(f"No branch found matching '{options['branch_name']}'.")
                self.stdout.write("Available branches:")
                for b in Branch.objects.all():
                    self.stdout.write(f"  {b.name}  ({b.id})")
                return

        if branch is None:
            branch = Branch.objects.first()
            if not branch:
                self.stderr.write("No branch found. Create a branch first.")
                return

        self.stdout.write(f"Importing to branch: {branch.name}  ({branch.id})")

        # ── Load workbook ────────────────────────────────────────────────────
        xlsx_path = options.get("file") or DEFAULT_XLSX
        if not os.path.exists(xlsx_path):
            self.stderr.write(f"File not found: {xlsx_path}")
            return

        wb = openpyxl.load_workbook(xlsx_path)
        ws = wb.active
        self.stdout.write(f"Reading: {xlsx_path}  (sheet: {ws.title})")

        # ── Parse rows ───────────────────────────────────────────────────────
        data = {}          # {category_name: [{name, serving, selling, actual, discount}, ...]}
        current_cat = None

        for row in ws.iter_rows(min_row=2, values_only=True):
            if row[COL_CATEGORY]:
                current_cat = str(row[COL_CATEGORY]).strip()
            if current_cat is None:
                continue

            raw_name = row[COL_ITEM_NAME]
            if not raw_name or not isinstance(raw_name, str):
                continue

            name     = raw_name.strip()
            serving  = str(row[COL_SERVING] or "").strip()

            def _f(v):
                try:    return float(v)
                except: return 0.0

            selling = _f(row[COL_PRICE])
            actual  = _f(row[COL_ACTUAL]) if len(row) > COL_ACTUAL else 0.0
            # Fall back: if no Actual_Price column, treat selling as MRP (no discount)
            if not actual:
                actual = selling

            discount_pct = _compute_discount_pct(selling, actual)

            data.setdefault(current_cat, []).append({
                "name":         name,
                "serving":      serving,
                "selling":      selling,   # what customer pays
                "actual":       actual,    # MRP (stored as price, shown crossed-out)
                "discount_pct": discount_pct,
            })

        # ── Disambiguate duplicate item names (e.g. Cola 250ml/500ml) ────────
        for cat, items in data.items():
            name_counts = {}
            for it in items:
                name_counts[it["name"]] = name_counts.get(it["name"], 0) + 1
            for it in items:
                if name_counts[it["name"]] > 1 and it["serving"]:
                    size_tag = it["serving"].split()[0]
                    it["display_name"] = f"{it['name']} {size_tag}"
                else:
                    it["display_name"] = it["name"]

        # ── Create / update categories ────────────────────────────────────────
        categories    = {}
        update_mode   = options.get("update", False)

        for cat_name, items in data.items():
            order    = CAT_ORDER.get(cat_name, 99)
            slug     = slugify(cat_name)
            cat_obj  = (
                MenuCategory.objects.filter(branch=branch, slug=slug).first()
                or MenuCategory.objects.filter(branch=branch, name=cat_name).first()
            )
            created = False
            if cat_obj is None:
                cat_obj = MenuCategory(branch=branch, name=cat_name, slug=slug)
                created = True

            cat_obj.display_order = order
            cat_obj.is_active     = True
            if not cat_obj.slug:
                cat_obj.slug = slug

            img_file = CAT_IMAGE_MAP.get(cat_name)
            if img_file:
                img_path = os.path.join(CAT_IMG_DIR, img_file)
                if os.path.exists(img_path) and not cat_obj.image:
                    _attach_image(cat_obj, "image", img_path)

            cat_obj.save()
            categories[cat_name] = cat_obj
            self.stdout.write(f"  Category [{'created' if created else 'ok'}]: {cat_name}")

        # ── Create / update items ─────────────────────────────────────────────
        n_created = n_updated = n_skipped = 0

        for cat_name, items in data.items():
            cat_obj = categories[cat_name]
            for idx, it in enumerate(items):
                dname    = it["display_name"]
                raw      = it["name"]
                slug     = slugify(dname)
                actual   = it["actual"]      # MRP → stored as price
                disc_pct = it["discount_pct"]

                item_obj = (
                    MenuItem.objects.filter(branch=branch, slug=slug).first()
                    or MenuItem.objects.filter(branch=branch, name=dname).first()
                )

                if item_obj:
                    if update_mode:
                        item_obj.price        = actual
                        item_obj.discount     = disc_pct
                        item_obj.description  = it["serving"]
                        item_obj.category     = cat_obj
                        item_obj.display_order= idx + 1
                        item_obj.save()
                        n_updated += 1
                        self.stdout.write(
                            f"    [updated] {dname}  MRP=₹{actual}  selling=₹{it['selling']}  disc={disc_pct}%"
                        )
                    else:
                        n_skipped += 1
                    continue

                # New item
                item_obj = MenuItem(
                    branch=branch, name=dname, slug=slug,
                    category=cat_obj,
                    price=actual,            # MRP (shown crossed-out)
                    discount=disc_pct,       # % off → get_discounted_price() ≈ selling
                    description=it["serving"],
                    is_available=True,
                    display_order=idx + 1,
                )

                # Attach image
                img_file = ITEM_IMAGE_MAP.get(dname) or ITEM_IMAGE_MAP.get(raw)
                if img_file:
                    img_path = os.path.join(IMG_DIR, img_file)
                    if os.path.exists(img_path):
                        _attach_image(item_obj, "image", img_path)

                item_obj.save()
                n_created += 1
                self.stdout.write(
                    f"    [created] {dname}  MRP=₹{actual}  selling≈₹{it['selling']}  disc={disc_pct}%"
                )

        self.stdout.write(self.style.SUCCESS(
            f"\nDone! {n_created} created, {n_updated} updated, {n_skipped} skipped."
        ))
        if not update_mode and n_skipped:
            self.stdout.write("Tip: re-run with --update to refresh prices on existing items.")
