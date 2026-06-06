from django.apps import AppConfig
class OffersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.offers"
    label = "offers"

    def ready(self):
        import apps.offers.signals  # noqa: F401
