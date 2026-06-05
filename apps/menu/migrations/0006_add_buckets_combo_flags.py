from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("menu", "0005_add_menuitemimage"),
    ]

    operations = [
        migrations.AddField(
            model_name="menuitem",
            name="is_buckets",
            field=models.BooleanField(
                default=False,
                help_text="Appears in Buckets section on home page",
            ),
        ),
        migrations.AddField(
            model_name="menuitem",
            name="is_combo",
            field=models.BooleanField(
                default=False,
                help_text="Appears in Combos section on home page",
            ),
        ),
    ]
