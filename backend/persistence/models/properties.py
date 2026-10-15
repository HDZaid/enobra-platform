from django.db import models
from django.db.models.functions import Now

from .access import Usuario


class TipoPropiedad(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="id_tipo_propiedad")
    nombre = models.CharField(max_length=80)
    estado = models.BooleanField(db_default=True)
    fecha_creacion = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = "tipo_propiedad"
        constraints = [
            models.UniqueConstraint(
                fields=["nombre"], name="tipo_propiedad_nombre_key"
            ),
        ]


class TipoOperacion(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="id_tipo_operacion")
    nombre = models.CharField(max_length=50)
    estado = models.BooleanField(db_default=True)
    fecha_creacion = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = "tipo_operacion"
        constraints = [
            models.UniqueConstraint(
                fields=["nombre"], name="tipo_operacion_nombre_key"
            ),
        ]


class Propiedad(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="id_propiedad")
    tipo_propiedad = models.ForeignKey(
        TipoPropiedad,
        models.RESTRICT,
        db_column="id_tipo_propiedad",
        db_index=False,
        related_name="propiedades",
    )
    tipo_operacion = models.ForeignKey(
        TipoOperacion,
        models.RESTRICT,
        db_column="id_tipo_operacion",
        db_index=False,
        related_name="propiedades",
    )
    titulo = models.CharField(max_length=200)
    slug = models.CharField(max_length=220)
    descripcion_corta = models.CharField(max_length=500, null=True)
    descripcion = models.TextField(null=True)
    zona = models.CharField(max_length=100, null=True)
    ciudad = models.CharField(max_length=120, null=True)
    pais = models.CharField(max_length=100, null=True, db_default="Guatemala")
    precio = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    superficie_m2 = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    habitaciones = models.IntegerField(null=True)
    banos = models.IntegerField(null=True)
    parqueos = models.IntegerField(null=True)
    condiciones_comerciales = models.TextField(null=True)
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
        related_name="propiedades_creadas",
    )
    actualizado_por = models.ForeignKey(
        Usuario,
        models.SET_NULL,
        db_column="actualizado_por",
        db_index=False,
        null=True,
        related_name="propiedades_actualizadas",
    )

    class Meta:
        managed = False
        db_table = "propiedad"
        constraints = [
            models.UniqueConstraint(fields=["slug"], name="propiedad_slug_key"),
            models.CheckConstraint(
                condition=models.Q(precio__isnull=True) | models.Q(precio__gte=0),
                name="chk_propiedad_precio",
            ),
            models.CheckConstraint(
                condition=models.Q(superficie_m2__isnull=True)
                | models.Q(superficie_m2__gte=0),
                name="chk_propiedad_superficie",
            ),
            models.CheckConstraint(
                condition=models.Q(habitaciones__isnull=True)
                | models.Q(habitaciones__gte=0),
                name="chk_propiedad_habitaciones",
            ),
            models.CheckConstraint(
                condition=models.Q(banos__isnull=True) | models.Q(banos__gte=0),
                name="chk_propiedad_banos",
            ),
            models.CheckConstraint(
                condition=models.Q(parqueos__isnull=True)
                | models.Q(parqueos__gte=0),
                name="chk_propiedad_parqueos",
            ),
        ]
        indexes = [
            models.Index(fields=["tipo_propiedad"], name="idx_propiedad_tipo"),
            models.Index(fields=["tipo_operacion"], name="idx_propiedad_operacion"),
            models.Index(fields=["publicado"], name="idx_propiedad_publicado"),
            models.Index(fields=["destacado"], name="idx_propiedad_destacado"),
        ]


class PropiedadVideo(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="id_video")
    propiedad = models.ForeignKey(
        Propiedad,
        models.CASCADE,
        db_column="id_propiedad",
        db_index=False,
        related_name="videos",
    )
    url_youtube = models.CharField(max_length=500)
    titulo = models.CharField(max_length=200, null=True)
    orden = models.IntegerField(db_default=0)
    fecha_creacion = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = "propiedad_video"
        indexes = [
            models.Index(
                fields=["propiedad"], name="idx_propiedad_video_propiedad"
            ),
        ]
