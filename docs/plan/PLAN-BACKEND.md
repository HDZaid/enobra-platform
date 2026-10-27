# Plan de Backend (Django + DRF) hacia la entrega del 25 de octubre

> Equipo y rama: **Henry, Juan y Pablo → `backend-dev`**. Reglas, calendario, contratos de API (§6 del maestro) y decisiones: ver [`PLAN-MAESTRO.md`](PLAN-MAESTRO.md).
> Este plan no toca `frontend/`. Si una tarea exige un cambio ahí, se le pasa a quien corresponda en `PLAN-FRONTEND.md`.
> Los `§` remiten a la auditoría `auditoria-enobra-platform.md`.

---

## 1. Módulos y responsables

| Módulo | Qué resuelve | Tareas | Responsable principal | Por qué (historial) |
|---|---|---|---|---|
| **M-CONTRATOS** | Stubs de API para desbloquear al frontend | BE-00 | Henry | Escribió los contratos iniciales (`baaeed7`, 90 archivos) |
| **M-RBAC** | 32 permisos, permiso por recurso, seed | BE-01, BE-02, BE-03 | Henry | Autor de `access_control.py`, `access_policy.py` y el RBAC (`28e36dc`) |
| **M-PUB** | Papelera genérica y fábrica de publicaciones | BE-04, BE-05, BE-06 | Juan → Henry → Pablo | Juan: capa de datos; Henry: arquitectura; Pablo: autor de `catalog.py` |
| **M-AUD** | Lectura y exportación del historial | BE-07 | Juan | Capa de datos y modelos (`persistence/models`) |
| **M-USR** | Editar usuarios y cambiar rol | BE-08 | Pablo | Autor de `users.py` y de la creación de usuarios |
| **M-INQ** | Notificación de consultas (el "disparador") | BE-09 | Juan | Capa de persistencia; DEC-06 confirmada |
| **M-DATA** | Validar contra Supabase real | BE-10 | Juan | Mantiene el esquema y la conexión |
| **M-DOC** | Documentación de referencia | BE-11, BE-12, BE-13 | Henry, Juan, Pablo | Cada quien documenta lo que construye |

### Orden de integración en `backend-dev` (evita conflictos en `catalog.py` y `config/*`)

1. **BE-00** (Henry): stubs y `INSTALLED_APPS`/URLs, primero y rápido.
2. **BE-04** (Juan): papelera genérica; es dueño de `persistence/catalog.py` hasta que publique.
3. **BE-01 → BE-02** (Henry): catálogo y permisos por recurso; la parte de Proyectos de BE-02 espera a BE-04.
4. **BE-05** (Henry, sábado): fábrica, **después** de que BE-04 esté publicada.
5. **BE-06b** (Pablo, sábado): carrera de borradores, después de BE-04.

---

## 2. Fichas de tareas

### BE-00. Contratos stub de los endpoints nuevos
**P0 · D · 2 h · Henry · Sin dependencias · Vie 23, mañana**

**Objetivo:** que el frontend pueda programar contra `docs/openapi.yaml` hoy mismo. Los endpoints nuevos existen, validan permisos y entradas, y devuelven `501 not_implemented` hasta que su tarea los implemente (comportamiento que el proyecto ya usa con `NotBoundError`).

**Leer primero:** `PLAN-MAESTRO.md §6.2`; `backend/apps/common/registry.py`, `errors.py`; `backend/apps/accounts/views.py` (patrón de vistas); `backend/config/bindings.py`.

**Puede editar:**
- Nuevas apps: `backend/apps/audit/` y `backend/apps/publications/` (cada una con `__init__.py`, `apps.py`, `interfaces.py`, `serializers.py`, `views.py`, `urls.py`).
- `backend/config/settings.py` (solo `INSTALLED_APPS`), `backend/config/urls.py`, `backend/config/bindings.py`.
- `backend/apps/accounts/admin_urls.py` y `user_views.py` (solo rutas y vistas stub de `PATCH /admin/users/{id}/` y `PUT …/role/`; **avisar a Pablo**).
- `backend/apps/projects/urls.py` y `views.py` (solo rutas stub de papelera; **avisar a Juan**).
- `docs/openapi.yaml` (regenerado, no a mano).

