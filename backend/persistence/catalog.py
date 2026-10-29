"""CRUD del panel: tablas de negocio y metadatos del mockup en contenido_pagina."""
import json

from django.db import IntegrityError, transaction
from django.db.models import Max, Min
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.projects.interfaces import ProjectRepository
from apps.properties.interfaces import PropertyRepository
from apps.news.interfaces import NewsRepository
from .models.projects import Proyecto, CategoriaProyecto, ProyectoVideo
from .models.properties import Propiedad, TipoPropiedad, TipoOperacion, PropiedadVideo
from .models.news import Noticia, CategoriaNoticia
from .models.content import ContenidoPagina
from .models.access import Usuario
from apps.common.pagination import Page
from .support import read_data, write_data, audit, page_of, unique_slug, publication_date, normalized


class CatalogRepository:
    supports_trash = False

    def _query(self, include_unpublished=True):
        qs = self.model.objects.select_related(*self.related).prefetch_related(*self.prefetch)
        if self.supports_trash:
            trashed_ids = self._trashed_ids()
            if trashed_ids:
                qs = qs.exclude(pk__in=trashed_ids)
        return qs if include_unpublished else qs.filter(publicado=True)

    def _trash_metadata(self):
        if not self.supports_trash:
            return {}
        rows = ContenidoPagina.objects.filter(
            clave__startswith=f"admin.{self.module}.", contenido__contains='"trash"'
        ).values_list("clave", "contenido")
        metadata = {}
        for key, content in rows:
            try:
                pk = int(key.rsplit(".", 1)[1])
                extra = json.loads(content)
            except (ValueError, TypeError, IndexError):
                continue
            trash = extra.get("trash") if isinstance(extra, dict) else None
            if isinstance(trash, dict) and trash.get("trashed_at"):
                metadata[pk] = extra
        return metadata

    def _trashed_ids(self):
        return list(self._trash_metadata())

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

    def _serialize(self, obj, extra=None):
        if extra is None:
            extra = read_data(self._meta_key(obj))
        result = {"id": obj.pk if self.identifier == "pk" else obj.slug,
            "title": obj.titulo, "published": obj.publicado, "demo": extra.get("demo", False),
            "created_at": obj.fecha_creacion, "updated_at": obj.fecha_actualizacion or obj.fecha_creacion,
            "updated_by": str(obj.actualizado_por_id) if obj.actualizado_por_id else None}
        if isinstance(extra.get("trash"), dict):
            result["trashed_at"] = extra["trash"].get("trashed_at")
            result["trashed_by"] = extra["trash"].get("trashed_by")
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

    def _activity_values(self, now, *, restored=False):
        return {}

    @transaction.atomic
    def create(self, data, *, created_by):
        self._validate(data)
        values = self._values(data)
        values.update(creado_por_id=created_by, actualizado_por_id=created_by,
                      fecha_actualizacion=timezone.now())
        values.update(self._activity_values(values["fecha_actualizacion"]))
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
    def update(self, key, data, *, updated_by, require_own_draft=False):
        obj = self._lookup(key, lock=True)
        if require_own_draft and (obj is None or obj.publicado
                or str(obj.creado_por_id) != str(updated_by)):
            raise PermissionDenied("Solo puedes editar tus propios borradores.")
        if obj is None:
            return None
        self._validate(data, obj)
        for field, value in self._values(data).items():
            setattr(obj, field, value)
        obj.actualizado_por_id, obj.fecha_actualizacion = updated_by, timezone.now()
        for field, value in self._activity_values(obj.fecha_actualizacion).items():
            setattr(obj, field, value)
        obj.save()
        self._extras(obj, data, updated_by)
        audit(self.module, "EDITAR", obj, updated_by)
        return self.get(key, include_unpublished=True)

    @transaction.atomic
    def _delete_record(self, key, *, deleted_by=None):
        obj = self._lookup(key, lock=True)
        if obj is None:
            return False
        audit(self.module, "ELIMINAR", obj, deleted_by)
        ContenidoPagina.objects.filter(clave=self._meta_key(obj)).delete()
        obj.delete()
        return True

    def is_own_draft(self, key, user_id):
        try:
            owner_id = int(user_id)
        except (TypeError, ValueError):
            return False
        return self._query(include_unpublished=True).filter(
            **{self.identifier: key}, creado_por_id=owner_id, publicado=False
        ).exists()

    @transaction.atomic
    def delete(self, key, *, deleted_by=None, require_own_draft=False):
        if not self.supports_trash:
            return self._delete_record(key, deleted_by=deleted_by)
        obj = self._lookup(key, lock=True)
        if require_own_draft and (obj is None or obj.publicado
                or str(obj.creado_por_id) != str(deleted_by)):
            raise PermissionDenied("Solo puedes enviar tus propios borradores a papelera.")
        if obj is None:
            return False
        key = self._meta_key(obj)
        extra = read_data(key, {})
        if isinstance(extra.get("trash"), dict) and extra["trash"].get("trashed_at"):
            return False
        extra["trash"] = {
            "trashed_at": timezone.now().isoformat(),
            "trashed_by": str(deleted_by) if deleted_by is not None else None,
            "was_published": bool(obj.publicado),
        }
        obj.publicado = False
        obj.actualizado_por_id = deleted_by
        obj.fecha_actualizacion = timezone.now()
        obj.save(update_fields=["publicado", "actualizado_por", "fecha_actualizacion"])
        write_data(key, extra, deleted_by)
        audit(self.module, "PAPELERA", obj, deleted_by)
        return True

    def list_trash(self, *, page, page_size, owner_id=None):
        metadata = self._trash_metadata()
        if not metadata:
            return Page()
        qs = self.model.objects.filter(pk__in=metadata).select_related(*self.related).prefetch_related(*self.prefetch)
        if owner_id is not None:
            qs = qs.filter(creado_por_id=owner_id)
        total = qs.count()
        start = (page - 1) * page_size
        objects = list(qs.order_by("-fecha_actualizacion", "-pk")[start:start + page_size])
        actors = {metadata[obj.pk]["trash"].get("trashed_by") for obj in objects}
        actor_ids = [int(actor) for actor in actors if str(actor).isdigit()]
        names = dict(Usuario.objects.filter(pk__in=actor_ids).values_list("pk", "nombre"))
        items = []
        for obj in objects:
            extra = metadata[obj.pk]
            trash = extra["trash"]
            actor = trash.get("trashed_by")
            item = self._serialize(obj, extra=extra)
            item.update(type=self.module, was_published=bool(trash.get("was_published", False)),
                owner_id=str(obj.creado_por_id) if obj.creado_por_id is not None else None,
                trashed_by_name=names.get(int(actor)) if str(actor).isdigit() else None)
            items.append(item)
        return Page(items=items, total=total)

    @transaction.atomic
    def restore(self, key, *, restored_by):
        if not self.supports_trash:
            return False
        obj = self.model.objects.select_for_update().filter(**{self.identifier: key}).first()
        if obj is None:
            return False
        key = self._meta_key(obj)
        extra = read_data(key, {})
        trash = extra.get("trash")
        if not isinstance(trash, dict) or not trash.get("trashed_at"):
            return False
        obj.publicado = bool(trash.get("was_published", False))
        obj.actualizado_por_id = restored_by
        obj.fecha_actualizacion = timezone.now()
        activity = self._activity_values(obj.fecha_actualizacion, restored=True)
        for field, value in activity.items():
            setattr(obj, field, value)
        obj.save(update_fields=["publicado", "actualizado_por", "fecha_actualizacion", *activity])
        extra.pop("trash", None)
        write_data(key, extra, restored_by)
        audit(self.module, "RESTAURAR", obj, restored_by)
        return True

    @transaction.atomic
    def delete_permanently(self, key, *, deleted_by):
        if not self.supports_trash:
            return False
        obj = self.model.objects.select_for_update().filter(**{self.identifier: key}).first()
        if obj is None:
            return False
        key = self._meta_key(obj)
        extra = read_data(key, {})
        trash = extra.get("trash")
        if not isinstance(trash, dict) or not trash.get("trashed_at"):
            return False
        audit(self.module, "ELIMINAR_PERMANENTE", obj, deleted_by)
        ContenidoPagina.objects.filter(clave=key).delete()
        obj.delete()
        return True

