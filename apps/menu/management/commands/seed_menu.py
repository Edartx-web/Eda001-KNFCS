"""
apps/menu/management/commands/seed_menu.py

Seeds 10 categories × 15 items = 150 menu items with fully randomised data.
All prices, media (colour-gradient PNGs), dietary info, flags, and descriptions
are shuffled on every run so the UI looks realistic and varied.

Usage
-----
    # Seed into the first active branch
    python manage.py seed_menu

    # Seed into a specific branch
    python manage.py seed_menu --branch <branch_id or name>

    # Wipe previously seeded data, then re-seed
    python manage.py seed_menu --clear

    # Skip image generation (faster, no Pillow required)
    python manage.py seed_menu --no-images

Requirements
------------
    pip install Pillow          # for placeholder image generation
    (already in most Django envs)
"""

import io
import math
import random
import re

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.utils.text import slugify

# ── Seeded RNG — change SEED for a different shuffle ─────────────────────────
SEED = 42

# ── Category definitions (10) ─────────────────────────────────────────────────
CATEGORIES = [
    {
        "name": "Chicken Blast",
        "description": "Our signature fried chicken — crispy outside, juicy inside. Every piece made to order.",
        "emoji": "🍗",
        "gradient_from": "#1A0500",
        "gradient_to":   "#3D1000",
        "accent": "#E8521A",
        "is_chicken": True,
    },
    {
        "name": "Combo Deals",
        "description": "Best value meals — chicken + sides + drink bundled at an unbeatable price.",
        "emoji": "🎁",
        "gradient_from": "#0A1A00",
        "gradient_to":   "#1A3D00",
        "accent": "#4CAF50",
        "is_chicken": True,
    },
    {
        "name": "Crispy Sides",
        "description": "Golden fries, onion rings, coleslaw and more — the perfect companions.",
        "emoji": "🍟",
        "gradient_from": "#1A1200",
        "gradient_to":   "#3D2900",
        "accent": "#FFC107",
        "is_snacks": True,
    },
    {
        "name": "Cool Drinks",
        "description": "Refreshing beverages — from classic colas to fresh lemonade and iced teas.",
        "emoji": "🥤",
        "gradient_from": "#001A1A",
        "gradient_to":   "#003D3D",
        "accent": "#00BCD4",
        "is_cold_drinks": True,
    },
    {
        "name": "Sauces & Dips",
        "description": "House-made dipping sauces — smoky BBQ, garlic mayo, spicy sriracha and more.",
        "emoji": "🫙",
        "gradient_from": "#1A000A",
        "gradient_to":   "#3D0015",
        "accent": "#E91E63",
        "is_snacks": True,
    },
    {
        "name": "Wraps & Rolls",
        "description": "Soft tortilla wraps packed with crispy chicken, fresh veggies and signature sauces.",
        "emoji": "🌯",
        "gradient_from": "#0A001A",
        "gradient_to":   "#1A003D",
        "accent": "#9C27B0",
        "is_chicken": True,
    },
    {
        "name": "Burgers",
        "description": "Towering stacked burgers — double patties, crispy chicken and gourmet toppings.",
        "emoji": "🍔",
        "gradient_from": "#1A0800",
        "gradient_to":   "#2D1200",
        "accent": "#FF5722",
        "is_hotdeals": True,
    },
    {
        "name": "Family Packs",
        "description": "Feed the whole family — shareable boxes of chicken, sides and drinks for 4–8.",
        "emoji": "📦",
        "gradient_from": "#001A0A",
        "gradient_to":   "#003D15",
        "accent": "#8BC34A",
        "is_hotdeals": True,
    },
    {
        "name": "Desserts",
        "description": "Sweet endings — ice cream cups, churros, waffles and seasonal specials.",
        "emoji": "🍦",
        "gradient_from": "#1A001A",
        "gradient_to":   "#2D002D",
        "accent": "#FF4081",
    },
    {
        "name": "Snacks & Munchies",
        "description": "Quick bites for when you're a little hungry — popcorn chicken, nuggets, corn.",
        "emoji": "🍿",
        "gradient_from": "#0A0A00",
        "gradient_to":   "#1F1F00",
        "accent": "#CDDC39",
        "is_snacks": True,
    },
]