**No tocar:** `persistence/catalog.py` (Juan), lógica de negocio real.

**Contrato:** exactamente la tabla de `PLAN-MAESTRO.md §6.2`. Interfaces nuevas: `AuditRepository` (`list`, `export_rows`), `PublicationFactory` (ver BE-05).

**Hecho cuando:**
- Cada endpoint de §6.2 aparece en OpenAPI con sus parámetros, esquemas de respuesta y permisos.
- Sin sesión devuelve 401; con sesión sin permiso, 403; con permiso, 501 `not_implemented`.
- `manage.py check` y los 57 tests actuales siguen en verde.

**Verificación:**
```powershell
cd backend
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py test tests --settings=config.test_settings
.\.venv\Scripts\python.exe manage.py spectacular --file ../docs/openapi.yaml --validate --fail-on-warn
```

---

### BE-01. Catálogo de 32 permisos y roles base
**P0 · D · 3 h · Henry · Depende de BE-00 (nombres congelados) · Vie 23**

**Objetivo:** pasar de 12 a 32 permisos generados por función (§2.3), sin cambiar los 12 existentes.

**Leer primero:** `backend/apps/accounts/access_policy.py`; auditoría §2.3 y §2.4; `PLAN-MAESTRO.md §6.1`.

**Puede editar:**
- `backend/apps/common/rbac.py` (nuevo): `publication_permissions(key, label, *, ownership=True)` y `PLATFORM_PERMISSIONS`.
- `backend/apps/accounts/access_policy.py`: `PERMISSION_CATALOG` (32) y `BUILTIN_ROLES`.
- `backend/tests/test_rbac_catalog.py` (nuevo).

**No tocar:** nombres de los 12 permisos existentes; `persistence/access_control.py` salvo que una prueba lo exija.

**Roles base (DEC-07, DEC-08):**
- **Ingeniero:** los 32.
- **Arquitecta:** sus 5 actuales + `media.upload`.
- **Empleado:** sus 3 actuales + `media.upload`.

**Hecho cuando:**
- `len(PERMISSION_CATALOG) == 32` y los 12 originales conservan su nombre.
- Cada permiso tiene descripción en español.
- Una prueba falla si alguien renombra uno de los 12.
- El catálogo se arma con `publication_permissions("properties", …)` y `("projects", …)`; no hay literales repetidos.

**Verificación:** `manage.py test tests.test_rbac_catalog --settings=config.test_settings`.

---

### BE-02. `ResourcePermission` aplicado a todos los módulos
**P0 · D · 3 h · Henry · Depende de BE-01; la parte de Proyectos, de BE-04 · Vie 23 (resto) y sáb 24 (Proyectos)**

**Objetivo:** reemplazar el uso del permiso por defecto `IsAdminOrReadOnly` y los `IsAdmin` por **una sola clase** configurada por vista. Hoy solo Propiedades tiene permisos finos (§1, §3).

**Leer primero:** `backend/apps/common/permissions.py`; `apps/properties/views.py` (`PropertyAccessPermission` es el modelo a generalizar); `apps/media/views.py`; `apps/inquiries/views.py`; `apps/news/views.py`; `apps/projects/views.py`; `apps/company/views.py`.

**Puede editar:** `apps/common/permissions.py`; las `views.py` de projects, news, inquiries, media, company, accounts (solo `GET` de usuarios, roles y permisos); sus pruebas.

**No tocar:** `persistence/catalog.py` (Juan hasta BE-04); `PATCH/PUT` de usuarios (Pablo, BE-08).

**Diseño:**
```python
class ResourcePermission(BasePermission):
    """Lectura pública (si read_public=True); escritura según view.permission_map[METHOD]."""
    def has_permission(self, request, view): ...
```
`admin.all` sigue pasando siempre (compatibilidad con `Principal.has_permission`). `PropertyAccessPermission` se reescribe sobre esta clase sin cambiar su comportamiento.

