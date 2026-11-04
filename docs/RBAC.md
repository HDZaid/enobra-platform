# Roles y permisos efectivos

<!-- enobra-documentacion-vigente -->
> Guía vigente. Revisión documental: 3-nov-2026.
> [Base y límites técnicos](BASE-DOCUMENTACION-TECNICA.md). Las evidencias no se reinterpretan como nuevas ejecuciones.
<!-- /enobra-documentacion-vigente -->
La política actual se calcula en `backend/apps/accounts/access_policy.py` y se
aplica en `DjangoAuthService._principal`. Los roles/asignaciones conservan sus
IDs en Supabase, pero no son personalizables desde el panel. Véase la
[política funcional](politica-roles-fijos.md).

## Identidad, permisos y compatibilidad

- Una cuenta debe estar ACTIVA y tener un rol activo reconocido.
- Administrador admite los alias Ingeniero, admin y Administrador; Arquitecto
  admite Arquitecta y Arquitecto; Empleado conserva su nombre.
- Los permisos de roles humanos guardados en RolPermiso no amplían la política.
- Si hay varios roles reconocidos, se toma la intersección de permisos y el rol
  de menor privilegio; no se suman facultades.
- El frontend refleja permisos devueltos por la API. El nombre del rol mostrado
  no sustituye la validación de identidad/autorización en Django.
- admin.all satisface los permisos comunes, pero las reglas específicas de
  usuarios, propiedad y transiciones siguen aplicándose en los repositorios.

## Catálogo y operaciones retiradas

El catálogo técnico mantiene 32 códigos por compatibilidad y pruebas. Los códigos
roles.read y roles.manage no se entregan a sesiones humanas de la política fija.
Las rutas admin/roles/, admin/roles/{id}/ y admin/permissions/ están retiradas:
responden 404 y no hay pantallas de Roles. No usar seed ni SQL para convertir el
catálogo histórico en un editor de roles.

El selector GET admin/users/roles/ devuelve roles predeterminados activos que ya
existen, con IDs reales y descripciones de política. No crea roles faltantes.

## Matriz calculada desde el código

La tabla siguiente enumera permisos efectivos, no el contenido actual de las
asignaciones en una base concreta. La cuenta técnica de P-02 es una excepción
no interactiva explicada en la política y en la guía de limpieza.

| Permiso | Administrador | Arquitecto | Empleado |
| --- | --- | --- | --- |
| `admin.all` | Sí | No | No |
| `audit.export` | Sí | Sí | No |
| `audit.read` | Sí | Sí | No |
| `company.edit` | Sí | Sí | No |
| `inquiries.manage` | Sí | Sí | No |
| `inquiries.read` | Sí | Sí | No |
| `media.delete` | Sí | Sí | No |
| `media.upload` | Sí | Sí | Sí |
| `news.create` | Sí | Sí | Sí |
| `news.delete` | Sí | Sí | No |
| `news.edit` | Sí | Sí | Sí |
| `news.publish` | Sí | Sí | Sí |
| `projects.create` | Sí | Sí | Sí |
| `projects.delete_permanently` | Sí | No | No |
| `projects.edit.any` | Sí | Sí | Sí |
| `projects.edit.own` | Sí | Sí | No |
| `projects.publish` | Sí | Sí | Sí |
| `projects.restore` | Sí | Sí | No |
| `projects.trash.any` | Sí | Sí | No |
| `projects.trash.own` | Sí | Sí | No |
| `properties.create` | Sí | Sí | Sí |
| `properties.delete_permanently` | Sí | No | No |
| `properties.edit.any` | Sí | Sí | Sí |
| `properties.edit.own` | Sí | Sí | No |
| `properties.publish` | Sí | Sí | Sí |
| `properties.restore` | Sí | Sí | No |
| `properties.trash.any` | Sí | Sí | No |
| `properties.trash.own` | Sí | Sí | No |
| `roles.manage` | No | No | No |
| `roles.read` | No | No | No |
| `users.manage` | Sí | Sí | No |
| `users.read` | Sí | Sí | No |

Permisos efectivos: Administrador 30, Arquitecto 27 y Empleado 10. Crear usuarios
y reasignar roles requiere Administrador. Arquitecto puede editar nombre/estado
de cuentas no administradoras, con las protecciones del repositorio. Empleado
puede editar/publicar contenido ajeno y no tiene acceso a papelera.

## Fuentes y validación

- Código: access_policy.py, persistence/accounts.py, persistence/users.py y permissions.py.
- Contrato: [OpenAPI](openapi.yaml), [Usuarios](usuarios-api.md).
- Pruebas: test_fixed_roles.py y test_users_api.py en backend/tests, más fixtures
  aislados y runner de integración. Las cifras generales están en el estado vigente.
- Verificar roles y recorridos en producción con titulares autorizados; no confundir
  un Principal de pruebas con un inicio de sesión real en Supabase.