# ── Item templates per category (15 per category) ─────────────────────────────
ITEMS_BY_CATEGORY = {
    "Chicken Blast": [
        ("Classic Fried Chicken",    "non_veg", "medium",  "pcs",     2,   [99,  119, 129]),
        ("Spicy Hot Wings",          "non_veg", "hot",     "pcs",     6,   [149, 169, 179]),
        ("Crispy Drumsticks",        "non_veg", "medium",  "pcs",     4,   [179, 199, 219]),
        ("Zinger Strips",            "non_veg", "hot",     "pcs",     5,   [159, 179, 189]),
        ("Butter Chicken Bites",     "non_veg", "mild",    "pcs",     8,   [189, 209, 229]),
        ("Pepper Crunch Thighs",     "non_veg", "extra",   "pcs",     2,   [139, 149, 159]),
        ("Juicy Breast Fillet",      "non_veg", "mild",    "pcs",     1,   [129, 139, 149]),
        ("Nashville Hot Chicken",    "non_veg", "extra",   "pcs",     3,   [199, 219, 239]),
        ("Garlic Parmesan Wings",    "non_veg", "none",    "pcs",     6,   [169, 189, 199]),
        ("Honey BBQ Drumettes",      "non_veg", "mild",    "pcs",     6,   [159, 179, 189]),
        ("Korean Fried Chicken",     "non_veg", "hot",     "pcs",     5,   [209, 229, 249]),
        ("Coconut Crusted Bites",    "non_veg", "mild",    "pcs",     8,   [179, 199, 209]),
        ("Lemon Herb Strips",        "non_veg", "none",    "pcs",     5,   [149, 169, 179]),
        ("Double Crispy Legs",       "non_veg", "medium",  "pcs",     2,   [119, 139, 149]),
        ("KNFC Signature Platter",   "non_veg", "medium",  "portion", 1,   [299, 329, 349]),
    ],
    "Combo Deals": [
        ("Classic Combo",            "non_veg", "medium",  "portion", 1,   [199, 219, 239]),
        ("Spicy Lover Combo",        "non_veg", "hot",     "portion", 1,   [219, 239, 259]),
        ("Family Feast Combo",       "non_veg", "medium",  "portion", 1,   [499, 549, 599]),
        ("Duo Share Box",            "non_veg", "medium",  "portion", 1,   [329, 359, 389]),
        ("Lunch Special Combo",      "non_veg", "mild",    "portion", 1,   [179, 199, 219]),
        ("Zinger Combo",             "non_veg", "hot",     "portion", 1,   [249, 269, 289]),
        ("Veggie Combo",             "veg",     "mild",    "portion", 1,   [169, 189, 209]),
        ("Kids Meal Combo",          "non_veg", "mild",    "portion", 1,   [149, 159, 169]),
        ("Midnight Snack Pack",      "non_veg", "medium",  "portion", 1,   [269, 289, 309]),
        ("Triple Treat Combo",       "non_veg", "medium",  "portion", 1,   [379, 399, 429]),
        ("Date Night Box",           "non_veg", "medium",  "portion", 1,   [449, 479, 499]),
        ("Crispy & Saucy Combo",     "non_veg", "hot",     "portion", 1,   [259, 279, 299]),
        ("BBQ Fiesta Combo",         "non_veg", "medium",  "portion", 1,   [299, 329, 349]),
        ("Premium Chicken Combo",    "non_veg", "medium",  "portion", 1,   [349, 379, 399]),
        ("Budget Bites Combo",       "non_veg", "mild",    "portion", 1,   [129, 149, 159]),
    ],
    "Crispy Sides": [
        ("Masala Fries",             "veg",     "medium",  "g",      250,  [59,  69,  79 ]),
        ("Classic Waffle Fries",     "veg",     "mild",    "g",      250,  [69,  79,  89 ]),
        ("Onion Rings",              "veg",     "mild",    "pcs",    8,    [79,  89,  99 ]),
        ("Coleslaw Cup",             "veg",     "none",    "g",      150,  [49,  59,  69 ]),
        ("Corn on the Cob",          "veg",     "mild",    "pcs",    1,    [49,  59,  69 ]),
        ("Cheesy Hash Browns",       "veg",     "mild",    "pcs",    3,    [79,  89,  99 ]),
        ("Peri Peri Fries",          "veg",     "hot",     "g",      250,  [79,  89,  99 ]),
        ("Garlic Bread",             "veg",     "none",    "pcs",    4,    [59,  69,  79 ]),
        ("Mac & Cheese Cup",         "veg",     "none",    "g",      200,  [99,  109, 119]),
        ("Crispy Mushrooms",         "veg",     "mild",    "pcs",    6,    [89,  99,  109]),
        ("Loaded Potato Wedges",     "veg",     "medium",  "g",      300,  [99,  109, 119]),
        ("Jalapeño Poppers",         "veg",     "hot",     "pcs",    5,    [89,  99,  109]),
        ("Mozzarella Sticks",        "veg",     "none",    "pcs",    4,    [99,  109, 119]),
        ("Sweet Potato Fries",       "veg",     "none",    "g",      200,  [79,  89,  99 ]),
        ("Chilli Cheese Fries",      "veg",     "hot",     "g",      300,  [109, 119, 129]),
    ],
    "Cool Drinks": [
        ("Classic Pepsi",            "veg",     "none",    "ml",     350,  [39,  49,  59 ]),
        ("Fresh Lime Soda",          "veg",     "none",    "ml",     400,  [59,  69,  79 ]),
        ("Mango Lassi",              "veg",     "none",    "ml",     350,  [69,  79,  89 ]),
        ("Iced Lemon Tea",           "veg",     "none",    "ml",     400,  [59,  69,  79 ]),
        ("Strawberry Milkshake",     "veg",     "none",    "ml",     350,  [89,  99,  109]),
        ("Chocolate Frappe",         "veg",     "none",    "ml",     400,  [99,  109, 119]),
        ("Virgin Mojito",            "veg",     "none",    "ml",     350,  [79,  89,  99 ]),
        ("Watermelon Cooler",        "veg",     "none",    "ml",     400,  [69,  79,  89 ]),
        ("Masala Chaas",             "veg",     "mild",    "ml",     300,  [39,  49,  59 ]),
        ("Cold Coffee",              "veg",     "none",    "ml",     350,  [79,  89,  99 ]),
        ("Guava Punch",              "veg",     "none",    "ml",     350,  [59,  69,  79 ]),
        ("Blue Lagoon",              "veg",     "none",    "ml",     400,  [79,  89,  99 ]),
        ("Pineapple Crush",          "veg",     "none",    "ml",     350,  [59,  69,  79 ]),
        ("Rose Milk",                "veg",     "none",    "ml",     300,  [49,  59,  69 ]),
        ("Sparkling Water",          "veg",     "none",    "ml",     500,  [29,  39,  49 ]),
    ],
    "Sauces & Dips": [
        ("Smoky BBQ Sauce",          "veg",     "mild",    "ml",     60,   [29,  39,  49 ]),
        ("Garlic Mayo Dip",          "veg",     "none",    "ml",     60,   [29,  39,  49 ]),
        ("Spicy Sriracha Dip",       "veg",     "hot",     "ml",     60,   [29,  39,  49 ]),
        ("Honey Mustard",            "veg",     "none",    "ml",     60,   [29,  39,  49 ]),
        ("Ranch Dip",                "veg",     "none",    "ml",     60,   [29,  39,  49 ]),
        ("Peri Peri Sauce",          "veg",     "extra",   "ml",     60,   [39,  49,  59 ]),
        ("Chipotle Mayo",            "veg",     "medium",  "ml",     60,   [39,  49,  59 ]),
        ("Sweet Chilli Sauce",       "veg",     "mild",    "ml",     80,   [29,  39,  49 ]),
        ("Cheese Sauce Cup",         "veg",     "none",    "ml",     80,   [49,  59,  69 ]),
        ("Tomato Ketchup",           "veg",     "none",    "ml",     60,   [19,  29,  39 ]),
        ("Mint Chutney",             "veg",     "mild",    "ml",     60,   [19,  29,  39 ]),
        ("Schezwan Dip",             "veg",     "hot",     "ml",     60,   [29,  39,  49 ]),
        ("Tamarind Sauce",           "veg",     "mild",    "ml",     60,   [19,  29,  39 ]),
        ("Buffalo Hot Sauce",        "veg",     "extra",   "ml",     60,   [39,  49,  59 ]),
        ("Yoghurt Tzatziki",         "veg",     "none",    "ml",     80,   [49,  59,  69 ]),
    ],
    "Wraps & Rolls": [
        ("Classic Chicken Wrap",     "non_veg", "mild",    "pcs",    1,    [129, 149, 169]),
        ("Spicy Crunch Wrap",        "non_veg", "hot",     "pcs",    1,    [149, 169, 189]),
        ("Paneer Tikka Roll",        "veg",     "medium",  "pcs",    1,    [119, 139, 159]),
        ("BBQ Chicken Roll",         "non_veg", "medium",  "pcs",    1,    [139, 159, 179]),
        ("Caesar Wrap",              "non_veg", "none",    "pcs",    1,    [149, 169, 189]),
        ("Egg & Cheese Roll",        "veg",     "mild",    "pcs",    1,    [99,  119, 129]),
        ("Fiery Zinger Wrap",        "non_veg", "extra",   "pcs",    1,    [159, 179, 199]),
        ("Grilled Chicken Burrito",  "non_veg", "medium",  "pcs",    1,    [169, 189, 209]),
        ("Veg Loaded Wrap",          "veg",     "mild",    "pcs",    1,    [109, 129, 149]),
        ("Tandoori Chicken Roll",    "non_veg", "medium",  "pcs",    1,    [139, 159, 179]),
        ("Shawarma Wrap",            "non_veg", "medium",  "pcs",    1,    [149, 169, 189]),
        ("Mexican Crunch Roll",      "non_veg", "hot",     "pcs",    1,    [159, 179, 199]),
        ("Club Sandwich Roll",       "non_veg", "none",    "pcs",    1,    [139, 159, 169]),
        ("Double Chicken Wrap",      "non_veg", "medium",  "pcs",    1,    [179, 199, 219]),
        ("Cheese & Corn Roll",       "veg",     "none",    "pcs",    1,    [99,  109, 119]),
    ],
    "Burgers": [
        ("Classic Chicken Burger",   "non_veg", "mild",    "pcs",    1,    [99,  119, 139]),
        ("Spicy Zinger Burger",      "non_veg", "hot",     "pcs",    1,    [129, 149, 169]),
        ("Double Patty Burger",      "non_veg", "medium",  "pcs",    1,    [169, 189, 209]),
        ("Veg Supreme Burger",       "veg",     "mild",    "pcs",    1,    [99,  109, 119]),
        ("Smoky BBQ Tower",          "non_veg", "medium",  "pcs",    1,    [189, 209, 229]),
        ("Nashville Burger",         "non_veg", "extra",   "pcs",    1,    [199, 219, 239]),
        ("Cheese Burst Burger",      "non_veg", "medium",  "pcs",    1,    [149, 169, 189]),
        ("Crispy Mushroom Burger",   "veg",     "mild",    "pcs",    1,    [119, 129, 139]),
        ("Korean Crunch Burger",     "non_veg", "hot",     "pcs",    1,    [179, 199, 219]),
        ("Club House Burger",        "non_veg", "mild",    "pcs",    1,    [159, 179, 199]),
        ("Paneer Tikka Burger",      "veg",     "medium",  "pcs",    1,    [119, 139, 159]),
        ("Grilled Chicken Burger",   "non_veg", "none",    "pcs",    1,    [129, 149, 169]),
        ("Jalapeño Fiesta Burger",   "non_veg", "extra",   "pcs",    1,    [159, 179, 199]),
        ("Avocado Chicken Burger",   "non_veg", "mild",    "pcs",    1,    [199, 219, 239]),
        ("Mini Slider Pack",         "non_veg", "mild",    "pcs",    3,    [149, 169, 189]),
    ],
    "Family Packs": [
        ("Family Feast Box — 4 pax", "non_veg", "medium",  "box",    1,    [499, 549, 599]),
        ("Super Family Pack — 6 pax","non_veg", "medium",  "box",    1,    [699, 749, 799]),
        ("Party Pack — 8 pax",       "non_veg", "medium",  "box",    1,    [899, 949, 999]),
        ("Chicken Bucket 12 pcs",    "non_veg", "medium",  "pcs",    12,   [549, 579, 599]),
        ("Chicken Bucket 18 pcs",    "non_veg", "medium",  "pcs",    18,   [749, 799, 849]),
        ("Spicy Bucket 10 pcs",      "non_veg", "hot",     "pcs",    10,   [499, 529, 549]),
        ("Mix Bucket — 16 pcs",      "non_veg", "medium",  "pcs",    16,   [699, 749, 779]),
        ("Combo Family Box",         "non_veg", "medium",  "box",    1,    [599, 649, 699]),
        ("Kiddie Party Pack",        "non_veg", "mild",    "box",    1,    [399, 429, 449]),
        ("Sharebox — Wings + Fries", "non_veg", "medium",  "box",    1,    [449, 479, 499]),
        ("Office Party Pack — 10 pax","non_veg","medium",  "box",    1,    [999,1049,1099]),
        ("Boneless Family Box",      "non_veg", "medium",  "box",    1,    [649, 699, 749]),
        ("Wings Feast — 24 pcs",     "non_veg", "hot",     "pcs",    24,   [799, 849, 899]),
        ("Value Combo Pack — 4 pax", "non_veg", "mild",    "box",    1,    [449, 479, 499]),
        ("Premium Celebration Box",  "non_veg", "medium",  "box",    1,    [1199,1249,1299]),
    ],
    "Desserts": [
        ("Vanilla Ice Cream Cup",    "veg",     "none",    "cup",    1,    [49,  59,  69 ]),
        ("Chocolate Brownie",        "veg",     "none",    "pcs",    1,    [79,  89,  99 ]),
        ("Churros (5 pcs)",          "veg",     "none",    "pcs",    5,    [89,  99,  109]),
        ("Waffle with Ice Cream",    "veg",     "none",    "pcs",    1,    [129, 139, 149]),
        ("Mango Kulfi",              "veg",     "none",    "pcs",    1,    [59,  69,  79 ]),
        ("Choco Lava Cake",          "veg",     "none",    "pcs",    1,    [109, 119, 129]),
        ("Oreo Milkshake",           "veg",     "none",    "ml",     350,  [99,  109, 119]),
        ("Strawberry Cheesecake",    "veg",     "none",    "pcs",    1,    [119, 129, 149]),
        ("Gulab Jamun (3 pcs)",      "veg",     "none",    "pcs",    3,    [59,  69,  79 ]),
        ("Caramel Flan",             "veg",     "none",    "pcs",    1,    [89,  99,  109]),
        ("Belgian Waffle",           "veg",     "none",    "pcs",    1,    [119, 129, 139]),
        ("Nutella Dip + Churros",    "veg",     "none",    "portion",1,    [129, 139, 149]),
        ("Ice Cream Sundae",         "veg",     "none",    "cup",    1,    [99,  109, 119]),
        ("Rasgulla (2 pcs)",         "veg",     "none",    "pcs",    2,    [49,  59,  69 ]),
        ("Tiramisu Cup",             "veg",     "none",    "cup",    1,    [129, 139, 149]),
    ],
    "Snacks & Munchies": [
        ("Popcorn Chicken",          "non_veg", "mild",    "g",      150,  [99,  109, 119]),
        ("Chicken Nuggets 6 pcs",    "non_veg", "mild",    "pcs",    6,    [89,  99,  109]),
        ("Chicken Nuggets 12 pcs",   "non_veg", "mild",    "pcs",    12,   [159, 169, 179]),
        ("Peri Peri Popcorn",        "non_veg", "hot",     "g",      150,  [109, 119, 129]),
        ("Corn Ribs",                "veg",     "mild",    "pcs",    4,    [79,  89,  99 ]),
        ("Veg Nuggets",              "veg",     "mild",    "pcs",    6,    [79,  89,  99 ]),
        ("Spicy Crunch Bites",       "non_veg", "hot",     "g",      150,  [109, 119, 129]),
        ("Masala Peanuts",           "veg",     "medium",  "g",      100,  [39,  49,  59 ]),
        ("Cheesy Nachos",            "veg",     "mild",    "g",      150,  [99,  109, 119]),
        ("Mini Samosas (5 pcs)",     "veg",     "medium",  "pcs",    5,    [79,  89,  99 ]),
        ("Chicken Seekh Kebab",      "non_veg", "medium",  "pcs",    3,    [129, 139, 149]),
        ("Crispy Corn",              "veg",     "mild",    "g",      150,  [79,  89,  99 ]),
        ("Spring Rolls (3 pcs)",     "veg",     "mild",    "pcs",    3,    [79,  89,  99 ]),
        ("Chicken Lollipop (4 pcs)", "non_veg", "hot",     "pcs",    4,    [149, 159, 169]),
        ("Mix Veg Platter",          "veg",     "mild",    "portion",1,    [129, 139, 149]),
    ],
}