class DjangoProjectRepository(CatalogRepository, ProjectRepository):
    supports_trash = True
    model, module, identifier = Proyecto, "projects", "slug"
    related, prefetch = ("categoria",), ("videos",)
    video_model, video_fk = ProyectoVideo, "proyecto"
    fields = {"title": "titulo", "description": "descripcion", "country": "pais", "year": "anio"}
    categories = {"category": (CategoriaProyecto, "categoria")}

    def _activity_values(self, now, *, restored=False):
        values = {"fecha_ultima_actividad": now}
        if restored:
            values.update(estado_limpieza="ACTIVO", fecha_marcado_eliminacion=None)
        return values

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
    supports_trash = True
    model, module, identifier = Propiedad, "properties", "pk"
    related, prefetch = ("tipo_propiedad", "tipo_operacion"), ("videos",)
    video_model, video_fk = PropiedadVideo, "propiedad"
    fields = {"title": "titulo", "description": "descripcion", "zone": "zona", "location": "ciudad",
        "price": "precio", "rooms": "habitaciones", "baths": "banos", "parking": "parqueos",
        "area": "superficie_m2", "commercial": "condiciones_comerciales"}
    categories = {"type": (TipoPropiedad, "tipo_propiedad"), "operation": (TipoOperacion, "tipo_operacion")}

    def list(self, filters, *, page, page_size):
        qs = self._query(filters.include_unpublished)
        if filters.owner_id is not None:
            qs = qs.filter(creado_por_id=filters.owner_id)
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
