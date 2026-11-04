"""Protege medios compartidos, incluidos borradores y publicaciones en papelera."""
import json
import os
import re
from urllib.parse import unquote, urlsplit

from django.conf import settings
from django.db.models import Q
from rest_framework.exceptions import ValidationError

from .models.content import ContenidoPagina


def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for child in value.values():
            yield from strings(child)
    elif isinstance(value, (list, tuple)):
        for child in value:
            yield from strings(child)


def public_host():
    options = settings.STORAGES.get("default", {}).get("OPTIONS", {})
    return (options.get("custom_domain") or os.getenv("R2_PUBLIC_HOST", "")).strip().lower()


def upload_id(value):
    """Reconoce solo uploads propios; las imágenes externas siguen permitidas."""
    try:
        parsed = urlsplit(value)
        path = unquote(parsed.path)
        media_prefix = urlsplit(settings.MEDIA_URL).path.rstrip("/") + "/uploads/"
        local = path.startswith(media_prefix) and (
            not parsed.netloc or parsed.hostname in settings.ALLOWED_HOSTS)
        remote = bool(public_host()) and parsed.hostname == public_host() and path.startswith("/uploads/")
        if not (local or remote):
            return None
        match = re.search(r"/uploads/([a-f0-9]{32})\.(?:jpe?g|png|webp|gif)$", path)
        return match.group(1) if match else None
    except ValueError:
        return None


def lock_media_references(data):
    """Llamar dentro de la transacción que guarda el contenido.

    El mismo bloqueo de delete serializa guardar una referencia con eliminar el
    medio. Si delete ganó, se rechaza la URL de un upload que ya no existe.
    """
    identifiers = sorted({identifier for value in strings(data) if (identifier := upload_id(value))})
    for identifier in identifiers:
        media = ContenidoPagina.objects.select_for_update().filter(clave=f"admin.media.{identifier}").first()
        if media is None:
            raise ValidationError("Una imagen subida ya no existe. Vuelve a cargarla antes de guardar.")


def media_in_use(item):
    """Busca referencias exactas; no confunde nombres de archivo parecidos."""
    aliases = {item["url"], item["path"], settings.MEDIA_URL.rstrip("/") + "/" + item["path"]}
    if public_host():
        aliases.add("https://" + public_host() + "/" + item["path"])

    def identity(value):
        try:
            parsed = urlsplit(value)
            return parsed.netloc.lower(), unquote(parsed.path)
        except ValueError:
            return None

    references = {identity(value) for value in aliases}
    rows = ContenidoPagina.objects.filter(
        Q(clave__startswith="admin.projects.") | Q(clave__startswith="admin.properties.")
        | Q(clave__startswith="admin.news.") | Q(clave="admin.company")
        | Q(clave="admin.institution"))
    for raw in rows.values_list("contenido", flat=True).iterator():
        try:
            data = json.loads(raw or "null")
        except (ValueError, TypeError):
            # No borrar si una referencia aparece en metadatos dañados.
            if raw and item["path"] in raw:
                return True
            continue
        if any(identity(value) in references or (
                upload_id(value) is not None and upload_id(value) == item.get("id"))
               for value in strings(data)):
            return True
    return False