# ── Descriptive sentences (shuffled per item) ──────────────────────────────────
DESC_TEMPLATES = [
    "Freshly prepared with premium ingredients and cooked to perfection.",
    "A crowd favourite — crispy, flavourful and impossible to resist.",
    "Made in-house with our signature spice blend and secret seasoning.",
    "Perfectly portioned for a satisfying meal any time of day.",
    "A KNFC classic loved by customers across all our branches.",
    "Golden and crunchy on the outside, tender and juicy on the inside.",
    "Pairs perfectly with our house sauces — ask for your favourite.",
    "Available for dine-in or pickup — best enjoyed fresh.",
    "A chef's recommendation — don't miss this one!",
    "Crafted with care using locally sourced ingredients.",
    "Bursting with bold flavour in every single bite.",
    "Light yet filling — the ideal quick snack or full meal.",
    "Generously portioned and great value for money.",
    "Our kitchen's pride — prepared fresh for every order.",
    "The ultimate comfort food, KNFC style.",
]

# ── Gradient palette for images ───────────────────────────────────────────────
IMAGE_PALETTES = [
    ("#E8521A", "#FF8C42"),   # KNFC orange
    ("#C62828", "#EF5350"),   # red
    ("#F57F17", "#FFCA28"),   # amber
    ("#1B5E20", "#43A047"),   # green
    ("#0D47A1", "#1E88E5"),   # blue
    ("#4A148C", "#7B1FA2"),   # purple
    ("#006064", "#00ACC1"),   # teal
    ("#BF360C", "#FF7043"),   # deep orange
    ("#37474F", "#607D8B"),   # blue-grey
    ("#1A237E", "#3949AB"),   # indigo
]


