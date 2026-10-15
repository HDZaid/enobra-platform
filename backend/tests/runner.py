from django.apps import apps
from django.db import connection
from django.test.runner import DiscoverRunner


class ExistingTablesTestRunner(DiscoverRunner):
    """Reproduce los modelos unmanaged únicamente en la base desechable de pruebas."""

    def setup_databases(self, **kwargs):
        if connection.vendor != "sqlite" or connection.settings_dict["NAME"] != ":memory:":
            raise RuntimeError("Las pruebas requieren config.test_settings y SQLite en memoria.")
        result = super().setup_databases(**kwargs)
        with connection.schema_editor() as editor:
            for model in apps.get_app_config("persistence").get_models():
                editor.create_model(model)
        return result
