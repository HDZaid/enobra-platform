# EnObra · Backend (contratos de la API)

Backend en **Django + Django REST Framework** para el sitio de **EnObra** (constructora y bienes raíces,
Quetzaltenango, Guatemala). Está basado en el mockup `MockUp---enObra` (HTML/CSS/JS puro con datos locales)
y define **únicamente los contratos**: endpoints, serializers (entrada/salida/validaciones), permisos,
errores e **interfaces de persistencia**.

> **Estado actual**
> - ✅ Contratos HTTP (rutas, métodos, parámetros, validaciones, códigos de estado, permisos).
> - ✅ Interfaces abstractas de datos (`interfaces.py` en cada app) donde se acoplará la base de datos.
> - ✅ Esquema OpenAPI generado: [`docs/openapi.yaml`](../docs/openapi.yaml), compartido desde la raíz del repositorio.
> - ❌ **Sin base de datos**: no hay modelos, migraciones ni `DATABASES`. La BD se acopla después.
> - ✅ **Frontend separado**: la base React está en [`../frontend/`](../frontend/README.md) y consume este contrato; sus pantallas todavía son provisionales.
>
> Mientras una interfaz no tenga implementación registrada, su endpoint responde `501 not_implemented`.

---

## Requisitos y arranque

- Python 3.12+

Desde la raíz del repositorio, entra primero a `backend/`. Los comandos siguientes usan
PowerShell y el Python del entorno local, sin necesidad de activarlo:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env          # solo la primera vez; ajusta los valores
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py runserver
```

En macOS/Linux usa `.venv/bin/python` y `cp`. Los settings cargan `backend/.env`
independientemente del directorio actual, sin sobrescribir variables del sistema.
En los ejemplos posteriores, `python` se refiere al intérprete de este entorno.

- Documentación interactiva (Swagger): <http://localhost:8000/api/docs/>
- Esquema OpenAPI en vivo: <http://localhost:8000/api/schema/>
- Regenerar el archivo del contrato desde `backend/`: `python manage.py spectacular --file ../docs/openapi.yaml --validate`
- Salud del servicio: `GET /api/v1/health/`

> No se ejecutan `migrate` ni `createsuperuser`: no hay base de datos ni `django.contrib.auth`/admin.

---

## Arquitectura: contrato → interfaz → implementación

```
Request ─► View (valida con Serializer) ─► resolve(Interface) ─► Implementación (BD, futura)
                                                  ▲
                                   config/bindings.py  (único punto de acople)
