# Administración de usuarios del panel

## Contrato implementado en backend-dev

Requiere `Authorization: Bearer <access>` y acceso administrativo completo
(`admin.all`, incluyendo compatibilidad con cuentas Administrador antiguas).
Arquitecta y Empleado no pueden consultar ni crear usuarios. El permiso aislado
`users.manage` no permite asignarse roles superiores mediante estos endpoints.

- `GET /api/v1/admin/users/?q=&page=1&page_size=12`: listado paginado con búsqueda
  por nombre/correo. Máximo 100 filas por página.
- `GET /api/v1/admin/users/roles/`: roles activos existentes, con la forma de
  `RoleSerializer`. No crea ni modifica roles.
- `POST /api/v1/admin/users/`: crea cuenta, asigna un rol y registra auditoría en
  una transacción. Devuelve `201`; los errores de campos usan `400` y el formato
  uniforme `{error: {code, message, details}}`.

```json
{
  "name": "Nombre completo",
  "email": "cuenta@example.com",
  "password": "contraseña privada elegida en el formulario",
  "role_id": 3,
  "active": true
}
```

`role_id` debe provenir de la consulta de roles, no de IDs fijos. La cuenta se
devuelve con `id`, `name`, `email`, `active`, `roles` y `created_at`. Nunca se
devuelven contraseñas ni hashes. No hay auto-registro ni inicio de sesión automático.

Nombre: 120 caracteres. Correo: 150, normalizado a minúsculas y sin duplicados,
incluyendo cuentas existentes con otras mayúsculas. Contraseña: 10–128 caracteres,
no solo números, no común ni similar a los datos del usuario. Usa los validadores
de Django y `make_password`. Una cuenta inactiva no puede iniciar sesión.

Se reutilizan `usuario`, `usuario_rol`, `rol` y `historial_actividad`. No se alteran
la conexión, los modelos ni las tablas. El formulario puede operar una vez
integrado este contrato en el entorno donde se ejecute el frontend.

## Edición y reemplazo de rol (BE-08)

Con `users.manage` (o `admin.all`), `PATCH /api/v1/admin/users/{id}/`
acepta `name` y/o `active`; `PUT /api/v1/admin/users/{id}/role/` acepta
`role_id`. Ambos devuelven `200` con la misma representación del usuario.
El PUT reemplaza todas las asignaciones anteriores por un único rol activo;
no agrega un rol adicional. El listado y la creación conservan sus permisos actuales.

No se permite desactivarse ni cambiar el propio rol (`403`). Tampoco asignar
permisos que el actor no posee (`403`), salvo cuando tiene `admin.all`.
No se puede desactivar ni quitar el rol al último Ingeniero activo (`400`,
detalle en `active` o `role_id`). Un rol inexistente o inactivo devuelve `400`
con detalle en `role_id`; un usuario inexistente devuelve `404`.
Los datos inválidos devuelven `400 validation_error`; sin sesión, `401`;
sin `users.manage`, `403`. Se mantiene el formato de error uniforme.

Las escrituras y su auditoría son atómicas: `EDITAR` registra los cambios de
nombre/estado y `ROL` los nombres del rol anterior y del nuevo. Un fallo de
auditoría revierte la escritura. Las bajas y reasignaciones bloquean el rol
Ingeniero y la fila del usuario para proteger al último Ingeniero activo.

Pruebas desde backend:

```powershell
.\.venv\Scripts\python.exe manage.py test tests --settings=config.test_settings
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py spectacular --file ../docs/openapi.yaml --validate --fail-on-warn
```
