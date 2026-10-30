> Política actual: [tres roles fijos en código](politica-roles-fijos.md). Sustituye las secciones históricas de roles personalizables. Sin cambios a la base real.

# Roles y permisos (RBAC) (BE-11)

Estado al 25 de octubre de 2026, sobre `backend-dev`.
Referencias: [plan maestro §6.1 y §7](plan/PLAN-MAESTRO.md),
[BE-01, BE-02, BE-03 y BE-05](plan/PLAN-BACKEND.md),
[arquitectura](arquitectura.md) y [ADR 0001](adr/0001-rbac-por-datos.md).

## Modelo: permisos en código, roles en datos

- Un **permiso** es una acción concreta (`properties.publish`). El catálogo vive en
  código y sus nombres son contrato público: los usan la base de datos, la API y el
  frontend. **No se renombran.**
- Un **rol** es una fila de la tabla `rol` con una lista de permisos (`rol_permiso`).
  Se crean y editan desde el panel (`/admin/roles/`), sin desplegar código.
- Un **usuario** tiene uno o varios roles (`usuario_rol`). Sus permisos efectivos son
  la unión de los permisos de sus roles **activos**.
- Los permisos se calculan **en cada petición** (`persistence/accounts.py`). El JWT
  solo lleva el usuario y la sesión, así que un cambio de rol o de permisos aplica en la
  siguiente petición, sin volver a iniciar sesión.
- `admin.all` concede cualquier permiso. Las cuentas con el rol antiguo
  `Administrador`/`Admin` reciben `admin.all` por compatibilidad.

Las tablas son `rol`, `permiso`, `rol_permiso` y `usuario_rol`, con modelos
`managed=False` (`backend/persistence/models/access.py`).

## Los 32 permisos

El catálogo se arma en `apps/accounts/access_policy.py`: los 12 permisos de la plataforma
(`PLATFORM_PERMISSIONS` en `apps/common/rbac.py`) más los que genera cada fábrica de
publicaciones registrada (`apps/publications/factory.py`). La lista completa con sus
descripciones se consulta en `GET /api/v1/admin/permissions/`.

### Plataforma (12)

| Permiso | Qué permite |
| --- | --- |
| `admin.all` | Todo. Pasa cualquier comprobación de permisos. |
| `users.read` | Consultar usuarios y los roles disponibles para asignar. |
| `users.manage` | Lo anterior, más editar nombre y estado de un usuario y cambiar su rol. |
| `roles.read` | Consultar roles y el catálogo de permisos. |
| `roles.manage` | Lo anterior, más crear y editar roles. |
| `audit.read` | Consultar el historial de actividad. |
| `audit.export` | Exportar el historial a CSV. |
| `inquiries.read` | Consultar mensajes de contacto y solicitudes de visita. |
| `inquiries.manage` | Lo anterior, más cambiar su estado. |
| `media.upload` | Subir imágenes y consultar sus metadatos. |
| `media.delete` | Eliminar imágenes subidas. |
| `company.edit` | Editar datos de la empresa y textos de Nosotros. |

### Bienes raíces (8) y proyectos (8)

Los dos tipos usan la misma familia, generada con `publication_permissions(key, label)`.
Cambia solo el prefijo: `properties.` o `projects.`.

| Permiso | Qué permite |
| --- | --- |
| `<tipo>.create` | Crear. Sin `<tipo>.publish`, solo se guardan borradores. |
| `<tipo>.edit.any` | Editar cualquier publicación y ver todos los borradores. |
| `<tipo>.edit.own` | Editar solo **borradores propios** (creados por el usuario). |
| `<tipo>.publish` | Publicar o retirar. Sin él, cada edición guarda un borrador. |
| `<tipo>.trash.any` | Enviar cualquier publicación a papelera y ver toda la papelera. |
| `<tipo>.trash.own` | Enviar a papelera solo borradores propios y ver solo esos. |
| `<tipo>.restore` | Restaurar desde la papelera. |
| `<tipo>.delete_permanently` | Eliminar definitivamente desde la papelera. |

### Noticias (4)

Noticias no tiene papelera ni distinción propio/ajeno (DEC-04), así que su fábrica
genera una familia reducida:

| Permiso | Qué permite |
| --- | --- |
| `news.create` | Crear. Sin `news.publish`, se guardan como borrador. |
| `news.edit` | Editar y ver borradores. Si cambia `published`, además exige `news.publish`. |
| `news.publish` | Publicar o retirar. |
| `news.delete` | Eliminar definitivamente. |

Total: 12 + 8 + 8 + 4 = **32**.

## Cómo se comprueba un permiso

Todas las vistas con escritura declaran su permiso de forma explícita
(`apps/common/permissions.py`):

- **`ResourcePermission`** lee `permission_map` de la vista: `{método HTTP: (permisos)}`.
  Basta **uno** de los permisos de la tupla. `HEAD` y `OPTIONS` usan la entrada de `GET`.
  Un `GET` sin entrada es público si `read_public` es `True` (el valor por defecto).
  **Un método de escritura sin entrada se deniega**: olvidar el mapa nunca abre escritura.

  ```python
  class ProjectDetailView(APIView):
      permission_classes = [ResourcePermission]
      permission_map = {"PATCH": ("projects.edit.any", "projects.edit.own")}
  ```