```

| Capa | Dónde | Qué hace |
| --- | --- | --- |
| Contrato HTTP | `apps/<app>/serializers.py`, `views.py`, `urls.py` | Forma de las peticiones/respuestas, validaciones, permisos y códigos. |
| Contrato de datos | `apps/<app>/interfaces.py` | Clases abstractas (`ABC`) que la capa de persistencia debe cumplir. |
| Registro | `apps/common/registry.py` | `register(Interfaz, implementación)` / `resolve(Interfaz)`. |
| Acople | `config/bindings.py` | Aquí se registran las implementaciones concretas. |

Las implementaciones devuelven `dict` (o cualquier objeto con los atributos del serializer de salida).

```
backend/
├── config/                  # settings, urls, bindings (punto de acople)
├── apps/
│   ├── common/              # enums, errores, permisos, paginación, campos de validación, registro
│   ├── accounts/            # login / refresh / logout / me  (AuthService)
│   ├── company/             # contacto y marca + textos de "Nosotros"
│   ├── services/            # Diseño, Administración, Preconstrucción, Construcción
│   ├── projects/            # portafolio (filtro por año)
│   ├── properties/          # bienes raíces (filtros, orden, facets)
│   ├── news/                # noticias y eventos
│   ├── inquiries/           # formularios de contacto y visita + bandeja admin
│   ├── search/              # buscador global
│   └── media/               # subida de imágenes (panel)
├── .env.example
├── manage.py
├── requirements.txt
└── README.md
```

El contrato OpenAPI está en `../docs/openapi.yaml` y las reglas de Git en `../.gitignore`.

---

## Convenciones del contrato

- **Base:** `/api/v1/` · JSON (`application/json`), salvo la subida de imágenes (`multipart/form-data`).
- **Auth:** `Authorization: Bearer <access_token>`. Lectura pública; escritura solo rol `admin`.
- **Contenido publicado:** el público solo ve `published=true`; con token admin se ven también borradores.
- **Paginación** (`?page=1&page_size=12`, máx. 100):
  ```json
  { "count": 42, "page": 1, "page_size": 12, "results": [ ... ] }
  ```
- **Errores** (uniformes):
  ```json
  { "error": { "code": "validation_error", "message": "...", "details": { "phone": ["..."] } } }
  ```
  Códigos: `validation_error` (400), `not_authenticated` (401), `permission_denied` (403), `not_found` (404),
  `throttled` (429), `not_implemented` (501, capa de datos aún no acoplada).
- **IDs:** propiedades → entero; proyectos, noticias y servicios → *slug* de texto (como en el mockup).
- **Imágenes:** URL HTTPS o ruta `/media/…` devuelta por `POST /admin/media/`. Se **rechazan** imágenes en base64
  (el mockup las guardaba así en `localStorage`; en producción se suben como archivo).
- **Video:** solo referencia (URL HTTPS o `/media/…`) a `.mp4`/`.webm`; no se sube por la API.
- **Límite de imagen:** `MEDIA_MAX_UPLOAD_BYTES` (10 MB por defecto; el mockup limitaba a 2 MB por el `localStorage`).
- **Rate limit:** login `5/min`; formularios públicos `10/hora` por IP.

---

## Endpoints

Prefijo `/api/v1`. 🔓 = público · 🔒 = requiere token admin.

### Sistema y autenticación
| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| GET | `/health/` | 🔓 | Estado del servicio. |
| POST | `/auth/login/` | 🔓 | `{email, password}` → `{access, refresh, expires_in, user}`. |
| POST | `/auth/refresh/` | 🔓 | `{refresh}` → `{access, expires_in}`. |
| POST | `/auth/logout/` | 🔓 | `{refresh}` → `204` (revoca el refresh). |
| GET | `/auth/me/` | 🔒 | Usuario autenticado. |

### Empresa
| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| GET / PUT | `/company/` | 🔓 / 🔒 | Contacto y marca: nombre, responsable, dirección, teléfonos, WhatsApp, correo, redes, dominio, logo. |
| GET / PUT | `/institution/` | 🔓 / 🔒 | "Nosotros": presentación, firma, cargo, visión, misión, principios. |

### Servicios (solo lectura)
| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| GET | `/services/` | 🔓 | Los 4 servicios con sus alcances. |
| GET | `/services/{id}/` | 🔓 | Detalle (`diseno`, `administracion`, `preconstruccion`, `construccion`). |

### Proyectos
| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| GET | `/projects/?year=2026` | 🔓 | Portafolio paginado, filtro por año. |
| GET | `/projects/years/` | 🔓 | Años disponibles (llena el `<select>` de año). |
| GET | `/projects/{id}/` | 🔓 | Ficha con fotos, renders y video opcional. |
| POST | `/projects/` | 🔒 | Crear. |
| PUT / PATCH | `/projects/{id}/` | 🔒 | Reemplazar / editar parcialmente. |
| DELETE | `/projects/{id}/` | 🔒 | Eliminar. |

### Bienes raíces
| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| GET | `/properties/` | 🔓 | Catálogo con filtros combinables (ver abajo). |
| GET | `/properties/facets/` | 🔓 | Operaciones, tipos, zonas y rango de precio para poblar los filtros. |
| GET | `/properties/{id}/` | 🔓 | Ficha comercial completa. |
| POST | `/properties/` | 🔒 | Crear. |
| PUT / PATCH | `/properties/{id}/` | 🔒 | Reemplazar / editar parcialmente. |
| DELETE | `/properties/{id}/` | 🔒 | Eliminar. |

Filtros de `GET /properties/` (equivalen a los del mockup):

| Parámetro | Valores | Notas |
| --- | --- | --- |
| `operation` | `Venta` · `Alquiler` | |
| `type` | `Casa` · `Apartamento` · `Terreno` · `Local` | |
| `zone` | texto (ej. `Zona 9`) | Valores desde `/properties/facets/`. |
| `min_price`, `max_price` | entero (Q) | `min_price ≤ max_price`. |
| `q` | texto | Sin distinguir mayúsculas/tildes sobre título, zona, ubicación y tipo. |
| `ids` | `1,4,5` | Vista **Favoritos**: el front guarda los ids (localStorage) y los envía aquí. |
| `sort` | `recent` (def.) · `price_asc` · `price_desc` | `recent` ordena por `date` descendente. |
| `page`, `page_size` | enteros | |

### Noticias y eventos
| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| GET | `/news/?category=Eventos` | 🔓 | Listado (`Anuncios` · `Eventos` · `Proyectos`), más recientes primero. |
| GET | `/news/{id}/` | 🔓 | Publicación completa. |
| POST | `/news/` | 🔒 | Crear. |
| PUT / PATCH | `/news/{id}/` | 🔒 | Reemplazar / editar parcialmente. |
| DELETE | `/news/{id}/` | 🔒 | Eliminar. |

### Solicitudes (formularios)
| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| POST | `/inquiries/contact/` | 🔓 | Formulario de Contacto / "Solicitar información" → `201 {id, status, created_at}`. |
| POST | `/inquiries/visits/` | 🔓 | "Solicitar visita" de una propiedad → `201`; `404` si la propiedad no existe. |
| GET | `/inquiries/?kind=&status=` | 🔒 | Bandeja de solicitudes (paginada). |
| GET | `/inquiries/{id}/` | 🔒 | Detalle. |
| PATCH | `/inquiries/{id}/` | 🔒 | Cambiar estado: `nuevo` → `atendido` → `archivado`. |

Validaciones (replican `validate()` de `main.js` y se refuerzan en servidor):
nombre, correo y mensaje obligatorios · teléfono de Guatemala de **8 dígitos** (acepta espacios y guiones; se
normaliza) · fecha de visita **hoy o futura** · campo honeypot `website` (debe ir vacío) contra spam.

### Búsqueda y medios
| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| GET | `/search/?q=diseño&limit=5` | 🔓 | Buscador global: `{query, total, services[], projects[], properties[], news[]}`. `q` ≥ 2 caracteres. |
| POST | `/admin/media/` | 🔒 | Sube imagen (`file`, `kind`: `photo`·`render`·`news`·`logo`) → `{id, url, ...}`. JPEG/PNG/WebP/GIF. |
| GET / DELETE | `/admin/media/{id}/` | 🔒 | Metadatos / eliminar. |

---

## Del mockup al backend

| En el mockup | En el backend |
| --- | --- |
| `data.js` + `store.js` (`localStorage`) | Interfaces de repositorio + BD compartida (a acoplar). |
| Panel `admin.html` con "perfiles de demostración" (sin contraseña) | `/auth/*` con **dos cuentas reales** (Ing. Bernardo y la Arquitecta) y autorización en servidor. |
| Alta/edición/baja de proyectos, propiedades y noticias | CRUD protegido por rol admin. |
| Fotos en base64 dentro de `localStorage`/`data.js` | `POST /admin/media/` + URLs. |
| Exportar/importar respaldo JSON y `data.js` | Ya no aplica: la BD es la fuente de verdad (los respaldos son de base de datos). |
| Formularios con "envío simulado" (`CONECTAR API REAL AQUÍ`) | `POST /inquiries/contact/` y `/inquiries/visits/`. |
| Favoritos en `localStorage` | Siguen en el cliente; se consultan con `?ids=`. |
| Filtros en la URL (`?operation=…&sort=…`) | Mismos filtros como query params de `GET /properties/`. |
| Marca `demo: true` en contenido de ejemplo | Campo `demo` conservado en proyectos, propiedades y noticias. |

---

## Cómo acoplar la base de datos (siguiente fase)

1. Elegir motor (p. ej. PostgreSQL) y configurar `DATABASES` en `config/settings.py` (variable `DATABASE_URL`).
2. Crear los modelos y migraciones en un paquete de persistencia (por ejemplo `persistence/`), **sin modificar** serializers ni vistas.
3. Implementar cada interfaz de `apps/*/interfaces.py`:
   `AuthService`, `CompanyRepository`, `InstitutionRepository`, `ServiceRepository`, `ProjectRepository`,
   `PropertyRepository`, `NewsRepository`, `InquiryRepository`, `SearchRepository`, `MediaStorage`.
4. Registrarlas en `config/bindings.py`:
   ```python
   def register_repositories(register):
       register(PropertyRepository, DjangoPropertyRepository())
   ```
5. Añadir `django.contrib.auth`/`contenttypes` solo si la implementación de `AuthService` los necesita
   (contraseñas con Argon2/PBKDF2; JWT de acceso corto + refresh revocable).
6. Si algo del contrato debe cambiar, hacerlo en serializers/interfaces y regenerar `../docs/openapi.yaml`.

Responsabilidades que le tocan a la capa de datos: generar `id` (slug único para proyectos/noticias),
rellenar `created_at`/`updated_at`/`updated_by`, aplicar el filtro `published` según `include_unpublished`,
búsqueda sin tildes, y notificar a la empresa (correo/WhatsApp) cuando llegue una solicitud.

---

## Pendientes del cliente (heredados del mockup)

Logo oficial · correo institucional · URLs de Instagram/Facebook · dominio definitivo · nombre y correo de la
arquitecta (cuenta real) · confirmación de teléfonos/dirección · contenido real de proyectos, propiedades y noticias.
Los campos correspondientes ya existen en el contrato y aceptan vacío (`email`, `instagram`, `facebook`, `domain`, `logo`).

## Seguridad (a respetar al implementar)

- Secretos solo en variables de entorno (`.env` está en `.gitignore`); nunca en código ni en el frontend.
- HTTPS en producción, `DJANGO_DEBUG=false`, `ALLOWED_HOSTS` y `CORS_ALLOWED_ORIGINS` restringidos.
- Autorización siempre en servidor (el rol viene del token verificado, no del cliente).
- Validar tipo real y tamaño de imágenes en `MediaStorage`; no ejecutar ni servir archivos subidos como código.
- Escapar/sanitizar el texto al renderizar en React (los campos son texto plano, no HTML).
