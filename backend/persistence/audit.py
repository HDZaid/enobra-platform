"""Solo lectura sobre historial_actividad; sin cambios de esquema."""
from datetime import datetime, time
from zoneinfo import ZoneInfo

from django.db.models import Q

from apps.audit.interfaces import AuditRepository
from .models.audit import HistorialActividad
from .support import page_of

AUDIT_TIMEZONE = ZoneInfo("America/Guatemala")
EXPORT_LIMIT = 10_000


class DjangoAuditRepository(AuditRepository):
    def _query(self, filters):
        qs = HistorialActividad.objects.select_related("usuario").only(
            "id", "usuario__id", "usuario__nombre", "accion", "modulo",
            "id_registro", "nombre_registro", "descripcion", "fecha")
        for key, field in (("user_id", "usuario_id"), ("module", "modulo"), ("action", "accion")):
            if filters.get(key) is not None:
                qs = qs.filter(**{field: filters[key]})
        if filters.get("date_from"):
            qs = qs.filter(fecha__gte=datetime.combine(filters["date_from"], time.min, AUDIT_TIMEZONE))
        if filters.get("date_to"):
            end = datetime.combine(filters["date_to"], time.max, AUDIT_TIMEZONE)
            qs = qs.filter(fecha__lte=end)
        if filters.get("q"):
            qs = qs.filter(Q(nombre_registro__icontains=filters["q"])
                           | Q(descripcion__icontains=filters["q"]))
        return qs.order_by("-fecha", "-pk")

    @staticmethod
    def _serialize(obj):
        return {"id": obj.pk, "user": {"id": obj.usuario_id, "name": obj.usuario.nombre},
                "action": obj.accion, "module": obj.modulo, "record_id": obj.id_registro,
                "record_name": obj.nombre_registro, "description": obj.descripcion,
                "date": obj.fecha.astimezone(AUDIT_TIMEZONE)}

    def list(self, filters, page, page_size):
        return page_of(self._query(filters), page, min(page_size, 100), self._serialize)

    def export_rows(self, filters):
        for obj in self._query(filters)[:EXPORT_LIMIT].iterator(chunk_size=500):
            yield self._serialize(obj)
