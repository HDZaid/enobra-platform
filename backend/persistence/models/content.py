from django.db import models
from django.db.models.functions import Now

from .access import Usuario


class Servicio(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="id_servicio")
    nombre = models.CharField(max_length=150)
    slug = models.CharField(max_length=170)
    descripcion_corta = models.CharField(max_length=500, null=True)
    descripcion = models.TextField(null=True)
    orden = models.IntegerField(db_default=0)
    visible = models.BooleanField(db_default=True)
    fecha_creacion = models.DateTimeField(db_default=Now())
    fecha_actualizacion = models.DateTimeField(null=True)
    actualizado_por = models.ForeignKey(
        Usuario,
        models.SET_NULL,
        db_column="actualizado_por",
        db_index=False,
        null=True,
        related_name="servicios_actualizados",
    )

    class Meta:
        managed = False
        db_table = "servicio"
        constraints = [
            models.UniqueConstraint(fields=["slug"], name="servicio_slug_key"),
        ]


class ContenidoPagina(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="id_contenido")
    clave = models.CharField(max_length=100)
    titulo = models.CharField(max_length=250, null=True)
    contenido = models.TextField(null=True)
    visible = models.BooleanField(db_default=True)
    orden = models.IntegerField(db_default=0)
    fecha_actualizacion = models.DateTimeField(db_default=Now())
    actualizado_por = models.ForeignKey(
        Usuario,
        models.SET_NULL,
        db_column="actualizado_por",
        db_index=False,
        null=True,
        related_name="contenidos_actualizados",
    )

    class Meta:
        managed = False
        db_table = "contenido_pagina"
        constraints = [
            models.UniqueConstraint(
                fields=["clave"], name="contenido_pagina_clave_key"
            ),
        ]


class ConfiguracionSitio(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="id_configuracion")
    nombre_empresa = models.CharField(max_length=150, null=True)
    responsable = models.CharField(max_length=150, null=True)
    direccion = models.CharField(max_length=300, null=True)
    telefono = models.CharField(max_length=30, null=True)
    telefono_adicional = models.CharField(max_length=30, null=True)
    whatsapp = models.CharField(max_length=30, null=True)
    correo = models.CharField(max_length=150, null=True)
    dominio = models.CharField(max_length=255, null=True)
    fecha_actualizacion = models.DateTimeField(db_default=Now())
    actualizado_por = models.ForeignKey(
        Usuario,
        models.SET_NULL,
        db_column="actualizado_por",
        db_index=False,
        null=True,
        related_name="configuraciones_actualizadas",
    )

    class Meta:
        managed = False
        db_table = "configuracion_sitio"


class RedSocial(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="id_red_social")
    configuracion = models.ForeignKey(
        ConfiguracionSitio,
        models.CASCADE,
        db_column="id_configuracion",
        db_index=False,
        related_name="redes_sociales",
    )
    nombre = models.CharField(max_length=60)
    url = models.CharField(max_length=700)
    icono = models.CharField(max_length=100, null=True)
    visible = models.BooleanField(db_default=True)
    orden = models.IntegerField(db_default=0)
    fecha_creacion = models.DateTimeField(db_default=Now())
    fecha_actualizacion = models.DateTimeField(null=True)

    class Meta:
        managed = False
        db_table = "red_social"
        constraints = [
            models.UniqueConstraint(
                fields=["configuracion", "nombre"],
                name="uq_red_social_configuracion_nombre",
            ),
        ]
        indexes = [
            models.Index(
                fields=["configuracion"], name="idx_red_social_configuracion"
            ),
            models.Index(fields=["visible"], name="idx_red_social_visible"),
        ]
