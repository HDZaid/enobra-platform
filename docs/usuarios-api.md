> Política actual: [tres roles fijos en código](politica-roles-fijos.md). Sustituye las secciones históricas de roles personalizables. Sin cambios a la base real.

# Administración de usuarios del panel

## Contrato implementado en backend-dev

Requiere `Authorization: Bearer <access>`. Se autoriza por permisos efectivos,
no por el nombre del rol. `admin.all` permite todas las operaciones de esta tabla,
incluyendo la compatibilidad con cuentas Administrador antiguas.

| Método y ruta | Permiso requerido además de sesión válida | Resultado |
| --- | --- | --- |
| `GET /api/v1/admin/users/` | `users.read` o `users.manage` | `200`, listado paginado |
| `GET /api/v1/admin/users/roles/` | `users.read` o `users.manage` | `200`, arreglo de roles activos |
| `POST /api/v1/admin/users/` | `admin.all` | `201`, cuenta creada |
| `PATCH /api/v1/admin/users/{id}/` | `users.manage` | `200`, cuenta actualizada |
| `PUT /api/v1/admin/users/{id}/role/` | `users.manage` | `200`, cuenta con el rol reemplazado |

Crear cuentas sigue reservado a `admin.all`: `users.manage` por sí solo permite
editar y reemplazar roles, pero no crear usuarios. La protección contra asignar
permisos superiores se aplica al reemplazo de rol. `users.read` solo permite
consultar. Los roles predeterminados Arquitecta y Empleado no tienen estos permisos.

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

### Editar nombre o estado

`PATCH /api/v1/admin/users/{id}/` acepta al menos uno de `name` (nombre no
vacío, máximo 120 caracteres) y `active` (booleano). No cambia el correo ni
la contraseña y no asigna roles. Ejemplo de cuerpo:

```json
{
  "name": "Nombre actualizado",
  "active": true
}
```

### Reemplazar las asignaciones de rol

`PUT /api/v1/admin/users/{id}/role/` requiere `role_id`, entero positivo de
un rol activo obtenido de `/api/v1/admin/users/roles/`. Ejemplo de cuerpo
(el identificador es ilustrativo):

```json
{
  "role_id": 3
}
```

Ambas operaciones devuelven `200` con `id`, `name`, `email`, `active`, `roles`
y `created_at`. `id` es texto; cada elemento de `roles` contiene `id` numérico,
`name`, `description`, `active` y `permissions`. El listado puede mostrar varias
asignaciones heredadas; un PUT exitoso deja únicamente el rol elegido.

### Seis reglas de BE-08

1. No se puede desactivar ni quitar el rol al último Ingeniero activo: devuelve
   `400 validation_error`, con detalle en `active` o `role_id`.
2. Nadie puede desactivarse ni cambiar su propio rol: devuelve
   `403 permission_denied`, incluso con `admin.all`. Sí puede editar su nombre.
3. El rol asignado no puede contener permisos que quien lo asigna no posee:
   devuelve `403 permission_denied`. Tener `admin.all` exceptúa esta comparación,
   pero no las protecciones de las reglas 1 y 2.
4. El rol de destino debe existir y estar activo: de lo contrario devuelve
   `400 validation_error` con detalle en `role_id`.
5. El PUT reemplaza todas las asignaciones anteriores por el rol indicado;
   no agrega un rol adicional ni modifica los permisos del rol.
6. Cada cambio escribe historial del módulo `users`: `EDITAR` para nombre/estado
   y `ROL` para el reemplazo, incluyendo los nombres de los roles anteriores y
   del nuevo en la descripción.

### Errores y guardados parciales

| Estado | Código uniforme | Causa |
| --- | --- | --- |
| `400` | `validation_error` | Campos inválidos, PATCH vacío, rol de destino inválido o protección del último Ingeniero |
| `401` | `not_authenticated` | Falta sesión válida o el token ha vencido |
| `403` | `permission_denied` | Falta el permiso de la operación, autobloqueo o asignación de permisos superiores |
| `404` | `not_found` | El usuario objetivo no existe |

Ejemplo de `400` al intentar desactivar al último Ingeniero activo:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Los datos enviados no son válidos.",
    "details": {
      "active": "Debe conservarse al menos un Ingeniero activo."
    }
  }
}
```

Los mensajes de permisos usan `error.message`; los errores de campo usan
`error.details` y pueden contener texto o listas de mensajes. La interfaz debe
conservar ambos, sin sustituir la regla del servidor por un mensaje de éxito.

Las escrituras y su auditoría son atómicas: `EDITAR` registra los cambios de
nombre/estado y `ROL` los nombres del rol anterior y del nuevo. Un fallo de
auditoría revierte la escritura. Las bajas y reasignaciones bloquean el rol
Ingeniero y la fila del usuario para proteger al último Ingeniero activo.

PATCH y PUT son transacciones independientes: si PATCH tiene éxito y PUT falla,
el nombre/estado ya quedó guardado. FE-14 informa el resultado parcial y permite
reintentar solo el rol pendiente. No existe una operación conjunta que revierta
ambas solicitudes.

## Verificación de BE-13

Revisión del 25 de octubre de 2026: suite completa de 189 pruebas aprobada,
`manage.py check` sin problemas y los cuatro ejemplos JSON de este documento
validados sintácticamente.

Referencia de implementación: `backend/apps/accounts/user_views.py`,
`user_serializers.py`, `backend/persistence/users.py` y
`backend/tests/test_users_api.py`. Las pruebas cubren las seis reglas,
autenticación/permisos, validaciones, reemplazo de múltiples roles y reversión
de la escritura cuando falla la auditoría.

Pruebas desde backend:

```powershell
.\.venv\Scripts\python.exe manage.py test tests --settings=config.test_settings
.\.venv\Scripts\python.exe manage.py check
```

Estas pruebas usan SQLite aislado y no validan concurrencia real de PostgreSQL
ni Supabase. `docs/openapi.yaml` lo regenera Henry; esta tarea de documentación
no cambia el contrato HTTP ni necesita regenerarlo.