**Mapa de permisos por endpoint:**

| Endpoint | Permisos aceptados |
|---|---|
| `POST /projects/` | `projects.create` |
| `PUT/PATCH /projects/{slug}/` | `projects.edit.any` o `projects.edit.own` (propio y en borrador; igual que Propiedades). Quien no tenga `projects.publish` guarda siempre como borrador |
| `DELETE /projects/{slug}/` | `projects.trash.any` o `.own` |
| `POST /news/` | `news.create` |
| `PUT/PATCH /news/{id}/` | `news.edit`; cambiar `published` exige `news.publish` |
| `DELETE /news/{id}/` | `news.delete` |
| `GET /inquiries/`, `GET /inquiries/{id}/` | `inquiries.read` o `inquiries.manage` |
| `PATCH /inquiries/{id}/` | `inquiries.manage` |
| `POST /admin/media/` | `media.upload` |
| `GET/DELETE /admin/media/{id}/` | `media.upload` / `media.delete` |
| `PUT /company/`, `PUT /institution/` | `company.edit` |
| `GET /admin/users/`, `/admin/users/roles/` | `users.read` o `users.manage` |
| `GET /admin/roles/`, `/admin/permissions/` | `roles.read` o `roles.manage` |

**Hecho cuando:**
- Existe una **prueba parametrizada rol × endpoint** (Ingeniero, Arquitecta, Empleado, anónimo) que cubre la tabla. Cambios clave: **Arquitecta y Empleado ahora pueden subir medios**; no pueden crear proyectos, ver mensajes ni administrar usuarios.
- Con un rol personalizado con solo `inquiries.read`, `GET /inquiries/` devuelve 200 y `PATCH` 403.
- Los 57 tests anteriores siguen en verde (se ajustan solo los que asumían `admin.all` para esas rutas, explicando el cambio en el commit).

**Verificación:** `manage.py test tests --settings=config.test_settings`.

---

### BE-03. Seed no destructivo
**P0 · M · 1 h · Henry · Depende de BE-01 · Vie 23**

**Objetivo:** que correr el seed en un despliegue **no borre** lo que el ingeniero configuró desde la interfaz (§2.5, DEC-02).

**Leer primero:** `backend/persistence/management/commands/seed_access_control.py` (hoy borra con `.exclude(...).delete()`).

**Puede editar:** ese comando y su prueba.

**Comportamiento:**
- Por defecto: crea permisos y roles que **falten**; para roles que ya existen **no cambia sus permisos**; el **Ingeniero siempre queda con los 32** (rol protegido).
- `--add-missing`: agrega a los roles predeterminados los permisos que les falten, sin quitar ninguno (sirve para dar `media.upload` a Arquitecta y Empleado en la base ya existente).
- `--sync`: reconciliación total (el comportamiento actual), solo cuando se pide.
- Es idempotente y nunca crea usuarios.

**Hecho cuando:** pruebas para las tres variantes; en especial, un rol editado a mano conserva sus cambios tras un seed por defecto.

**Verificación:** `manage.py test tests --settings=config.test_settings`.

---

### BE-04. Papelera genérica y unificada
**P0 · D · 4 h · Juan · Depende de BE-00 · Vie 23 (debe cerrarse el viernes)**

**Objetivo:** que Proyectos tenga la misma papelera que Propiedades, sin cambiar el esquema de la base (DEC-05) y sin la consulta por registro de hoy (§3.2).

**Leer primero:** `backend/persistence/catalog.py` completo (clases `CatalogRepository`, `DjangoPropertyRepository`: métodos `delete`, `list_trash`, `restore`, `delete_permanently`, `_trashed_ids`); `apps/properties/views.py` (vistas de papelera); `apps/projects/interfaces.py`.

**Puede editar:** `persistence/catalog.py`, `apps/projects/{interfaces,views,urls}.py`, `apps/publications/{views,urls}.py`, `persistence/support.py` (solo `audit`), `tests/test_trash.py` (nuevo) y las pruebas existentes que asuman borrado definitivo de proyectos.

