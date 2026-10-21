"""Read-only check of the PostgreSQL schema required by unmanaged models."""
from django.apps import apps
from django.core.exceptions import ImproperlyConfigured
from django.core.management.base import BaseCommand, CommandError
from django.db import DEFAULT_DB_ALIAS, DatabaseError, connections, transaction

from persistence.db_diagnostics import database_error_report, database_target, describe_target


class Command(BaseCommand):
    help = "Comprueba conexión y columnas de PostgreSQL sin modificar tablas ni datos."
    requires_system_checks = []

    def handle(self, *args, **options):
        target = database_target()
        connection = connections[DEFAULT_DB_ALIAS]
        if connection.vendor != "postgresql":
            raise CommandError("check_database requiere DATABASE_URL de PostgreSQL.")
        self.stdout.write(f"[EnObra] Destino: {describe_target(target)}")
        self.stdout.write(f"[EnObra] DATABASE_URL leída de: {target['source']}")
        expected = {
            model._meta.db_table: {field.column for field in model._meta.local_fields if field.column}
            for model in apps.get_app_config("persistence").get_models()
        }
        try:
            connection.ensure_connection()
            with transaction.atomic(using=DEFAULT_DB_ALIAS):
                with connection.cursor() as cursor:
                    cursor.execute("SET TRANSACTION READ ONLY")
                    cursor.execute("SET LOCAL statement_timeout = '10s'")
                    cursor.execute(
                        "SELECT table_name, column_name FROM information_schema.columns "
                        "WHERE table_schema = 'public' AND table_name = ANY(%s)",
                        [list(expected)],
                    )
                    rows = cursor.fetchall()
        except (DatabaseError, ImproperlyConfigured) as exc:
            self.stderr.write(database_error_report(exc, stage="Comprobación de PostgreSQL."))
            raise CommandError("No se pudo comprobar PostgreSQL; consulta el diagnóstico anterior.") from None
        actual = {}
        for table, column in rows:
            actual.setdefault(table, set()).add(column)
        missing = {table: sorted(columns - actual.get(table, set()))
                   for table, columns in expected.items() if columns - actual.get(table, set())}
        if missing:
            for table, columns in sorted(missing.items()):
                self.stderr.write(f"[EnObra] Faltan columnas en {table}: {', '.join(columns)}")
            raise CommandError("El esquema no coincide con los modelos. No se ejecutaron migraciones.")
        self.stdout.write(self.style.SUCCESS(
            f"[EnObra] Conexión y esquema: OK ({len(expected)} tablas; solo lectura)."
        ))
