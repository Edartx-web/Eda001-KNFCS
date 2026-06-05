"""
config/asgi.py — ASGI config with Django Channels WebSocket support

HTTP  → Django views (unchanged)
WS    → ws/queue/<branch_id>/ → OrderQueueConsumer
"""
import os
from decouple import config
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import re_path

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    config("DJANGO_SETTINGS_MODULE", default="config.settings.production"),
)

django_asgi_app = get_asgi_application()

from apps.orders.consumers import OrderQueueConsumer

websocket_urlpatterns = [
    re_path(
        r"^ws/queue/(?P<branch_id>[0-9a-f-]+)/$",
        OrderQueueConsumer.as_asgi(),
    ),
]

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
