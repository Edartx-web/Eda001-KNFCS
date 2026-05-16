"""apps/menu/migrations/0005_add_menuitemimage.py"""
import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("menu", "0004_add_all_branches_flag"),
    ]

    operations = [
        migrations.CreateModel(
            name="MenuItemImage",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("image", models.ImageField(upload_to="menu_items/gallery/")),
                ("display_order", models.PositiveSmallIntegerField(default=0)),
                ("menu_item", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="gallery_images",
                    to="menu.menuitem",
                )),
            ],
            options={
                "db_table": "menu_item_images",
                "ordering": ["display_order"],
            },
        ),
    ]
