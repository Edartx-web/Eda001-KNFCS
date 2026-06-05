from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("branches", "0006_spinlog"),
    ]

    operations = [
        migrations.AddField(
            model_name="branch",
            name="upi_id",
            field=models.CharField(
                blank=True,
                max_length=100,
                help_text="UPI ID for payment QR (e.g. knfc.branch1@upi)",
            ),
        ),
    ]
