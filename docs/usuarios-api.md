# Creación de usuarios del panel

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

Pruebas desde backend:

```powershell
.\.venv\Scripts\python.exe manage.py test tests --settings=config.test_settings
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py spectacular --file ../docs/openapi.yaml --validate --fail-on-warn
```
