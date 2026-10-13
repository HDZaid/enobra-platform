from django.db import models
from django.db.models.functions import Now

from .access import Usuario
from .projects import Proyecto
from .properties import Propiedad


class MensajeContacto(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="id_mensaje")
    nombre = models.CharField(max_length=150)
    correo = models.CharField(max_length=150, null=True)
    telefono = models.CharField(max_length=30, null=True)
    asunto = models.CharField(max_length=200, null=True)
    tipo_consulta = models.CharField(max_length=100, null=True)
    mensaje = models.TextField()
    origen = models.CharField(max_length=30, db_default="CONTACTO")
    proyecto = models.ForeignKey(
        Proyecto,
        models.SET_NULL,
        db_column="id_proyecto",
        db_index=False,
        null=True,
        related_name="mensajes_contacto",
    )
    propiedad = models.ForeignKey(
        Propiedad,
        models.SET_NULL,
        db_column="id_propiedad",
        db_index=False,
        null=True,
        related_name="mensajes_contacto",
    )
    fecha_preferida = models.DateField(null=True)
    estado = models.CharField(max_length=20, db_default="PENDIENTE")
    fecha_recepcion = models.DateTimeField(db_default=Now())
    atendido_por = models.ForeignKey(
        Usuario,
        models.SET_NULL,
        db_column="atendido_por",
        db_index=False,
        null=True,
        related_name="mensajes_atendidos",
    )
    fecha_atencion = models.DateTimeField(null=True)

    class Meta:
        managed = False
        db_table = "mensaje_contacto"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(estado__in=("PENDIENTE", "RESPONDIDO")),
                name="chk_mensaje_estado",
            ),
            models.CheckConstraint(
                condition=models.Q(
                    origen__in=("CONTACTO", "PROYECTO", "PROPIEDAD", "VISITA")
                ),
                name="chk_mensaje_origen",
            ),
        ]
        indexes = [
            models.Index(fields=["estado"], name="idx_mensaje_estado"),
            models.Index(fields=["fecha_recepcion"], name="idx_mensaje_fecha"),
        ]
