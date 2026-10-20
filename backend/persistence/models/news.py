from django.db import models
from django.db.models.functions import Now

from .access import Usuario


class CategoriaNoticia(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="id_categoria_noticia")
    nombre = models.CharField(max_length=80)
    estado = models.BooleanField(db_default=True)
    fecha_creacion = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = "categoria_noticia"
        constraints = [
            models.UniqueConstraint(
                fields=["nombre"], name="categoria_noticia_nombre_key"
            ),
        ]


class Noticia(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="id_noticia")
    categoria = models.ForeignKey(
        CategoriaNoticia,
        models.RESTRICT,
        db_column="id_categoria_noticia",
        db_index=False,
        related_name="noticias",
    )
    titulo = models.CharField(max_length=220)
    slug = models.CharField(max_length=240)
    resumen = models.CharField(max_length=500, null=True)
    contenido = models.TextField(null=True)
    publicado = models.BooleanField(db_default=True)
    destacado = models.BooleanField(db_default=False)
    fecha_publicacion = models.DateTimeField(null=True)
    fecha_creacion = models.DateTimeField(db_default=Now())
    fecha_actualizacion = models.DateTimeField(null=True)
    creado_por = models.ForeignKey(
        Usuario,
        models.SET_NULL,
        db_column="creado_por",
        db_index=False,
        null=True,
        related_name="noticias_creadas",
    )
    actualizado_por = models.ForeignKey(
        Usuario,
        models.SET_NULL,
        db_column="actualizado_por",
        db_index=False,
        null=True,
        related_name="noticias_actualizadas",
    )

    class Meta:
        managed = False
        db_table = "noticia"
        constraints = [
            models.UniqueConstraint(fields=["slug"], name="noticia_slug_key"),
        ]
        indexes = [
            models.Index(fields=["categoria"], name="idx_noticia_categoria"),
            models.Index(fields=["publicado"], name="idx_noticia_publicada"),
        ]
