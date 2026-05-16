from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('offers', '0003_dailyoffer_updated_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='dailyoffer',
            name='auto_broadcast',
            field=models.BooleanField(
                default=False,
                help_text='Automatically broadcast to branch customers when this offer is activated',
            ),
        ),
    ]
