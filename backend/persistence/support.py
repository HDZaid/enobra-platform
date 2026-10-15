"""Adaptadores internos sobre las tablas existentes; no requieren migraciones."""
import json
import unicodedata
from datetime import datetime, time

from django.core.serializers.json import DjangoJSONEncoder
from django.utils import timezone
from django.utils.text import slugify

from apps.common.pagination import Page
from .models.content import ContenidoPagina
from .models.audit import HistorialActividad


def read_data(key, default=None):
    value = ContenidoPagina.objects.filter(clave=key).values_list("contenido", flat=True).first()
    return json.loads(value) if value else ({} if default is None else default)


def write_data(key, data, actor=None):
    ContenidoPagina.objects.update_or_create(clave=key, defaults={
        "contenido": json.dumps(data, cls=DjangoJSONEncoder), "visible": False,
        "actualizado_por_id": actor, "fecha_actualizacion": timezone.now(),
    })


def audit(module, action, obj, actor=None):
    actor = actor or getattr(obj, "actualizado_por_id", None) or getattr(obj, "creado_por_id", None)
    if actor:
        HistorialActividad.objects.create(usuario_id=actor, accion=action, modulo=module,
            id_registro=obj.pk, nombre_registro=str(getattr(obj, "titulo", ""))[:250])


def page_of(qs, page, page_size, serialize):
    start = (page - 1) * page_size
    return Page(items=[serialize(obj) for obj in qs[start:start + page_size]], total=qs.count())


def unique_slug(model, title):
    base = slugify(title)[:200] or "contenido"
    candidate, suffix = base, 1
    while model.objects.filter(slug=candidate).exists():
        suffix += 1
        candidate = f"{base}-{suffix}"
    return candidate


def publication_date(value):
    return timezone.make_aware(datetime.combine(value, time.min))


def normalized(value):
    return "".join(c for c in unicodedata.normalize("NFKD", value).casefold()
                   if not unicodedata.combining(c))