- **`HasAnyPermission`** exige una de las claves de `required_permissions`. Se usa en
  vistas solo administrativas (historial, papelera por tipo, edición de usuarios).
- Dentro de la vista se aplican las reglas de alcance: `.own` solo sobre borradores
  propios (con bloqueo de fila, BE-06b) y `restrict_to_drafts` cuando falta `.publish`.

Respuestas: **401** sin token o con token vencido; **403** con token pero sin permiso.

El permiso por defecto de DRF en `settings.py` sigue siendo `IsAdminOrReadOnly`; solo
aplica a vistas que no declaran `permission_classes`.

## Roles predeterminados

Definidos en `builtin_roles()` (`apps/accounts/access_policy.py`). El resto de roles se
crea desde el panel.

| Rol | Permisos | Para quién |
| --- | --- | --- |
| **Ingeniero** | Los 32. Rol protegido. | Administrador principal |
| **Arquitecta** | `properties.create`, `properties.edit.any`, `properties.publish`, `properties.trash.any`, `properties.restore`, `media.upload` | Subadministradora de bienes raíces |
| **Empleado** | `properties.create`, `properties.edit.own`, `properties.trash.own`, `media.upload` | Prepara borradores propios de bienes raíces |

El rol **Ingeniero** no se puede renombrar ni desactivar y siempre conserva `admin.all`.
Si se agrega un permiso al catálogo, el Ingeniero lo recibe automáticamente al ejecutar el seed.

## Seed: `seed_access_control`

```bash
cd backend
python manage.py seed_access_control                # por defecto
python manage.py seed_access_control --add-missing
python manage.py seed_access_control --sync
```

`--add-missing` y `--sync` son excluyentes. En ningún modo se borran permisos, se
tocan roles personalizados ni se crean usuarios.

| | Por defecto | `--add-missing` | `--sync` |
| --- | --- | --- | --- |
| Permisos del catálogo | Crea los que falten y actualiza descripciones | Igual | Igual |
| Rol predeterminado que no existe | Lo crea con sus permisos | Igual | Igual |
| Arquitecta / Empleado ya existentes | **No los toca** | Agrega los permisos que les falten, sin quitar ninguno | Los deja **exactamente** como el catálogo: quita permisos añadidos a mano y restaura descripción y estado |
| Ingeniero | Todo el catálogo, activo | Igual | Igual |

El modo por defecto es el que se ejecuta en despliegues (DEC-02): respeta lo que el
equipo haya configurado desde el panel. `--sync` es destructivo para Arquitecta y
Empleado; acordarlo antes de usarlo en la base real.

## Matriz rol × endpoint

Rutas bajo `/api/v1/`. ✓ = permitido; "propios" = solo borradores creados por el usuario.
La comprueban `RoleEndpointMatrixTests` y `GranularPermissionTests` en
`backend/tests/test_resource_permissions.py`.

| Endpoint | Permiso exigido (basta uno) | Ingeniero | Arquitecta | Empleado |
| --- | --- | --- | --- | --- |
| `POST properties/` | `properties.create` | ✓ | ✓ | ✓ solo borrador |
| `PUT/PATCH properties/{id}/` | `properties.edit.any`, `properties.edit.own` | ✓ | ✓ | propios, sin publicar |
| `DELETE properties/{id}/` (a papelera) | `properties.trash.any`, `properties.trash.own` | ✓ | ✓ | propios |
| `GET admin/properties/trash/` | `properties.trash.*`, `.restore`, `.delete_permanently` | ✓ | ✓ | propios |
| `POST admin/properties/{id}/restore/` | `properties.restore` | ✓ | ✓ | ✗ |
| `DELETE admin/properties/{id}/permanent/` | `properties.delete_permanently` | ✓ | ✗ | ✗ |
| `POST projects/` | `projects.create` | ✓ | ✗ | ✗ |
| `PUT/PATCH projects/{slug}/` | `projects.edit.any`, `projects.edit.own` | ✓ | ✗ | ✗ |
| `DELETE projects/{slug}/` (a papelera) | `projects.trash.any`, `projects.trash.own` | ✓ | ✗ | ✗ |
| `GET admin/projects/trash/` | `projects.trash.*`, `.restore`, `.delete_permanently` | ✓ | ✗ | ✗ |
| `POST admin/projects/{slug}/restore/` | `projects.restore` | ✓ | ✗ | ✗ |
| `DELETE admin/projects/{slug}/permanent/` | `projects.delete_permanently` | ✓ | ✗ | ✗ |
| `GET admin/trash/?type=properties` | según `trash_access("properties")` | ✓ | ✓ | propios |
| `GET admin/trash/?type=projects` | según `trash_access("projects")` | ✓ | ✗ | ✗ |
| `POST news/` | `news.create` | ✓ | ✗ | ✗ |
| `PUT/PATCH news/{id}/` | `news.edit` (+ `news.publish` para cambiar `published`) | ✓ | ✗ | ✗ |
| `DELETE news/{id}/` | `news.delete` | ✓ | ✗ | ✗ |
| `GET inquiries/`, `GET inquiries/{id}/` | `inquiries.read`, `inquiries.manage` | ✓ | ✗ | ✗ |
| `PATCH inquiries/{id}/` | `inquiries.manage` | ✓ | ✗ | ✗ |
| `POST admin/media/`, `GET admin/media/{id}/` | `media.upload` | ✓ | ✓ | ✓ |
| `DELETE admin/media/{id}/` | `media.delete` | ✓ | ✗ | ✗ |
| `PUT company/`, `PUT institution/` | `company.edit` | ✓ | ✗ | ✗ |
| `GET admin/users/`, `GET admin/users/roles/` | `users.read`, `users.manage` | ✓ | ✗ | ✗ |
| `POST admin/users/` | `admin.all` | ✓ | ✗ | ✗ |
| `PATCH admin/users/{id}/`, `PUT admin/users/{id}/role/` | `users.manage` | ✓ | ✗ | ✗ |
| `GET admin/permissions/`, `GET admin/roles/`, `GET admin/roles/{id}/` | `roles.read`, `roles.manage` | ✓ | ✗ | ✗ |
| `POST admin/roles/`, `PATCH admin/roles/{id}/` | `roles.manage` | ✓ | ✗ | ✗ |
| `GET admin/audit/` | `audit.read` | ✓ | ✗ | ✗ |
| `GET admin/audit/export/` | `audit.export` | ✓ | ✗ | ✗ |