**No tocar:** `config/*` (Henry), `access_policy.py` (Henry).

**Qué hacer:**
1. Subir a `CatalogRepository` los métodos `delete` (que pasa a ser **a papelera**), `list_trash`, `restore`, `delete_permanently` e `is_own_draft`. Se activan con un atributo `supports_trash` (`True` en propiedades y proyectos; `False` en noticias, por DEC-04).
2. Corregir `_trashed_ids`: **una sola consulta** que traiga clave y contenido y filtre en Python; sin releer cada clave. Las listas públicas y de administración deben **excluir** lo que está en papelera, también para proyectos.
3. Ampliar `ProjectRepository` (interfaz) con `list_trash`, `restore`, `delete_permanently`, `is_own_draft`.
4. `DELETE /projects/{slug}/` envía a papelera. Agregar `GET /admin/projects/trash/`, `POST /admin/projects/{slug}/restore/`, `DELETE /admin/projects/{slug}/permanent/`.
5. `GET /admin/trash/?type=properties|projects` en `apps/publications/`: lista unificada con `type`, `id`, `title`, `trashed_at`, `trashed_by`, `trashed_by_name`, `was_published`, `owner_id`. Cada tipo exige sus permisos (`*.trash.*`, `*.restore`, `*.delete_permanently`); quien solo tiene `*.trash.own` ve **únicamente lo suyo**.
6. Auditar con acciones `PAPELERA`, `RESTAURAR` y `ELIMINAR_PERMANENTE`, módulo `projects`.

**Cuidado:** el id de propiedades es numérico y el de proyectos es un `slug`; el listado unificado devuelve `id` como texto y `type` para distinguirlos.

**Hecho cuando:**
- Un proyecto enviado a papelera deja de verse en `/projects/` (público y admin), aparece en la papelera, se restaura con su estado previo (`was_published`) y se elimina definitivamente solo desde la papelera.
- `assertNumQueries` demuestra que listar la papelera ya no depende de la cantidad de registros.
- Empleado ve solo su papelera; Ingeniero ve todas.
- Los tests que esperaban `ELIMINAR` para proyectos se actualizan a `PAPELERA` con justificación en el commit.

**Verificación:** `manage.py test tests --settings=config.test_settings` y `manage.py check`.

---

### BE-05. Fábrica de publicaciones (Abstract Factory, escalable)
**P0 · D · 4 h · Henry · Depende de BE-04 · Sáb 24**

**Objetivo:** que agregar un nuevo tipo de publicación (por ejemplo "Terrenos") sea **una clase y un registro**, no una copia de módulos. Cumple el requerimiento "Abstract Factory – Backend (Escalable)" en el lugar donde sí aporta (§2.2).

**Leer primero:** auditoría §2.2 y §2.3; `persistence/catalog.py` (tras BE-04); `apps/common/rbac.py` (BE-01); `config/bindings.py`.

**Puede editar:** `apps/publications/{interfaces,factory,registry,views}.py`, `config/bindings.py`, `apps/common/rbac.py`, `apps/accounts/access_policy.py` (solo para que el catálogo se arme desde las fábricas), `tests/test_publication_factory.py` (nuevo).

**No tocar:** las vistas existentes de propiedades, proyectos y noticias: **no se reescriben** (riesgo de regresión a dos días de la entrega).

**Diseño:**
```python
@dataclass(frozen=True)
class PublicationKit:
    key: str                  # "properties", "projects"
    label: str                # "bienes raíces", "proyectos"
    repository: object        # implementa la interfaz de repositorio del tipo
    permissions: dict         # generado con publication_permissions()
    audit_module: str         # valor de historial_actividad.modulo
    supports_trash: bool
    ownership: bool           # distingue .any / .own

class PublicationFactory(ABC):
    @abstractmethod
    def create_kit(self) -> PublicationKit: ...

class PropertyFactory(PublicationFactory): ...
class ProjectFactory(PublicationFactory): ...
class NewsFactory(PublicationFactory): ...     # supports_trash=False

publication_registry.register(PropertyFactory()); ...
```
Se registra en `bindings.py`. La fábrica es la **única fuente** de: (1) permisos del catálogo, (2) tipos que aparecen en `/admin/trash/`, (3) la etiqueta de cada módulo en el historial.

