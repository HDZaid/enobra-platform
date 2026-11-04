"""Referencias de API y capacidades temporales, sin credenciales ni acceso a BD."""
import re
from urllib.parse import unquote, urlsplit

from django.conf import settings
from django.core import signing

PREVIEW_SALT = "enobra.private-media.preview.v1"
PREVIEW_MAX_AGE = 900


def private_r2_enabled():
    return getattr(settings, "R2_ENABLED", False) and getattr(settings, "R2_ACCESS_MODE", "public") == "private"


def media_reference_id(value):
    if not isinstance(value, str):
        return None
    try:
        url = urlsplit(value)
        if url.netloc and url.hostname not in settings.ALLOWED_HOSTS:
            return None
        match = re.fullmatch(r"/media/r2/([a-f0-9]{32})/", unquote(url.path))
        return match.group(1) if match else None
    except ValueError:
        return None


def canonical_media_reference(value):
    identifier = media_reference_id(value)
    return f"/media/r2/{identifier}/" if identifier else value


def display_media_reference(value, *, public=False):
    identifier = media_reference_id(value)
    if not identifier or not private_r2_enabled():
        return value
    exposed = getattr(settings, "MEDIA_API_ORIGIN", "") + canonical_media_reference(value)
    if public:
        return exposed
    return exposed + "?preview=" + signing.dumps(identifier, salt=PREVIEW_SALT)


def media_api_data(item):
    return {**item, "url": display_media_reference(item["url"])}


def valid_preview(token, media_id):
    if not token:
        return False
    try:
        return signing.loads(token, salt=PREVIEW_SALT, max_age=PREVIEW_MAX_AGE) == media_id
    except (signing.BadSignature, ValueError, TypeError):
        return False
