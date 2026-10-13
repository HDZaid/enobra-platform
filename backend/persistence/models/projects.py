from django.db import models
from django.db.models.functions import Now

from .access import Usuario


class CategoriaProyecto(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="id_categoria")
    nombre = models.CharField(max_length=100)
    descripcion = models.CharField(max_length=300, null=True)
    estado = models.BooleanField(db_default=True)
    fecha_creacion = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = "categoria_proyecto"
        constraints = [
            models.UniqueConstraint(
                fields=["nombre"], name="categoria_proyecto_nombre_key"
            ),
        ]


class Proyecto(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="id_proyecto")
    categoria = models.ForeignKey(
        CategoriaProyecto,
        models.RESTRICT,
        db_column="id_categoria",
        db_index=False,
        related_name="proyectos",
    )
    titulo = models.CharField(max_length=200)
    slug = models.CharField(max_length=220)
    descripcion_corta = models.CharField(max_length=500, null=True)
    descripcion = models.TextField(null=True)
    anio = models.SmallIntegerField(null=True)
    ubicacion = models.CharField(max_length=200, null=True)
    pais = models.CharField(max_length=100, null=True)
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
        related_name="proyectos_creados",
    )
    actualizado_por = models.ForeignKey(
        Usuario,
        models.SET_NULL,
        db_column="actualizado_por",
        db_index=False,
        null=True,
        related_name="proyectos_actualizados",
    )

    class Meta:
        managed = False
        db_table = "proyecto"
        constraints = [
            models.UniqueConstraint(fields=["slug"], name="proyecto_slug_key"),
            models.CheckConstraint(
                condition=models.Q(anio__isnull=True) | models.Q(anio__gte=1900),
                name="chk_proyecto_anio",
            ),
        ]
        indexes = [
            models.Index(fields=["categoria"], name="idx_proyecto_categoria"),
            models.Index(fields=["publicado"], name="idx_proyecto_publicado"),
            models.Index(fields=["destacado"], name="idx_proyecto_destacado"),
        ]


class ProyectoVideo(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="id_video")
    proyecto = models.ForeignKey(
        Proyecto,
        models.CASCADE,
        db_column="id_proyecto",
        db_index=False,
        related_name="videos",
    )
    url_youtube = models.CharField(max_length=500)
    titulo = models.CharField(max_length=200, null=True)
    orden = models.IntegerField(db_default=0)
    fecha_creacion = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = "proyecto_video"
        indexes = [
            models.Index(fields=["proyecto"], name="idx_proyecto_video_proyecto"),
        ]
