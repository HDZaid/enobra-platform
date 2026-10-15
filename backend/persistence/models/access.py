from django.db import models
from django.db.models.functions import Now


class Rol(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="id_rol")
    nombre = models.CharField(max_length=60)
    descripcion = models.CharField(max_length=250, null=True)
    estado = models.BooleanField(db_default=True)
    fecha_creacion = models.DateTimeField(db_default=Now())
    permisos = models.ManyToManyField(
        "Permiso", through="RolPermiso", related_name="roles"
    )

    class Meta:
        managed = False
        db_table = "rol"
        constraints = [
            models.UniqueConstraint(fields=["nombre"], name="rol_nombre_key"),
        ]


class Permiso(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="id_permiso")
    nombre = models.CharField(max_length=100)
    descripcion = models.CharField(max_length=250, null=True)
    fecha_creacion = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = "permiso"
        constraints = [
            models.UniqueConstraint(fields=["nombre"], name="permiso_nombre_key"),
        ]


class Usuario(models.Model):
    id = models.BigAutoField(primary_key=True, db_column="id_usuario")
    nombre = models.CharField(max_length=120)
    correo = models.CharField(max_length=150)
    password_hash = models.CharField(max_length=255)
    estado = models.CharField(max_length=20, db_default="ACTIVO")
    fecha_creacion = models.DateTimeField(db_default=Now())
    fecha_actualizacion = models.DateTimeField(null=True)
    roles = models.ManyToManyField(Rol, through="UsuarioRol", related_name="usuarios")

    class Meta:
        managed = False
        db_table = "usuario"
        constraints = [
            models.UniqueConstraint(fields=["correo"], name="usuario_correo_key"),
            models.CheckConstraint(
                condition=models.Q(estado__in=("ACTIVO", "INACTIVO")),
                name="chk_usuario_estado",
            ),
        ]
        indexes = [models.Index(fields=["correo"], name="idx_usuario_correo")]


class UsuarioRol(models.Model):
    pk = models.CompositePrimaryKey("usuario_id", "rol_id")
    usuario = models.ForeignKey(
        Usuario,
        models.CASCADE,
        db_column="id_usuario",
        db_index=False,
        related_name="asignaciones_rol",
    )
    rol = models.ForeignKey(
        Rol,
        models.CASCADE,
        db_column="id_rol",
        db_index=False,
        related_name="asignaciones_usuario",
    )
    fecha_asignacion = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = "usuario_rol"
        indexes = [
            models.Index(fields=["usuario"], name="idx_usuario_rol_usuario"),
            models.Index(fields=["rol"], name="idx_usuario_rol_rol"),
        ]


class RolPermiso(models.Model):
    pk = models.CompositePrimaryKey("rol_id", "permiso_id")
    rol = models.ForeignKey(
        Rol,
        models.CASCADE,
        db_column="id_rol",
        db_index=False,
        related_name="asignaciones_permiso",
    )
    permiso = models.ForeignKey(
        Permiso,
        models.CASCADE,
        db_column="id_permiso",
        db_index=False,
        related_name="asignaciones_rol",
    )

    class Meta:
        managed = False
        db_table = "rol_permiso"
        indexes = [
            models.Index(fields=["rol"], name="idx_rol_permiso_rol"),
            models.Index(fields=["permiso"], name="idx_rol_permiso_permiso"),
        ]
