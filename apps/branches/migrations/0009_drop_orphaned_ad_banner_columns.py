"""Drop ad_banner_* columns that were added directly to the DB but are not in the model."""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('branches', '0008_add_home_ads_to_siteconfig'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE site_config
                DROP COLUMN IF EXISTS ad_banner_1_url,
                DROP COLUMN IF EXISTS ad_banner_1_link,
                DROP COLUMN IF EXISTS ad_banner_2_url,
                DROP COLUMN IF EXISTS ad_banner_2_link,
                DROP COLUMN IF EXISTS ad_banner_3_url,
                DROP COLUMN IF EXISTS ad_banner_3_link;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