**Hecho cuando:**
- El catálogo de 32 permisos sale de iterar las fábricas, con el mismo resultado de BE-01.
- `/admin/trash/` itera las fábricas con `supports_trash`.
- **Prueba de extensibilidad:** en un test se registra una fábrica ficticia ("terrenos") y sus permisos aparecen en el catálogo, y su tipo en `/admin/trash/`, **sin editar ningún otro archivo**.
- Los tests anteriores siguen en verde.

**Si hay retraso (plan de recorte):** se entrega solo la parte de permisos y papelera.

**Verificación:** `manage.py test tests --settings=config.test_settings`.

---

### BE-06. Límites numéricos y carrera de borradores
**P0 · M · 2 h · Pablo · BE-06a sin dependencias (Vie 23); BE-06b depende de BE-04 (Sáb 24)**

**Estado (24-oct):** BE-06a y BE-06b implementadas. Edición y envío a papelera
comprueban propietario y estado sobre la fila bloqueada dentro de la transacción.
Las pruebas intercalan una publicación antes de PUT, PATCH y DELETE y verifican
403 sin cambios adicionales; también cubren borradores ajenos y operaciones
permitidas. Suite completa: 122 pruebas en verde con `config.test_settings`;
`manage.py check` sin problemas. SQLite no valida el bloqueo concurrente real
de PostgreSQL/Supabase.

**Objetivo:** que los formularios de propiedades no provoquen errores 500 y que un Empleado no conserve autorización después de que su borrador se publique (§3.2; `docs/reporte-revision-admin.md` ADM-02; `docs/integracion-backend-frontend.md §2`).

**Leer primero:** `apps/properties/serializers.py`; `persistence/models/properties.py` (`precio` `max_digits=12, decimal_places=2`; `superficie_m2` `max_digits=10`); `apps/common/errors.py`.

**BE-06a (viernes), puede editar:** `apps/properties/serializers.py`, `apps/common/errors.py`, `tests/test_limits.py` (nuevo).
- Máximos: `price ≤ 9_999_999_999`, `area ≤ 99_999_999`, `rooms/baths/parking ≤ 999`.
- Respaldo: capturar `decimal.InvalidOperation` y devolver `400 validation_error`.

**BE-06b (sábado, después de BE-04), puede editar:** `persistence/catalog.py` (solo `update` y `delete`), `apps/properties/{views,interfaces}.py`.
- La comprobación "es mi borrador" se hace **dentro de la misma transacción, con la fila bloqueada** (`select_for_update`), no antes.

**Hecho cuando:**
- Probado el valor máximo permitido y el primero que lo supera, en POST, PUT y PATCH: el segundo devuelve 400 y no modifica el registro.
- Prueba de la carrera: si el borrador se publica antes de la escritura del Empleado, la escritura recibe 403.

**Verificación:** `manage.py test tests --settings=config.test_settings`.

---

### BE-07. Endpoint de Historial y exportación
**P0 · M · 3 h · Juan · Depende de BE-00 · Sáb 24 (mañana, para conectar con FE-03 a mediodía)**

**Objetivo:** poder leer lo que hoy solo se escribe (§1.4). Permiso `audit.read`; exportar exige `audit.export`.

**Leer primero:** `persistence/models/audit.py` (`HistorialActividad`: `usuario`, `accion`, `modulo`, `id_registro`, `nombre_registro`, `descripcion`, `fecha`); `persistence/support.py` (`audit`, `page_of`); `apps/common/pagination.py`; el contrato en `PLAN-MAESTRO.md §6.2`.

**Puede editar:** `apps/audit/*`, `persistence/audit.py` (nuevo), `config/bindings.py` (solo la línea de registro, avisando a Henry), `tests/test_audit_api.py` (nuevo).

