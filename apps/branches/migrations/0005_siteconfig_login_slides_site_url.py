"""Migration: add login_slides and site_url to SiteConfig"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("branches", "0004_add_pickup_upi_only"),
    ]

    operations = [
        migrations.AddField(
            model_name="siteconfig",
            name="login_slides",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text=(
                    'JSON array of mobile slide objects. Each: '
                    '{"word":"CRAVE","sub":"Crispy fried chicken",'
                    '"gradient":"linear-gradient(...)","accent":"#e06000",'
                    '"img":"/assets/image/dishes/dish-0.png"}'
                ),
            ),
        ),
        migrations.AddField(
            model_name="siteconfig",
            name="site_url",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Frontend URL used in WhatsApp offer links (e.g. https://knfcs.com)",
                max_length=200,
            ),
        ),
    ]
