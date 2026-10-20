from django.db import models
from django.db.models.functions import Now

from .access import Usuario


class HistorialActividad(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="id_historial")
    usuario = models.ForeignKey(
        Usuario,
        models.RESTRICT,
        db_column="id_usuario",
        db_index=False,
        related_name="historial_actividades",
    )
    accion = models.CharField(max_length=50)
    modulo = models.CharField(max_length=60)
    id_registro = models.BigIntegerField(null=True)
    nombre_registro = models.CharField(max_length=250, null=True)
    descripcion = models.CharField(max_length=500, null=True)
    fecha = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = "historial_actividad"
        indexes = [
            models.Index(fields=["usuario"], name="idx_historial_usuario"),
            models.Index(fields=["modulo"], name="idx_historial_modulo"),
            models.Index(fields=["fecha"], name="idx_historial_fecha"),
        ]
