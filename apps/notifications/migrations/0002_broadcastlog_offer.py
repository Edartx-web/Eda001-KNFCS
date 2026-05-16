from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("notifications", "0001_initial"),
        ("offers", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="broadcastlog",
            name="intro_message",
            field=models.CharField(blank=True, default="", max_length=300),
        ),
        migrations.AddField(
            model_name="broadcastlog",
            name="offer",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="broadcasts",
                to="offers.dailyoffer",
            ),
        ),
        migrations.AlterField(
            model_name="broadcastlog",
            name="image_url",
            field=models.URLField(blank=True, default="", max_length=500),
        ),
    ]
