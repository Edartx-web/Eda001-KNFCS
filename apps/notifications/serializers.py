"""apps/notifications/serializers.py"""
from rest_framework import serializers
from .models import BroadcastLog


class BroadcastLogSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    offer_name      = serializers.SerializerMethodField()
    offer_image_url = serializers.SerializerMethodField()

    class Meta:
        model  = BroadcastLog
        fields = [
            "id", "title", "intro_message", "message", "image_url",
            "offer", "offer_name", "offer_image_url",
            "target", "branch_id", "status",
            "total_recipients", "sent_count", "failed_count",
            "created_by", "created_by_name", "created_at", "completed_at",
        ]
        read_only_fields = [
            "id", "status", "total_recipients", "sent_count", "failed_count",
            "created_by", "created_at", "completed_at",
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.name or obj.created_by.email
        return None

    def get_offer_name(self, obj):
        return obj.offer.name if obj.offer else None

    def get_offer_image_url(self, obj):
        if obj.offer and obj.offer.image:
            request = self.context.get("request")
            u = obj.offer.image.url
            if u.startswith("http"):
                return u
            if request:
                return request.build_absolute_uri(u)
            return u
        return None
