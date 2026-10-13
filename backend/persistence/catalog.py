"""CRUD del panel: tablas de negocio y metadatos del mockup en contenido_pagina."""
from django.db import IntegrityError, transaction
from django.db.models import Max, Min
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.projects.interfaces import ProjectRepository
from apps.properties.interfaces import PropertyRepository
from apps.news.interfaces import NewsRepository
from .models.projects import Proyecto, CategoriaProyecto, ProyectoVideo
from .models.properties import Propiedad, TipoPropiedad, TipoOperacion, PropiedadVideo
from .models.news import Noticia, CategoriaNoticia
from .models.content import ContenidoPagina
from .support import read_data, write_data, audit, page_of, unique_slug, publication_date, normalized


class CatalogRepository:
    def _query(self, include_unpublished=True):
        qs = self.model.objects.select_related(*self.related).prefetch_related(*self.prefetch)
        return qs if include_unpublished else qs.filter(publicado=True)

    def _lookup(self, key, include_unpublished=True, lock=False):
        qs = self._query(include_unpublished)
        if lock:
            # Lock only the base row (outer nullable relations cannot be locked on PostgreSQL).
            qs = qs.select_for_update(of=("self",))
        return qs.filter(**{self.identifier: key}).first()

    def get(self, key, *, include_unpublished):
        obj = self._lookup(key, include_unpublished)
        return self._serialize(obj) if obj else None

    def _meta_key(self, obj):
        return f"admin.{self.module}.{obj.pk}"

    def _serialize(self, obj):
        extra = read_data(self._meta_key(obj))
        result = {"id": obj.pk if self.identifier == "pk" else obj.slug,
            "title": obj.titulo, "published": obj.publicado, "demo": extra.get("demo", False),
            "created_at": obj.fecha_creacion, "updated_at": obj.fecha_actualizacion or obj.fecha_creacion,
            "updated_by": str(obj.actualizado_por_id) if obj.actualizado_por_id else None}
        for api, field in self.fields.items():
            result[api] = getattr(obj, field) or (0 if api in ("price", "rooms", "baths", "parking", "area", "year") else "")
        if self.module in ("projects", "news"):
            result["category"] = obj.categoria.nombre
        else:
            result.update(operation=obj.tipo_operacion.nombre, type=obj.tipo_propiedad.nombre)
        if self.module == "news":
            result["image"] = extra.get("image", "")
        else:
            result.update(images=extra.get("images", []), renders=extra.get("renders", []))
            video = next(iter(sorted(obj.videos.all(), key=lambda v: (v.orden, v.pk))), None)
            result["video"] = video.url_youtube if video else ""
        if self.module != "projects":
            result["date"] = timezone.localtime(obj.fecha_publicacion or obj.fecha_creacion).date()
        return result

    def _values(self, data):
        values = {field: data[api] for api, field in self.fields.items() if api in data}
        if "published" in data:
            values["publicado"] = data["published"]
        if "date" in data:
            values["fecha_publicacion"] = publication_date(data["date"])
        for api, (model, field) in self.categories.items():
            if api in data:
                # Nombres libres en proyectos; catálogos fijos para las otras colecciones.
                category, _ = model.objects.get_or_create(nombre=data[api])
                if not category.estado:
                    raise ValidationError({api: "Esta categoría está inactiva."})
                values[field] = category
        return values

    def _extras(self, obj, data, actor):
        extra = read_data(self._meta_key(obj))
        extra.update({k: data[k] for k in ("demo", "images", "renders", "image") if k in data})
        write_data(self._meta_key(obj), extra, actor)
        if "video" in data and self.video_model:
            obj.videos.all().delete()
            if data["video"]:
                self.video_model.objects.create(**{self.video_fk: obj, "url_youtube": data["video"]})

    def _validate(self, data, obj=None):
        if self.module == "properties":
            kind = data.get("type", obj.tipo_propiedad.nombre if obj else None)
            if kind == "Terreno" and any(data.get(api, getattr(obj, field, 0))
                    for api, field in (("rooms", "habitaciones"), ("baths", "banos"), ("parking", "parqueos"))):
                raise ValidationError("Un terreno no puede tener habitaciones, baños ni parqueos.")

    @transaction.atomic
    def create(self, data, *, created_by):
        self._validate(data)
        values = self._values(data)
        values.update(creado_por_id=created_by, actualizado_por_id=created_by,
                      fecha_actualizacion=timezone.now())
        for attempt in range(5):
            try:
                with transaction.atomic():
                    obj = self.model.objects.create(slug=unique_slug(self.model, data["title"]), **values)
                break
            except IntegrityError:
                if attempt == 4:
                    raise
        self._extras(obj, data, created_by)
        audit(self.module, "CREAR", obj, created_by)
        return self.get(getattr(obj, self.identifier), include_unpublished=True)

    @transaction.atomic
    def update(self, key, data, *, updated_by):
        obj = self._lookup(key, lock=True)
        if obj is None:
            return None
        self._validate(data, obj)
        for field, value in self._values(data).items():
            setattr(obj, field, value)
        obj.actualizado_por_id, obj.fecha_actualizacion = updated_by, timezone.now()
        obj.save()
        self._extras(obj, data, updated_by)
        audit(self.module, "EDITAR", obj, updated_by)
        return self.get(key, include_unpublished=True)

    @transaction.atomic
    def delete(self, key, *, deleted_by=None):
        obj = self._lookup(key, lock=True)
        if obj is None:
            return False
        audit(self.module, "ELIMINAR", obj, deleted_by)
        ContenidoPagina.objects.filter(clave=self._meta_key(obj)).delete()
        obj.delete()
        return True


