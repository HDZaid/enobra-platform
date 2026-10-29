"""Limpieza programable de papelera mediante los repositorios de la API."""
from django.core.management.base import BaseCommand, CommandError

from apps.publications.registry import publication_registry
from persistence.accounts import DjangoAuthService


class Command(BaseCommand):
    help = "Revisa publicaciones con más de 90 días en papelera; solo borra con --execute."

    def add_arguments(self, parser):
        parser.add_argument("--execute", action="store_true", help="Aplicar borrado definitivo con historial.")
        parser.add_argument("--actor-id", type=int, help="Usuario activo responsable del proceso.")
        parser.add_argument("--limit", type=int, default=500, help="Máximo por tipo en esta ejecución (1-5000).")

    def handle(self, *args, **options):
        if not 1 <= options["limit"] <= 5000:
            raise CommandError("--limit debe estar entre 1 y 5000.")
        kits = publication_registry.trash_kits()
        if options["execute"]:
            principal = DjangoAuthService()._principal(options["actor_id"])
            if principal is None or not all(
                    principal.has_permission(f"{kit.key}.delete_permanently") for kit in kits):
                raise CommandError("Usa --actor-id de un usuario activo con permiso de borrado definitivo en cada tipo.")
        mode = "Eliminadas" if options["execute"] else "Candidatas (simulación, sin escrituras)"
        for kit in kits:
            count = kit.repository.purge_expired_trash(deleted_by=options["actor_id"],
                dry_run=not options["execute"], limit=options["limit"])
            self.stdout.write(f"{kit.key}: {mode}: {count}")
