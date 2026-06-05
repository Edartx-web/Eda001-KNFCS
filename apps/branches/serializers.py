"""apps/branches/serializers.py"""
from rest_framework import serializers
from apps.branches.models import Branch, BranchTable


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model        = Branch
        fields       = ["id", "name", "address", "phone", "email",
                        "latitude", "longitude",
                        "operating_hours", "is_active", "created_at",
                        "enable_pickup", "enable_dine_in", "pickup_upi_only",
                        "upi_id", "gpay_upi_id", "phonepe_upi_id", "supermoney_upi_id",
                        "max_tables"]
        read_only_fields = ["id", "created_at"]


class BranchTableSerializer(serializers.ModelSerializer):
    seating_type_label = serializers.CharField(source="get_seating_type_display", read_only=True)
    is_available       = serializers.BooleanField(read_only=True, default=True)

    class Meta:
        model  = BranchTable
        fields = [
            "id", "table_number", "label", "seating_type", "seating_type_label",
            "capacity", "is_active", "is_available",
        ]


class BranchCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Branch
        fields = ["name", "address", "phone", "email", "latitude", "longitude", "operating_hours", "upi_id"]

    def validate_name(self, v):
        v = v.strip()
        if Branch.objects.filter(name__iexact=v).exists():
            raise serializers.ValidationError("A branch with this name already exists.")
        return v
