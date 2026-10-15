"""Valores permitidos (idénticos a los usados en el mockup)."""
from django.db.models import TextChoices


class Operation(TextChoices):
    VENTA = "Venta", "Venta"
    ALQUILER = "Alquiler", "Alquiler"


class PropertyType(TextChoices):
    CASA = "Casa", "Casa"
    APARTAMENTO = "Apartamento", "Apartamento"
    TERRENO = "Terreno", "Terreno"
    LOCAL = "Local", "Local"


class NewsCategory(TextChoices):
    ANUNCIOS = "Anuncios", "Anuncios"
    EVENTOS = "Eventos", "Eventos"
    PROYECTOS = "Proyectos", "Proyectos"


class InquiryKind(TextChoices):
    CONTACTO = "contacto", "Contacto"
    VISITA = "visita", "Solicitud de visita"


class InquiryStatus(TextChoices):
    NUEVO = "nuevo", "Nuevo"
    ATENDIDO = "atendido", "Atendido"
    ARCHIVADO = "archivado", "Archivado"


class MediaKind(TextChoices):
    PHOTO = "photo", "Fotografía"
    RENDER = "render", "Render"
    NEWS = "news", "Imagen de noticia"
    LOGO = "logo", "Logo"


class Role(TextChoices):
    ADMIN = "admin", "Administrador"


class PropertySort(TextChoices):
    RECENT = "recent", "Más recientes"
    PRICE_ASC = "price_asc", "Precio ascendente"
    PRICE_DESC = "price_desc", "Precio descendente"
