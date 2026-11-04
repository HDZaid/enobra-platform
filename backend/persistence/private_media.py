"""Referencias permanentes de API y vistas previas temporales; R2 sigue privado."""
import json
from django.db.models import Q
from apps.media.references import canonical_media_reference, media_reference_id

from .models.content import ContenidoPagina
from .models.projects import Proyecto
from .models.properties import Propiedad
from .models.news import Noticia


def is_public_media(item):
    """Una URL conocida no abre borradores ni registros de la papelera."""
    from .media_references import strings

    aliases = {canonical_media_reference(item["url"])}
    identifier = item["id"]
    rows = ContenidoPagina.objects.filter(
        Q(clave__startswith="admin.projects.") | Q(clave__startswith="admin.properties.")
        | Q(clave__startswith="admin.news.") | Q(clave="admin.company"))
    models = {"projects": Proyecto, "properties": Propiedad, "news": Noticia}
    for key, raw in rows.values_list("clave", "contenido").iterator():
        try:
            data = json.loads(raw or "null")
        except (ValueError, TypeError):
            continue
        if not any(canonical_media_reference(value) in aliases or media_reference_id(value) == identifier
                   for value in strings(data)):
            continue
        if key == "admin.company":
            return True
        if not isinstance(data, dict) or data.get("trash"):
            continue
        try:
            _, module, pk = key.split(".")
            if models[module].objects.filter(pk=int(pk), publicado=True).exists():
                return True
        except (ValueError, KeyError):
            continue
    return False