Lecturas públicas sin token: `health/`, `company/`, `institution/`, listados y detalle
publicados de `properties/`, `projects/` y `news/`, `properties/facets/`,
`projects/years/`, y el envío de `inquiries/contact/` e `inquiries/visits/`. Con token,
quien tiene `edit.any` (o `news.edit`/`news.publish`) también ve borradores;
con `properties.edit.own`, solo los suyos.

## Reglas de seguridad de usuarios y roles

Usuarios (BE-08, detalle en [usuarios-api.md](usuarios-api.md)):

1. Crear cuentas exige `admin.all` (ver decisión pendiente 1).
2. Nadie puede desactivarse ni cambiar su propio rol (`403`).
3. Nadie puede asignar un rol con permisos que no posee (`403`), salvo con `admin.all`.
4. No se puede desactivar ni quitar el rol al último Ingeniero activo (`400`).
5. Un rol inexistente o inactivo no se puede asignar (`400`).
6. La escritura y su registro en el historial son atómicos.

Roles:

1. Los roles no se eliminan; se desactivan con `active=false`.
2. El Ingeniero no se renombra, no se desactiva y conserva `admin.all` (`400`).
3. Los nombres `Admin` y `Administrador` están reservados (cuentas antiguas).
4. Un permiso desconocido devuelve `400`; los nombres de rol son únicos.
5. Crear y editar un rol queda en el historial.

## Cómo agregar un permiso

**Permiso de la plataforma** (no ligado a un tipo de publicación):

1. Agregar `"modulo.accion": "Descripción en español."` a `PLATFORM_PERMISSIONS` en
   `backend/apps/common/rbac.py`. El prefijo es el módulo y la acción va en minúsculas.
2. Protegerlo en la vista: agregar el permiso al `permission_map` (o a
   `required_permissions`). Si convive con otro, ponerlos en la misma tupla.
3. Si algún rol predeterminado debe tenerlo, agregarlo en `builtin_roles()`.
4. Actualizar las pruebas de catálogo (`tests/test_rbac_catalog.py` cuenta los 32) y
   agregar una prueba con y sin el permiso.
5. Ejecutar `python manage.py seed_access_control` (o `--add-missing` si un rol
   predeterminado existente debe recibirlo). El Ingeniero lo recibe siempre.
6. Avisar al frontend (menú y secciones en `adminData.js`) y regenerar
   `docs/openapi.yaml` si cambió el contrato.

**Permisos de un tipo de publicación nuevo:** no se escriben a mano. Se agrega una
fábrica y el catálogo los genera; ver [arquitectura.md](arquitectura.md#cómo-agregar-un-tipo-de-publicación).

## Decisiones pendientes y límites conocidos

1. **Crear cuentas** (`POST admin/users/`) sigue exigiendo `admin.all`: con
   `users.manage` se podría crear una cuenta con más permisos que los propios. Para
   abrirlo hay que aplicar la regla 3 de usuarios también al crear.
2. **Editar un proyecto sin `projects.publish` lo deja como borrador**, igual que en
   bienes raíces; si estaba publicado, queda despublicado. En noticias, en cambio, se
   conserva el estado y cambiar `published` exige `news.publish`.
3. **`roles.manage` permite otorgar cualquier permiso**, incluido `admin.all`, a
   cualquier rol, también al propio. Hoy solo el Ingeniero tiene `roles.manage`. Hasta
   que se aplique la misma regla que al asignar roles a usuarios, darlo solo a roles de
   plena confianza.
4. `GET projects/` con `projects.edit.own` (sin `.any`) no lista los borradores propios;
   el detalle sí los muestra. Bienes raíces ya filtra por dueño.