def _make_image(label: str, palette: tuple, size: int = 600) -> bytes:
    """Generate a colour-gradient PNG with centred label text using Pillow."""
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        return b""

    top_hex, bot_hex = palette

    def _hex(h):
        h = h.lstrip("#")
        return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

    top = _hex(top_hex)
    bot = _hex(bot_hex)

    img  = Image.new("RGB", (size, size))
    draw = ImageDraw.Draw(img)

    for y in range(size):
        t  = y / size
        r  = int(top[0] + (bot[0] - top[0]) * t)
        g  = int(top[1] + (bot[1] - top[1]) * t)
        b  = int(top[2] + (bot[2] - top[2]) * t)
        draw.line([(0, y), (size, y)], fill=(r, g, b))

    # Label (wrap long names)
    words  = label.split()
    lines  = []
    line   = ""
    for w in words:
        test = (line + " " + w).strip()
        if len(test) <= 14:
            line = test
        else:
            if line:
                lines.append(line)
            line = w
    if line:
        lines.append(line)

    font_size = max(28, size // (max(len(lines), 1) + 3))
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except Exception:
        font = ImageFont.load_default()

    total_h = len(lines) * (font_size + 8)
    y_start = (size - total_h) // 2

    for i, ln in enumerate(lines):
        try:
            bbox = draw.textbbox((0, 0), ln, font=font)
            tw   = bbox[2] - bbox[0]
        except AttributeError:
            tw = len(ln) * font_size // 2
        x = (size - tw) // 2
        y = y_start + i * (font_size + 8)
        draw.text((x + 2, y + 2), ln, fill=(0, 0, 0, 120), font=font)
        draw.text((x, y),         ln, fill=(255, 255, 255), font=font)

    # KNFC watermark bottom-right
    wm = "KNFC"
    wm_size = max(16, size // 20)
    try:
        wm_font = ImageFont.truetype("arial.ttf", wm_size)
    except Exception:
        wm_font = ImageFont.load_default()
    try:
        wb = draw.textbbox((0, 0), wm, font=wm_font)
        ww = wb[2] - wb[0]
    except AttributeError:
        ww = len(wm) * wm_size // 2
    draw.text((size - ww - 16, size - wm_size - 16), wm,
              fill=(255, 255, 255, 160), font=wm_font)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def _slug(name: str) -> str:
    return slugify(name)


class Command(BaseCommand):
    help = "Seed 10 categories × 15 items = 150 menu items with randomised data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--branch",
            default=None,
            help="Branch ID (UUID) or branch name. Defaults to the first active branch.",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete previously seeded categories and items before seeding.",
        )
        parser.add_argument(
            "--no-images",
            action="store_true",
            help="Skip placeholder image generation (faster, no Pillow required).",
        )
        parser.add_argument(
            "--seed",
            type=int,
            default=SEED,
            help=f"RNG seed for shuffle. Change to get different random values. Default: {SEED}",
        )

    def handle(self, *args, **options):
        from apps.menu.models import MenuCategory, MenuItem, ItemCustomisation
        from apps.branches.models import Branch

        rng = random.Random(options["seed"])
        with_images = not options["no_images"]

        # ── Resolve branch ────────────────────────────────────────────────────
        branch_arg = options["branch"]
        if branch_arg:
            try:
                branch = Branch.objects.get(id=branch_arg)
            except (Branch.DoesNotExist, Exception):
                try:
                    branch = Branch.objects.get(name__icontains=branch_arg)
                except Branch.DoesNotExist:
                    raise CommandError(f"Branch not found: '{branch_arg}'")
        else:
            branch = Branch.objects.filter(is_active=True).first()
            if not branch:
                raise CommandError(
                    "No active branch found. Create a branch first:\n"
                    "  python manage.py shell -c \"from apps.branches.models import Branch; "
                    "Branch.objects.create(name='Main Branch', address='KNFC HQ')\""
                )

        self.stdout.write(f"\nTarget branch: {self.style.SUCCESS(branch.name)} ({branch.id})\n")

        # ── Optionally clear previous seed data ───────────────────────────────
        if options["clear"]:
            seeded = MenuCategory.objects.filter(
                branch=branch,
                name__in=[c["name"] for c in CATEGORIES],
            )
            count_items = MenuItem.objects.filter(
                branch=branch,
                category__in=seeded,
            ).count()
            seeded.delete()
            self.stdout.write(
                self.style.WARNING(f"Cleared {count_items} items and {len(CATEGORIES)} categories.")
            )

        # ── Check Pillow ──────────────────────────────────────────────────────
        if with_images:
            try:
                import PIL  # noqa
                self.stdout.write("Pillow found — generating placeholder images.\n")
            except ImportError:
                self.stdout.write(
                    self.style.WARNING(
                        "Pillow not installed. Skipping images. "
                        "Install with: pip install Pillow\n"
                    )
                )
                with_images = False

        # ── Seed ─────────────────────────────────────────────────────────────
        total_items   = 0
        total_cats    = 0
        palette_pool  = IMAGE_PALETTES[:]
        desc_pool     = DESC_TEMPLATES[:]

        for cat_idx, cat_def in enumerate(CATEGORIES):
            cat_name = cat_def["name"]

            # ── Shuffle display order randomly ────────────────────────────────
            display_order = rng.randint(0, 99)

            # ── Category image ────────────────────────────────────────────────
            palette = rng.choice(palette_pool)
            cat_image_bytes = b""
            if with_images:
                cat_image_bytes = _make_image(cat_name, palette, size=800)

            # ── Create / update category ──────────────────────────────────────
            cat, created = MenuCategory.objects.get_or_create(
                branch=branch,
                name=cat_name,
                defaults={
                    "slug":          _slug(cat_name),
                    "description":   cat_def["description"],
                    "emoji":         cat_def["emoji"],
                    "gradient_from": cat_def["gradient_from"],
                    "gradient_to":   cat_def["gradient_to"],
                    "display_order": display_order,
                    "is_active":     True,
                    "all_branches":  False,
                },
            )
            if not created:
                cat.description   = cat_def["description"]
                cat.emoji         = cat_def["emoji"]
                cat.gradient_from = cat_def["gradient_from"]
                cat.gradient_to   = cat_def["gradient_to"]
                cat.display_order = display_order
                cat.save()

            if with_images and cat_image_bytes:
                cat.image.save(
                    f"cat_{_slug(cat_name)}.png",
                    ContentFile(cat_image_bytes),
                    save=True,
                )

            verb = "Created" if created else "Updated"
            self.stdout.write(f"  [{cat_idx+1:02d}/10] {verb} category: {self.style.SUCCESS(cat_name)}")
            total_cats += 1

            # ── Items ─────────────────────────────────────────────────────────
            item_defs = ITEMS_BY_CATEGORY.get(cat_name, [])
            rng.shuffle(item_defs)          # shuffle item ORDER within category

            for item_idx, (name, dietary, spice, unit, unit_qty, price_options) in enumerate(item_defs):

                # Shuffle all the "interesting" fields
                price       = rng.choice(price_options)
                discount    = rng.choice([None, None, None, 10, 15, 20, 25, 30])
                calories    = rng.choice([None, None, rng.randint(120, 850)])
                prep_min    = rng.randint(5, 12)
                prep_max    = prep_min + rng.randint(3, 10)
                is_featured = rng.random() < 0.15
                is_new      = rng.random() < 0.20
                is_bestseller = rng.random() < 0.20
                is_hotdeals = cat_def.get("is_hotdeals", False) and rng.random() < 0.40
                is_chicken  = cat_def.get("is_chicken", False)  and rng.random() < 0.60
                is_snacks   = cat_def.get("is_snacks", False)   and rng.random() < 0.50
                is_cold_drinks = cat_def.get("is_cold_drinks", False)

                threshold   = rng.randint(5, 20)
                description = rng.choice(desc_pool)

                # Unique slug per branch
                base_slug = _slug(name)
                slug = base_slug
                counter = 1
                while MenuItem.objects.filter(branch=branch, slug=slug).exclude(name=name).exists():
                    slug = f"{base_slug}-{counter}"
                    counter += 1

                item, item_created = MenuItem.objects.get_or_create(
                    branch=branch,
                    name=name,
                    defaults={
                        "category":          cat,
                        "slug":              slug,
                        "description":       description,
                        "price":             price,
                        "dietary_type":      dietary,
                        "spice_level":       spice,
                        "calories":          calories,
                        "measurement_unit":  unit,
                        "unit_quantity":     unit_qty,
                        "discount":          discount,
                        "prep_time_min":     prep_min,
                        "prep_time_max":     prep_max,
                        "is_available":      True,
                        "is_featured":       is_featured,
                        "is_new":            is_new,
                        "is_bestseller":     is_bestseller,
                        "is_hotdeals":       is_hotdeals,
                        "is_chicken":        is_chicken,
                        "is_snacks":         is_snacks,
                        "is_cold_drinks":    is_cold_drinks,
                        "low_stock_threshold": threshold,
                        "display_order":     item_idx,
                    },
                )

                if not item_created:
                    # Update shuffled fields on existing items
                    item.category      = cat
                    item.description   = description
                    item.price         = price
                    item.discount      = discount
                    item.calories      = calories
                    item.prep_time_min = prep_min
                    item.prep_time_max = prep_max
                    item.is_featured   = is_featured
                    item.is_new        = is_new
                    item.is_bestseller = is_bestseller
                    item.is_hotdeals   = is_hotdeals
                    item.is_chicken    = is_chicken
                    item.is_snacks     = is_snacks
                    item.is_cold_drinks= is_cold_drinks
                    item.save()

                # ── Item image ────────────────────────────────────────────────
                if with_images and (item_created or not item.image):
                    item_palette    = rng.choice(IMAGE_PALETTES)
                    item_img_bytes  = _make_image(name, item_palette, size=600)
                    if item_img_bytes:
                        item.image.save(
                            f"item_{_slug(name)}_{rng.randint(100,999)}.png",
                            ContentFile(item_img_bytes),
                            save=True,
                        )

                # ── Customisation options (1–3 per item) ──────────────────────
                if item_created:
                    CUSTOMISATIONS = {
                        "non_veg": [
                            ("Extra Crispy", 0),
                            ("Less Spicy",   0),
                            ("Extra Spicy",  0),
                            ("Extra Sauce",  20),
                            ("No Onions",    0),
                            ("Add Cheese",   30),
                        ],
                        "veg": [
                            ("Extra Crispy",  0),
                            ("Less Spicy",    0),
                            ("Extra Cheese",  20),
                            ("No Onions",     0),
                            ("Add Jalapeño",  15),
                        ],
                    }
                    pool  = CUSTOMISATIONS.get(dietary, CUSTOMISATIONS["veg"])
                    chosen = rng.sample(pool, k=rng.randint(1, min(3, len(pool))))
                    for order_idx, (opt_name, extra_price) in enumerate(chosen):
                        ItemCustomisation.objects.create(
                            menu_item=item,
                            name=opt_name,
                            extra_price=extra_price,
                            is_default=False,
                            display_order=order_idx,
                        )

                total_items += 1
                status = "+" if item_created else "~"
                disc_str = f"  [-{discount}%]" if discount else ""
                self.stdout.write(
                    f"      [{status}] {name:<40} ₹{price:<6}{disc_str}"
                )

        # ── Summary ───────────────────────────────────────────────────────────
        self.stdout.write("\n" + "─" * 60)
        self.stdout.write(self.style.SUCCESS(
            f"\nSeeding complete!\n"
            f"  Branch   : {branch.name}\n"
            f"  Categories: {total_cats}\n"
            f"  Items     : {total_items}\n"
            f"  Images    : {'yes (Pillow)' if with_images else 'skipped'}\n"
            f"  RNG seed  : {options['seed']} (use --seed N for a different shuffle)\n"
        ))
        self.stdout.write(
            "  Visit /menu or /admin/menu to see the results.\n"
        )