**Qué hacer:**
- `AuditRepository.list(filters, page, page_size)` con `select_related("usuario")`, filtros `user_id`, `module`, `action`, `date_from`, `date_to` (en la zona horaria `America/Guatemala`), búsqueda `q` sobre nombre del registro y descripción; orden por `-fecha`.
- `GET /admin/audit/` paginado (máximo 100 por página).
- `GET /admin/audit/export/`: CSV en streaming con los mismos filtros, tope de 10 000 filas. **Neutralizar inyección de fórmulas**: toda celda que empiece por `=`, `+`, `-` o `@` se antepone con una comilla simple.
- No devolver el correo ni datos sensibles del usuario; solo `id` y `name`.

**Hecho cuando:**
- Filtros combinables, paginación y orden probados.
- Sin `audit.read` → 403; con `audit.read` pero sin `audit.export`, el listado funciona y la exportación da 403.
- Prueba del CSV con una celda `=CMD()` que sale neutralizada.

**Verificación:** `manage.py test tests --settings=config.test_settings`.

---

### BE-08. Editar usuarios y cambiar rol
**P0 · M · 3 h · Pablo · Depende de BE-00 · Vie 23**

**Objetivo:** que la pantalla de usuarios pueda editar y reasignar roles (hoy solo se listan y crean).

**Leer primero:** `persistence/users.py`; `apps/accounts/user_views.py`, `user_serializers.py`; `docs/usuarios-api.md`; `tests/test_users_api.py`.

**Puede editar:** esos archivos, `apps/accounts/interfaces.py` (`UserRepository`), `tests/test_users_api.py`.

**Contrato:** `PATCH /admin/users/{id}/` (`name?`, `active?`) y `PUT /admin/users/{id}/role/` (`role_id`). Permiso `users.manage`.

**Reglas (todas con prueba):**
1. No se puede **desactivar ni quitar el rol** al último Ingeniero activo.
2. Nadie puede cambiar **su propio rol ni desactivarse** (evita auto-bloqueo).
3. No se puede asignar un rol que tenga permisos que quien lo asigna **no posee**, salvo `admin.all` (anti-escalada de privilegios; hoy se cuida solo al crear).
4. El rol de destino debe estar **activo**.
5. `PUT …/role/` reemplaza el rol del usuario por el indicado (un usuario, un rol en este panel). Documentarlo.
6. Cada cambio queda en el historial (`EDITAR` y `ROL`, con el nombre del rol anterior y el nuevo en la descripción).

**Hecho cuando:** pruebas de las 6 reglas y de los códigos de error (400 con detalle por campo, 403, 404).

**Verificación:** `manage.py test tests --settings=config.test_settings`.

---

### BE-09. Notificador de consultas por correo (el "disparador")
**P0 · D · 3 h · Juan · Depende de nada · Sáb 24**

**Objetivo:** al recibir un contacto o una solicitud de visita, avisar por correo a la empresa (DEC-06). `apps/inquiries/interfaces.py` ya lo recomendaba y `docs/integracion-backend-frontend.md` confirma que no existe.

**Leer primero:** `apps/inquiries/{interfaces,views}.py`; `persistence/inquiries.py` (`create_contact`, `create_visit`); `config/settings.py`; `config/bindings.py`.

**Puede editar:** `apps/inquiries/notifiers.py` (nuevo), `persistence/notifiers.py` (nuevo), `persistence/inquiries.py`, `backend/.env.example`, `tests/test_inquiry_notifier.py` (nuevo). Para `config/settings.py` y `config/bindings.py`: **solo el bloque de correo y una línea de registro, avisando a Henry**.

