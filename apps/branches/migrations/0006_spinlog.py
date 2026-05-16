"""Migration: create SpinLog table."""
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("branches", "0005_siteconfig_login_slides_site_url"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="SpinLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ("prize_label", models.CharField(default="", max_length=80)),
                ("prize_pct", models.PositiveSmallIntegerField(default=0)),
                ("prize_color", models.CharField(default="#E8521A", max_length=20)),
                ("spun_at", models.DateTimeField(auto_now_add=True)),
                (
                    "customer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="spin_logs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"db_table": "spin_logs", "ordering": ["-spun_at"]},
        ),
    ]
