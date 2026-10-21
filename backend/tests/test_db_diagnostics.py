import tempfile
from pathlib import Path

from django.test import SimpleTestCase, override_settings

from persistence.db_diagnostics import database_error_report, database_target

SUPABASE = {
    "ENGINE": "django.db.backends.postgresql",
    "HOST": "aws-0-us-east-1.pooler.supabase.com",
    "PORT": 5432,
    "USER": "postgres.pckdxptvceaqlbqxnlcf",
    "PASSWORD": "clave-super-secreta",
    "NAME": "postgres",
}
TENANT_ERROR = (
    'connection failed: connection to server at "52.45.94.125", port 5432 failed: '
    "FATAL:  (ENOTFOUND) tenant/user postgres.pckdxptvceaqlbqxnlcf not found"
)


class DatabaseDiagnosticsTests(SimpleTestCase):
    def report(self, message, config=SUPABASE):
        return database_error_report(Exception(message), stage="Prueba", target=database_target(config=config))

    def test_identifica_proyecto_region_y_pooler_de_supabase(self):
        target = database_target(config=SUPABASE)
        self.assertEqual(target["project_ref"], "pckdxptvceaqlbqxnlcf")
        self.assertEqual(target["region"], "us-east-1")
        self.assertEqual(target["pooler"], "Session pooler")

    def test_explica_tenant_no_encontrado_sin_mostrar_la_contrasena(self):
        report = self.report(TENANT_ERROR)
        self.assertIn("no reconoce el proyecto 'pckdxptvceaqlbqxnlcf'", report)
        self.assertIn("Session pooler", report)
        self.assertIn("Paso en el que se detuvo : Prueba", report)
        self.assertNotIn("clave-super-secreta", report)

    def test_otras_causas_frecuentes(self):
        cases = {
            'FATAL:  password authentication failed for user "postgres"': "rechazó la contraseña",
            "failed to resolve host 'x': [Errno 11001] getaddrinfo failed": "No se pudo resolver",
            "connection timeout expired": "no respondió a tiempo",
            "Connection refused": "rechazó la conexión",
            'FATAL:  database "enobra" does not exist': "no existe en ese servidor",
            "algo inesperado": "Error de conexión no reconocido",
        }
        for message, expected in cases.items():
            with self.subTest(message=message):
                self.assertIn(expected, self.report(message))

    def test_sin_database_url(self):
        report = self.report("settings.DATABASES is improperly configured.", config={})
        self.assertIn("DATABASE_URL no está definida", report)

    def test_avisa_si_el_env_de_la_raiz_apunta_a_otra_base(self):
        with tempfile.TemporaryDirectory() as root:
            (Path(root) / "backend").mkdir()
            (Path(root) / ".env").write_text(
                "DATABASE_URL=postgresql://postgres.otroproyecto:otra-clave@aws-1-us-west-2.pooler.supabase.com:5432/postgres\n",
                encoding="utf-8",
            )
            with override_settings(BASE_DIR=Path(root) / "backend"):
                report = self.report(TENANT_ERROR)
        self.assertIn("proyecto 'otroproyecto'", report)
        self.assertIn("Django NO lee ese archivo", report)
        self.assertNotIn("otra-clave", report)

    def test_redacts_dsn_and_password_fields_from_technical_errors(self):
        message = ('failed postgresql://account:never-print-this@db.example.test/postgres '
                   'password=another-test-secret')
        report = self.report(message)
        self.assertNotIn('never-print-this', report)
        self.assertNotIn('another-test-secret', report)
        self.assertNotIn('postgresql://', report)


class CheckDatabaseCommandTests(SimpleTestCase):
    def run_command(self, rows, vendor='postgresql'):
        import io
        from contextlib import nullcontext
        from unittest.mock import MagicMock, patch
        from django.core.management import call_command

        connection = MagicMock()
        connection.vendor = vendor
        cursor = connection.cursor.return_value.__enter__.return_value
        cursor.fetchall.return_value = rows
        output, errors = io.StringIO(), io.StringIO()
        with patch('persistence.management.commands.check_database.connections', {'default': connection}), \
             patch('persistence.management.commands.check_database.transaction.atomic', return_value=nullcontext()):
            try:
                call_command('check_database', stdout=output, stderr=errors)
            except Exception as exc:
                return connection, cursor, output.getvalue(), errors.getvalue(), exc
        return connection, cursor, output.getvalue(), errors.getvalue(), None

    @staticmethod
    def model_columns():
        from django.apps import apps
        return [(model._meta.db_table, field.column)
                for model in apps.get_app_config('persistence').get_models()
                for field in model._meta.local_fields if field.column]

    def test_command_checks_columns_inside_readonly_transaction(self):
        connection, cursor, output, errors, exception = self.run_command(self.model_columns())
        self.assertIsNone(exception)
        connection.ensure_connection.assert_called_once()
        statements = [call.args[0] for call in cursor.execute.call_args_list]
        self.assertEqual(statements[0], 'SET TRANSACTION READ ONLY')
        self.assertEqual(statements[1], "SET LOCAL statement_timeout = '10s'")
        self.assertIn('information_schema.columns', statements[2])
        self.assertEqual(len(statements), 3)
        self.assertIn('20 tablas', output)
        self.assertEqual(errors, '')

    def test_missing_column_fails_without_schema_changes(self):
        from django.core.management.base import CommandError
        rows = [row for row in self.model_columns() if row != ('proyecto', 'fecha_ultima_actividad')]
        _, cursor, _, errors, exception = self.run_command(rows)
        self.assertIsInstance(exception, CommandError)
        self.assertIn('fecha_ultima_actividad', errors)
        self.assertFalse(any(call.args[0].startswith(('CREATE', 'ALTER', 'INSERT', 'UPDATE', 'DELETE'))
                             for call in cursor.execute.call_args_list))

    def test_non_postgres_is_rejected_before_connection(self):
        from django.core.management.base import CommandError
        connection, _, _, _, exception = self.run_command([], vendor='sqlite')
        self.assertIsInstance(exception, CommandError)
        connection.ensure_connection.assert_not_called()
