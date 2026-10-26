# EnObra · Backend

API en **Django 5.2 + Django REST Framework** para el sitio y el panel de EnObra. Usa las
tablas existentes de **PostgreSQL en Supabase** mediante Django ORM y modelos
`managed=False`. Nació del mockup `MockUp---enObra` (HTML/JS con datos en `localStorage`)
y conserva sus contratos.

Estado, pruebas y pendientes vigentes: [../docs/estado-proyecto.md](../docs/estado-proyecto.md).

## Arranque

Python **3.13** (3.12+ funciona). Comandos en PowerShell con el Python del entorno, sin
activarlo; en macOS/Linux usa `.venv/bin/python` y `cp`.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env          # solo la primera vez; completa DATABASE_URL
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py runserver
```

- Swagger: <http://localhost:8000/api/docs/> · Esquema en vivo: <http://localhost:8000/api/schema/>
- Salud: `GET /api/v1/health/`
- Los settings cargan `backend/.env` sin sobrescribir variables del sistema.

> **No ejecutar `makemigrations`/`migrate`** para las tablas de negocio: ya existen en
> Supabase. Tampoco se usa `createsuperuser`: las cuentas viven en la tabla `usuario`.

## Comandos

| Comando | Qué hace |
|---|---|
| `python manage.py test tests --settings=config.test_settings` | Pruebas con SQLite y archivos temporales; rechaza cualquier otra base. **No toca Supabase.** |
| `python manage.py spectacular --file ../docs/openapi.yaml --validate` | Regenera el contrato. Se hace al cambiar serializers o vistas. |
| `python manage.py seed_access_control [--add-missing \| --sync]` | Crea permisos y roles que falten. No crea usuarios ni pisa roles editados (ver [RBAC](../docs/RBAC.md#seed-seed_access_control)). |
| `python manage.py check_database` | Comprueba tablas y columnas de Supabase en una transacción de **solo lectura**. No muestra la contraseña. |
| `python manage.py cleanup_admin_sessions` | Borra sesiones del panel ya vencidas (opcional, periódico). |
| `python scripts/matriz_roles.py <url-api> <salida.json>` | Matriz de pruebas por rol contra una API de desarrollo ([INT-04](../docs/INT-04-matriz-roles.md)). |
| `python scripts/verify_frontend_integration.py` | React contra Django real con base temporal ([frontend/README](../frontend/README.md#pruebas-de-navegador-opcionales)). |

## Arquitectura

```
Request ─► View (Serializer + ResourcePermission) ─► resolve(Interfaz) ─► Implementación ORM
                                                          ▲
                                           config/bindings.py (único punto de acople)
