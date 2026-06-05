import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("branches", "0013_encrypt_upi_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="BranchTable",
            fields=[
                ("id",           models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("branch",       models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="tables", to="branches.branch")),
                ("table_number", models.PositiveSmallIntegerField(help_text="Internal number used in orders")),
                ("label",        models.CharField(max_length=60, help_text="Display name shown to customer")),
                ("seating_type", models.CharField(
                    max_length=12,
                    choices=[
                        ("indoor","Indoor"), ("outdoor","Outdoor"), ("window","Window Side"),
                        ("counter","Counter / Bar"), ("private","Private Room"),
                        ("family","Family Table"), ("booth","Booth"),
                    ],
                    default="indoor",
                )),
                ("capacity",  models.PositiveSmallIntegerField(default=4)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={"db_table": "branch_tables", "ordering": ["branch", "table_number"]},
        ),
        migrations.AddConstraint(
            model_name="branchtable",
            constraint=models.UniqueConstraint(fields=["branch", "table_number"], name="unique_branch_table_number"),
        ),
    ]
