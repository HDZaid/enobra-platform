from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.inquiries.interfaces import InquiryRepository
from .models.inquiries import MensajeContacto
from .models.properties import Propiedad
from .support import read_data, write_data, audit, page_of


class DjangoInquiryRepository(InquiryRepository):
    def _query(self):
        return MensajeContacto.objects.select_related("propiedad").order_by("-fecha_recepcion", "-pk")

    def _serialize(self, obj):
        extra = read_data(f"admin.inquiries.{obj.pk}")
        return {"id": str(obj.pk), "kind": "visita" if obj.origen == "VISITA" else "contacto",
            "status": extra.get("status", "atendido" if obj.estado == "RESPONDIDO" else "nuevo"),
            "name": obj.nombre, "email": obj.correo or "", "phone": obj.telefono or "",
            "subject": obj.asunto or "", "message": obj.mensaje, "property_id": obj.propiedad_id,
            "property_title": obj.propiedad.titulo if obj.propiedad else None,
            "preferred_date": obj.fecha_preferida, "created_at": obj.fecha_recepcion,
            "updated_at": extra.get("updated_at", obj.fecha_atencion or obj.fecha_recepcion),
            "updated_by": str(obj.atendido_por_id) if obj.atendido_por_id else None}

    def create_contact(self, data):
        obj = MensajeContacto.objects.create(nombre=data["name"], correo=data["email"],
            telefono=data["phone"], asunto=data["subject"], mensaje=data["message"], origen="CONTACTO")
        return self._serialize(obj)

    def create_visit(self, data):
        prop = Propiedad.objects.filter(pk=data["property_id"], publicado=True).first()
        if not prop:
            return None
        obj = MensajeContacto.objects.create(nombre=data["name"], telefono=data["phone"],
            propiedad=prop, fecha_preferida=data["preferred_date"], mensaje="Solicitud de visita", origen="VISITA")
        return self._serialize(obj)

    def list(self, *, kind, status, page, page_size):
        qs = self._query()
        if kind:
            qs = qs.filter(origen="VISITA") if kind == "visita" else qs.exclude(origen="VISITA")
        if status:
            archived = [int(key.rsplit(".", 1)[1]) for key, content in
                self._metadata() if content.get("status") == "archivado"]
            if status == "archivado":
                qs = qs.filter(pk__in=archived)
            else:
                qs = qs.exclude(pk__in=archived).filter(estado="PENDIENTE" if status == "nuevo" else "RESPONDIDO")
        return page_of(qs, page, page_size, self._serialize)

    def _metadata(self):
        import json
        from .models.content import ContenidoPagina
        return [(key, json.loads(content)) for key, content in ContenidoPagina.objects
                .filter(clave__startswith="admin.inquiries.").values_list("clave", "contenido")]

    def get(self, inquiry_id):
        if not str(inquiry_id).isdigit():
            return None
        obj = self._query().filter(pk=inquiry_id).first()
        return self._serialize(obj) if obj else None

    @transaction.atomic
    def update_status(self, inquiry_id, status, *, updated_by):
        if not str(inquiry_id).isdigit():
            return None
        obj = self._query().select_for_update(of=("self",)).filter(pk=inquiry_id).first()
        if not obj:
            return None
        current = self._serialize(obj)["status"]
        if status != current and {"nuevo": "atendido", "atendido": "archivado"}.get(current) != status:
            raise ValidationError({"status": "La secuencia permitida es nuevo → atendido → archivado."})
        if status == current:
            return self._serialize(obj)
        obj.estado = "RESPONDIDO"
        obj.atendido_por_id = updated_by
        obj.fecha_atencion = obj.fecha_atencion or timezone.now()
        obj.save()
        write_data(f"admin.inquiries.{obj.pk}", {"status": status, "updated_at": timezone.now()}, updated_by)
        audit("inquiries", "ESTADO", obj, updated_by)
        return self._serialize(obj)