```

| Capa | Dónde |
|---|---|
| Contrato HTTP | `apps/<app>/serializers.py`, `views.py`, `urls.py` |
| Contrato de datos | `apps/<app>/interfaces.py` (clases abstractas) |
| Implementaciones | `persistence/` (ORM, almacenamiento de imágenes, notificaciones) |
| Acople | `config/bindings.py`: registra implementaciones y la fábrica de publicaciones |
| Permisos | `apps/common/rbac.py` (catálogo) y `apps/common/permissions.py` (`ResourcePermission`) |

Detalle, fábrica de publicaciones y cómo agregar un tipo: [../docs/arquitectura.md](../docs/arquitectura.md).
Cómo se guardan los datos del panel sin migraciones: [../docs/admin-backend.md](../docs/admin-backend.md).

```
backend/
├── apps/
│   ├── accounts/      # login, refresh, logout, me; roles y usuarios
│   ├── audit/         # historial y exportación CSV
│   ├── common/        # RBAC, errores, paginación, registro, salud
│   ├── company/       # empresa y textos de "Nosotros"
│   ├── inquiries/     # contacto, visitas y bandeja
│   ├── media/         # subida de imágenes
│   ├── news/ projects/ properties/
│   ├── publications/  # fábrica de publicaciones y papelera unificada
│   ├── search/        # buscador global (pendiente, 501)
│   └── services/      # servicios de construcción (pendiente, 501)
├── persistence/       # repositorios ORM, models/ (managed=False), media*, notifiers
├── config/            # settings, urls, bindings, test_settings
├── scripts/
└── tests/
```

## Convenciones del contrato

- **Base:** `/api/v1/`. JSON, salvo la subida de imágenes (`multipart/form-data`).
- **Autenticación:** `Authorization: Bearer <access>`. El acceso dura 15 minutos; el refresh,
  7 días y es revocable (`/auth/logout/`).
- **Permisos:** cada vista declara qué permiso exige por método; nunca pregunta por el nombre
  del rol. 401 sin token o vencido, 403 sin permiso. Matriz completa en [RBAC](../docs/RBAC.md#matriz-rol--endpoint).
- **Publicado/borrador:** el público solo ve `published=true`; con permiso de edición se ven
  borradores (con `edit.own`, solo los propios).
- **Paginación** (`?page=1&page_size=12`, máximo 100): `{count, page, page_size, results}`.
- **Errores:** `{"error": {"code", "message", "details"}}`. Códigos `validation_error` (400),
  `not_authenticated` (401), `permission_denied` (403), `not_found` (404), `throttled` (429),
  `not_implemented` (501).
- **IDs:** propiedades → entero; proyectos, noticias y servicios → slug.
- **Imágenes:** URL devuelta por `POST /admin/media/`; se rechaza base64. JPEG/PNG/WebP/GIF,
  hasta `MEDIA_MAX_UPLOAD_BYTES` (10 MB). Se valida el contenido real con Pillow.
- **Video:** solo enlaces HTTPS de YouTube.
- **Límites:** login `5/min` por IP; formularios públicos `10/hora` por IP.

## Endpoints

Prefijo `/api/v1`. 🔓 público · 🔒 con token y el permiso indicado.

| Área | Rutas | Acceso |
|---|---|---|
| Sistema | `GET health/` | 🔓 |
| Sesión | `POST auth/login/`, `auth/refresh/`, `auth/logout/` · `GET auth/me/` (roles y permisos efectivos) | 🔓 / 🔒 |
| Empresa | `GET/PUT company/`, `GET/PUT institution/` | 🔓 / `company.edit` |
| Servicios | `GET services/`, `services/{slug}/` | 🔓 (501 por ahora) |
| Búsqueda | `GET search/?q=` | 🔓 (501 por ahora) |
| Proyectos | `GET projects/?year=`, `projects/years/`, `projects/{slug}/` · `POST` · `PUT/PATCH` · `DELETE` (a papelera) | 🔓 / `projects.*` |
| Bienes raíces | `GET properties/`, `properties/facets/`, `properties/{id}/` · `POST` · `PUT/PATCH` · `DELETE` (a papelera) | 🔓 / `properties.*` |
| Noticias | `GET news/?category=`, `news/{slug}/` · `POST` · `PUT/PATCH` · `DELETE` (definitivo) | 🔓 / `news.*` |
| Papelera | `GET admin/trash/?type=properties\|projects` · `POST admin/{properties\|projects}/{id}/restore/` · `DELETE admin/{properties\|projects}/{id}/permanent/` | `*.trash.*`, `*.restore`, `*.delete_permanently` |
| Solicitudes | `POST inquiries/contact/`, `inquiries/visits/` · `GET inquiries/`, `inquiries/{id}/` · `PATCH inquiries/{id}/` | 🔓 / `inquiries.read`, `inquiries.manage` |
| Imágenes | `POST admin/media/` · `GET/DELETE admin/media/{id}/` | `media.upload` / `media.delete` |
| Historial | `GET admin/audit/` · `GET admin/audit/export/` (CSV) | `audit.read` / `audit.export` |
| Roles | `GET admin/permissions/` · `GET/POST admin/roles/` · `GET/PATCH admin/roles/{id}/` | `roles.read` / `roles.manage` |
| Usuarios | `GET/POST admin/users/` · `GET admin/users/roles/` · `PATCH admin/users/{id}/` · `PUT admin/users/{id}/role/` | `users.read` / `users.manage` |

Nadie puede otorgar permisos que no posee: ni al crear una cuenta, ni al asignar un rol, ni al
editar un rol (salvo `admin.all`). Detalle en [RBAC](../docs/RBAC.md#reglas-de-seguridad-de-usuarios-y-roles)
y [usuarios-api.md](../docs/usuarios-api.md).

### Filtros de `GET properties/`

| Parámetro | Valores |
|---|---|
| `operation` | `Venta` · `Alquiler` |
| `type` | `Casa` · `Apartamento` · `Terreno` · `Local` |
| `zone` | texto (valores en `properties/facets/`) |
| `min_price`, `max_price` | entero en quetzales, `min ≤ max` |
| `q` | texto sin distinguir mayúsculas ni tildes (título, zona, ubicación, tipo) |
| `ids` | `1,4,5`: favoritos guardados en el navegador |
| `sort` | `recent` (por defecto) · `price_asc` · `price_desc` |

### Validación de formularios públicos

Nombre, correo y mensaje obligatorios; teléfono de Guatemala de 8 dígitos (acepta espacios y
guiones); fecha de visita hoy o futura; campo trampa `website` vacío. Cada consulta recibida
se notifica por correo a `INQUIRY_NOTIFY_EMAILS` (SMTP en desarrollo, Resend en producción).

## Variables de entorno

Lista comentada en `.env.example`. Las principales:

| Variable | Desarrollo | Producción |
|---|---|---|
| `DJANGO_SECRET_KEY` / `DJANGO_DEBUG` | valor de ejemplo / `true` | propia de 32+ caracteres / `false` (si no, no arranca) |
| `DATABASE_URL` | Supabase o copia de desarrollo | *transaction pooler* de Supabase con `DATABASE_POOLER_MODE=transaction` |
| `MEDIA_STORAGE_BACKEND` | `local` (disco en `backend/media/`) | `cloudinary` con `CLOUDINARY_URL` (o `r2` en su rama) |
| `INQUIRY_NOTIFIER` | `email` (consola o SMTP) | `resend` con `RESEND_API_KEY` |
| `CORS_ALLOWED_ORIGINS`, `DJANGO_ALLOWED_HOSTS`, `FRONTEND_BASE_URL` | localhost | dominio real |

Despliegue en Render: [../docs/despliegue.md](../docs/despliegue.md) y `../render.yaml`.

## Del mockup al backend

| En el mockup | Aquí |
|---|---|
| `data.js` + `localStorage` | Base de datos de Supabase vía ORM |
| Perfiles de demostración sin contraseña | JWT con permisos calculados desde los roles activos |
| Fotos en base64 | `POST admin/media/` y URLs |
| Respaldo JSON exportable | Respaldo de la base de datos |
| Envío simulado de formularios | `POST inquiries/contact/` y `inquiries/visits/` con aviso por correo |
| Favoritos y filtros en la URL | Siguen en el cliente; se consultan con `?ids=` y los mismos parámetros |
| Marca `demo: true` | Campo `demo` en proyectos, propiedades y noticias |

## Pendientes del cliente

Logo oficial, correo institucional, URLs de redes sociales, datos y cuentas reales de cada rol,
confirmación de teléfonos y dirección, y contenido real de proyectos, propiedades y noticias.

## Seguridad

- Secretos solo en variables de entorno (`.env` está en `.gitignore`).
- En producción: HTTPS, `DJANGO_DEBUG=false`, hosts y CORS restringidos al dominio real.
  Con `DEBUG=false`, `settings.py` exige una clave propia y activa la redirección a HTTPS.
- La autorización siempre ocurre en el servidor con los permisos del token verificado.
- Las imágenes se validan por contenido y tamaño; los nombres de archivo los genera el servidor.
- Los textos son planos: React los muestra escapados, nunca como HTML.
