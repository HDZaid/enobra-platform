# Administración de usuarios: contrato vigente

<!-- enobra-documentacion-vigente -->
> Guía vigente. Revisión documental: 3-nov-2026.
> [Base y límites técnicos](BASE-DOCUMENTACION-TECNICA.md). Las evidencias no se reinterpretan como nuevas ejecuciones.
<!-- /enobra-documentacion-vigente -->
Código: apps/accounts/user_views.py, user_serializers.py y persistence/users.py.
Autorización: [política fija](politica-roles-fijos.md). Contrato canónico:
[OpenAPI](openapi.yaml). La interfaz usa permisos efectivos, no nombres de roles
como sustituto de la autorización del servidor.

## Operaciones

| Método y ruta /api/v1/ | Acceso y regla de negocio |
| --- | --- |
| GET admin/users/ | users.read o users.manage; listado con q, page y page_size. |
| GET admin/users/roles/ | users.read o users.manage; roles predeterminados activos existentes. |
| POST admin/users/ | admin.all; crea cuenta, asigna un rol y registra auditoría. |
| PATCH admin/users/{id}/ | users.manage; nombre/estado de cuentas permitidas. Arquitecto no modifica Administradores. |
| PUT admin/users/{id}/role/ | Administrador; reemplaza asignaciones por un rol fijo activo existente. |

El listado devuelve count/page/page_size/results; page_size predeterminado 12,
máximo 100. El selector de roles no crea ni activa los que falten. Se conservan
IDs de la base; no fijar valores de role_id en el frontend ni usar los del ejemplo
como una asignación real. No hay endpoints de edición de roles personalizables.

## Datos y validación

Creación: name, email, password, role_id y active. Nombre hasta 120 caracteres;
correo hasta 150, normalizado a minúsculas y sin duplicados insensibles al caso.
Contraseña de 10 a 128, validadores Django, no solo números/común/similar al usuario;
se almacena con make_password. No publicar contraseñas de ejemplo reutilizables.

La respuesta contiene id, name, email, active, roles y created_at. Nunca devuelve
password ni password_hash. No hay registro público ni sesión automática al crear.
Una cuenta inactiva no autentica.

PATCH acepta name/active; no cambia correo, contraseña ni roles. PUT recibe role_id.
Las respuestas 400 incluyen errores por campo dentro de error.details; 401 implica
sesión ausente/inválida y 403, falta de autorización. Un ID no encontrado devuelve 404.

## Restricciones de seguridad

- No desactivar la propia cuenta ni cambiar el propio rol.
- No dejar el sistema sin Administrador activo.
- Arquitecto no crea usuarios, reasigna roles ni modifica cuentas administradoras.
- No editar/reasignar la cuenta técnica con contraseña inutilizable.
- No asignar roles faltantes, inactivos o no reconocidos por la política fija.
- Cada operación bloquea/recomprueba filas dentro de una transacción; sus cambios
  e historial se confirman juntos. No se usa una identidad inventada para auditar.

PATCH y PUT son operaciones separadas: si editar datos funciona y reasignar falla,
conservar la edición confirmada y reintentar solo el rol pendiente. La interfaz no
anuncia un éxito total ni revierte datos del servidor por su cuenta.

## Configuración de cuentas después de la exposición

El usuario aplazó la depuración de Supabase hasta después del 4-nov-2026. Se pretende
conservar una cuenta Admin y otra del Ingeniero; correos/titulares quedan pendientes
de definición. Ingeniero es actualmente alias de Administrador. No se eliminaron
cuentas, no se cambiaron contraseñas y no se publican identidades personales.
Revisar actor técnico de P-02, auditoría y claves foráneas antes de preparar esa tarea.

## Pruebas

Los tests test_users_api.py y test_fixed_roles.py ejercitan estas reglas con SQLite
separado. La suite general vigente registra 238 pruebas; no se reinterpreta una
cuenta ficticia como credencial real. Validar el acceso con titulares en el entorno
desplegado sigue pendiente; [estado](estado-proyecto.md).
