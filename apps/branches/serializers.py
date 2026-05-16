"""apps/branches/serializers.py"""
from rest_framework import serializers
from apps.branches.models import Branch


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model        = Branch
        fields       = ["id", "name", "address", "phone", "email",
                        "latitude", "longitude",
                        "operating_hours", "is_active", "created_at",
                        "enable_pickup", "enable_dine_in", "pickup_upi_only",
                        "max_tables"]
        read_only_fields = ["id", "created_at"]


class BranchCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Branch
        fields = ["name", "address", "phone", "email", "latitude", "longitude", "operating_hours"]

    def validate_name(self, v):
        v = v.strip()
        if Branch.objects.filter(name__iexact=v).exists():
            raise serializers.ValidationError("A branch with this name already exists.")
        return v