**Diseño:**
- `InquiryNotifier` (interfaz) con `notify_created(inquiry: dict)`, registrada en `bindings.py` igual que los demás repositorios.
- `EmailInquiryNotifier` con `django.core.mail`.
- Variables de entorno (en `.env.example` **con valores vacíos o de ejemplo, nunca reales**): `INQUIRY_NOTIFY_EMAILS` (lista separada por comas), `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `DEFAULT_FROM_EMAIL`, `EMAIL_TIMEOUT` (por defecto 5 s), `FRONTEND_BASE_URL`.
- Por defecto en desarrollo el backend de correo es el de consola; sin destinatarios, no hace nada y lo registra.
- Se invoca con `transaction.on_commit(...)`, dentro de `try/except` que **registra el fallo sin romper la respuesta 201**.
- El correo incluye tipo (contacto o visita), nombre, teléfono, correo, asunto, mensaje, propiedad y fecha preferida (si aplica), y el enlace a `/admin/mensajes`.

**Seguridad:**
- Quitar saltos de línea del asunto y de cualquier dato que vaya a una cabecera (inyección de cabeceras).
- No escribir datos personales en los logs, solo el id de la consulta.
- El límite de 10 por hora por IP de `/inquiries/*` ya existente se mantiene.

**Hecho cuando:**
- Prueba con `locmem`: una consulta de contacto y una de visita generan un correo cada una; sin destinatarios, ninguno.
- Prueba con un backend de correo que lanza excepción: la API sigue respondiendo 201.
- Prueba de inyección: un nombre con `\r\nBcc: x@y.z` no altera las cabeceras.
- Para probar con un SMTP real hay que recibir las credenciales **por un canal seguro del equipo** y ponerlas solo en `backend/.env` (ignorado por git).

**Verificación:** `manage.py test tests --settings=config.test_settings`.

---

### BE-10. Validar el esquema contra Supabase real
**P0 · Q · 1.5 h · Juan · Sin dependencias · Vie 23, lo primero**

**Objetivo:** salir hoy de la incertidumbre más grande: todo lo probado hasta ahora fue SQLite (§3.2, riesgos del maestro).

**Leer primero:** `docs/integracion-backend-frontend.md` (sección 1), `persistence/db_diagnostics.py`, `persistence/management/commands/check_database.py`.

**Qué hacer** (desde una máquina con acceso de red a Supabase y `DATABASE_URL` en `backend/.env`, que no se versiona):
1. `python manage.py check_database`: consulta solo metadatos, en transacción de solo lectura.
2. Comparar con los modelos: 20 tablas y 166 columnas; tipos y longitudes de `propiedad`, `proyecto`, `historial_actividad`, `contenido_pagina`, `mensaje_contacto`.
3. Confirmar que existen los roles Ingeniero, Arquitecta y Empleado y sus permisos.
4. **No ejecutar** migraciones ni `makemigrations`; **no ejecutar el seed** en la base real sin acordarlo con el equipo.

**Hecho cuando:** un informe corto en `docs/` con "coincide" o la lista de diferencias, **sin DSN, contraseñas ni datos personales**. Si hay diferencias que afecten a otras fichas, avisar al equipo el mismo viernes.

---

### BE-11. Documentación: RBAC, arquitectura y ADR
**P0 · Q · 2 h · Henry · Depende de BE-02 y BE-05 · Dom 25**

**Puede editar:** `docs/RBAC.md`, `docs/arquitectura.md`, `docs/adr/0001-rbac-por-datos.md` (nuevos), `docs/README.md` (índice).

**Contenido mínimo:**
- **`RBAC.md`:** los 32 permisos y su significado; roles predeterminados y qué hace el seed (`--add-missing`, `--sync`); cómo agregar un permiso; las reglas de seguridad de usuarios y roles; la tabla rol × endpoint de BE-02.
- **`arquitectura.md`:** interfaces + registro + `bindings.py`; la fábrica de publicaciones con diagrama; cómo agregar un tipo nuevo, paso a paso (el ejemplo "terrenos" de la prueba).
- **ADR 0001:** por qué los roles viven en la base de datos y la fábrica solo se usa para publicaciones (auditoría §2.2). Útil para el compañero que dudaba y para el ingeniero.

---

### BE-12. Documentación: auditoría y papelera
**P0 · Q · 1.5 h · Juan · Depende de BE-04 y BE-07 · Dom 25**

**Puede editar:** `docs/auditoria.md`, `docs/papelera.md` (nuevos), `docs/README.md` (solo su línea).

**Contenido mínimo:**
- **`auditoria.md`:** qué se registra y en qué módulos, formato de `historial_actividad`, filtros, exportación y su protección contra fórmulas, límites conocidos (sin valores antes/después, ver BE-19).
- **`papelera.md`:** estados de una publicación (borrador, publicada, en papelera, eliminada), quién puede cada transición según los permisos, cómo se guarda hoy y por qué, y la ruta futura con columnas nativas (BE-20).

---

### BE-13. Documentación: API de usuarios
**P0 · Q · 0.5 h · Pablo · Depende de BE-08 · Dom 25**

**Estado (25-oct):** completada en `backend-dev`. `docs/usuarios-api.md`
contrastada con vistas, serializers, repositorio y pruebas: permisos vigentes
por endpoint tras BE-02, PATCH, PUT, seis reglas de BE-08, errores y auditoría.
Documentado el guardado parcial entre solicitudes independientes de FE-14.
Verificación: 189 pruebas backend aprobadas con `config.test_settings`,
`manage.py check` sin problemas y cuatro ejemplos JSON válidos. Sin cambios
de código ni de OpenAPI; la prueba local no acredita Supabase.

**Puede editar:** `docs/usuarios-api.md` (agregar `PATCH`, `PUT …/role/`, las 6 reglas y los errores).

---

## 3. Backlog posterior a la entrega (26–27 de octubre y después)

Se priorizan en este orden. Todas siguen el formato de ficha de `PLAN-MAESTRO.md §10.3` cuando se vayan a ejecutar.

| ID | Tarea | Resp. sugerido | Origen | Nota |
|---|---|---|---|---|
| BE-14 | Endurecer producción: exigir `DJANGO_SECRET_KEY` real cuando `DEBUG=false`, HTTPS, cabeceras, CORS | Henry | Auditoría §3.2 | Hoy el valor por defecto es inseguro y el JWT se firma con él |
| BE-15 | Cambiar la propia contraseña y restablecerla por un administrador | Pablo | Auditoría §3.2 | Complementa BE-08 |
| BE-16 | Rechazar el borrado de medios en uso (`409 media_in_use`) | Juan | ADM-01 | Ya reproducido |
| BE-17 | Implementar `ServiceRepository` y `SearchRepository` (hoy 501) | Pablo | Auditoría §3.1 | O decidir que siguen con contenido de referencia |
| BE-18 | Almacenamiento persistente de imágenes y limpieza de huérfanos | Henry + Juan | DEC-09 | Bloquea producción, no la demo |
| BE-19 | Auditoría con valores antes/después, IP y eventos de login | Juan | Auditoría §3.2 | Requiere ampliar la tabla o guardar JSON |
| BE-20 | Columnas nativas de papelera y uso de `estado_limpieza` | Juan | DEC-05 | Requiere aprobación sobre Supabase |
| BE-21 | Notificación por WhatsApp de consultas | Juan | DEC-06 | Requiere credenciales del proveedor |
| BE-22 | Filtro `published=true/false` en `GET /properties/` (y `/projects/`) para usuarios con permiso | Pablo | Plan FE-11 | **P1.** Hoy el filtro por estado se hace en el cliente sobre la página cargada. Tocar `catalog.py` solo después de BE-04/BE-06b |

---

## 4. Comprobación de cierre del backend (domingo)

Antes de INT-02, quien integre confirma:

- [ ] `manage.py check` sin problemas.
- [ ] `manage.py test tests --settings=config.test_settings` en verde (hoy: 57; deben ser más).
- [ ] `docs/openapi.yaml` regenerado con `--validate --fail-on-warn` y sin diferencias inesperadas.
- [ ] Matriz rol × endpoint de BE-02 pasando.
- [ ] Sin `.env`, claves ni DSN en el diff (`git diff --cached`).
- [ ] BE-10 con su informe y sin diferencias de esquema pendientes.
- [ ] Los hallazgos de `INT-04` (pruebas por rol) asignados o resueltos.
