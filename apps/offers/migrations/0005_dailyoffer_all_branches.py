from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("offers", "0004_dailyoffer_auto_broadcast"),
    ]

    operations = [
        migrations.AddField(
            model_name="dailyoffer",
            name="all_branches",
            field=models.BooleanField(
                default=False,
                help_text="If True, this offer is shown to customers of ALL branches (SuperAdmin global offer)",
            ),
        ),
    ]
