import json

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from persistence.models.content import ContenidoPagina


class Command(BaseCommand):
    help = "Elimina metadatos de sesiones administrativas expiradas (no altera otras páginas)."

    def handle(self, *args, **options):
        removed = 0
        now = timezone.now()
        for row in ContenidoPagina.objects.filter(clave__startswith="auth.session.").iterator():
            expiry = parse_datetime(json.loads(row.contenido)["expires_at"])
            if expiry and expiry <= now:
                row.delete()
                removed += 1
        self.stdout.write(f"Sesiones expiradas eliminadas: {removed}")
