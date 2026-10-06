from django.apps import AppConfig


class CommonConfig(AppConfig):
    name = "apps.common"
    label = "common"

    def ready(self):
        from config.bindings import register_repositories

        from .registry import register

        register_repositories(register)