class DjangoProjectRepository(CatalogRepository, ProjectRepository):
    model, module, identifier = Proyecto, "projects", "slug"
    related, prefetch = ("categoria",), ("videos",)
    video_model, video_fk = ProyectoVideo, "proyecto"
    fields = {"title": "titulo", "description": "descripcion", "country": "pais", "year": "anio"}
    categories = {"category": (CategoriaProyecto, "categoria")}

    def list(self, *, year, include_unpublished, page, page_size):
        qs = self._query(include_unpublished)
        if year is not None:
            qs = qs.filter(anio=year)
        return page_of(qs.order_by("-anio", "-fecha_creacion", "-pk"), page, page_size, self._serialize)

    def years(self, *, include_unpublished):
        return list(self._query(include_unpublished).exclude(anio=None).order_by("-anio")
                    .values_list("anio", flat=True).distinct())


class DjangoNewsRepository(CatalogRepository, NewsRepository):
    model, module, identifier = Noticia, "news", "slug"
    related, prefetch = ("categoria",), ()
    video_model = None
    fields = {"title": "titulo", "description": "contenido"}
    categories = {"category": (CategoriaNoticia, "categoria")}

    def list(self, *, category, include_unpublished, page, page_size):
        qs = self._query(include_unpublished)
        if category:
            qs = qs.filter(categoria__nombre=category)
        return page_of(qs.order_by("-fecha_publicacion", "-pk"), page, page_size, self._serialize)


class DjangoPropertyRepository(CatalogRepository, PropertyRepository):
    model, module, identifier = Propiedad, "properties", "pk"
    related, prefetch = ("tipo_propiedad", "tipo_operacion"), ("videos",)
    video_model, video_fk = PropiedadVideo, "propiedad"
    fields = {"title": "titulo", "description": "descripcion", "zone": "zona", "location": "ciudad",
        "price": "precio", "rooms": "habitaciones", "baths": "banos", "parking": "parqueos",
        "area": "superficie_m2", "commercial": "condiciones_comerciales"}
    categories = {"type": (TipoPropiedad, "tipo_propiedad"), "operation": (TipoOperacion, "tipo_operacion")}

    def list(self, filters, *, page, page_size):
        qs = self._query(filters.include_unpublished)
        for attr, field in (("operation", "tipo_operacion__nombre"), ("type", "tipo_propiedad__nombre"),
                ("zone", "zona"), ("min_price", "precio__gte"), ("max_price", "precio__lte"), ("ids", "pk__in")):
            value = getattr(filters, attr)
            if value is not None:
                qs = qs.filter(**{field: value})
        if filters.q:
            # Compatible con PostgreSQL sin instalar la extensión unaccent en la BD existente.
            needle = normalized(filters.q)
            ids = [obj.pk for obj in qs if needle in normalized(" ".join(
                [obj.titulo, obj.zona or "", obj.ciudad or "", obj.tipo_propiedad.nombre]))]
            qs = qs.filter(pk__in=ids)
        order = {"price_asc": "precio", "price_desc": "-precio"}.get(filters.sort, "-fecha_publicacion")
        return page_of(qs.order_by(order, "-pk"), page, page_size, self._serialize)

    def facets(self, *, include_unpublished):
        qs = self._query(include_unpublished)
        return {"zones": list(qs.exclude(zona=None).exclude(zona="").order_by("zona")
                .values_list("zona", flat=True).distinct()),
                **qs.aggregate(min_price=Min("precio"), max_price=Max("precio"))}
