# EnObra Platform

Sitio y panel administrativo de **Constructora EnObra** (Quetzaltenango, Guatemala).
Monorepo con dos aplicaciones independientes que se comunican por HTTP en `/api/v1/`:

- `backend/`: **Django 5.2 + Django REST Framework** sobre PostgreSQL en Supabase.
- `frontend/`: **React 18 + Vite**, sitio público y panel administrativo.

**Estado vigente** (pruebas, pendientes y responsables): [docs/estado-proyecto.md](docs/estado-proyecto.md).

## Qué hace

- **Sitio público:** Inicio, Nosotros, Servicios, Proyectos, Bienes Raíces (filtros y
  favoritos), Noticias y Contacto con solicitud de visita.
- **Panel administrativo:** Bienes Raíces y Proyectos (alta, edición, publicación,
  imágenes), Noticias, Mensajes, Papelera, Historial, Roles y Usuarios.
- **Roles por datos:** 32 permisos definidos en código; los roles (Ingeniero, Arquitecta,
  Empleado y los que se creen) se editan desde el panel sin desplegar. Ver
  [RBAC](docs/RBAC.md) y el [ADR 0001](docs/adr/0001-rbac-por-datos.md).
- **Aviso por correo** al recibir una consulta.

## Ramas

| Rama | Uso |
|---|---|
| `main` | Versiones estables. Recibe la entrega cuando se despliega. |
| `develop` | Integración revisada de ambos equipos. |
| `frontend-dev` | Leo, Geo y Jennifer (Pablo para el panel). |
| `backend-dev` | Juan, Pablo y Henry. |
| `despliegue/cloudinary` | Configuración de despliegue con imágenes en Cloudinary (incluye los últimos cierres de RBAC). |
| `despliegue/r2` | Variante con imágenes en Cloudflare R2, derivada de la anterior (en preparación). |

Reglas de trabajo, sincronización y commits: [docs/TRABAJO-EN-EQUIPO.md](docs/TRABAJO-EN-EQUIPO.md).

## Estructura

```text
enobra-platform/
├── backend/
│   ├── apps/          # Contrato HTTP por dominio: serializers, vistas, URLs e interfaces
│   │   ├── accounts/      # Autenticación, roles y usuarios
│   │   ├── audit/         # Historial y exportación CSV
│   │   ├── common/        # Permisos (RBAC), errores, paginación, registro
│   │   ├── company/       # Empresa y textos institucionales
│   │   ├── inquiries/     # Contacto, visitas y bandeja
│   │   ├── media/         # Subida de imágenes
│   │   ├── news/ projects/ properties/
│   │   ├── publications/  # Fábrica de publicaciones y papelera unificada
│   │   └── search/ services/  # Contratos pendientes (501)
│   ├── persistence/   # Implementaciones ORM, almacenamiento de imágenes y notificaciones
│   ├── config/        # settings, urls y bindings.py (único punto de acople)
│   ├── scripts/       # Matriz de roles y prueba de integración con el navegador
│   └── tests/
├── frontend/
│   ├── public/        # _redirects y _headers para Cloudflare Pages
│   ├── src/           # app/ (rutas), components/, features/, services/, styles/
│   └── tests/         # Pruebas con node --test y recorridos de navegador
├── docs/              # Documentación compartida y contrato OpenAPI
├── render.yaml        # Servicio de Render (rama de despliegue)
└── AGENTS.md          # Reglas para asistentes de IA que trabajan en el repositorio
```

## Desarrollo local

Requisitos: **Python 3.13** (3.12+ funciona) y **Node.js ≥ 20.19 o ≥ 22.12**. Dos terminales
desde la raíz del repositorio.

### Terminal 1: backend (PowerShell)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env          # solo la primera vez; completa DATABASE_URL
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py runserver
```

En macOS/Linux usa `.venv/bin/python` y `cp`. Sin `DATABASE_URL` el servidor arranca, pero
las rutas con datos fallan: la base es la de Supabase (o una copia de desarrollo).

### Terminal 2: frontend

```powershell
cd frontend
npm ci
npm run dev
```

- Frontend: <http://localhost:5173/> · Panel: <http://localhost:5173/admin/login>
- API: <http://127.0.0.1:8000/api/v1/health/> · Swagger: <http://127.0.0.1:8000/api/docs/>

Vite redirige `/api` y `/media` a Django durante el desarrollo.

## Configuración

- **Backend:** lee `backend/.env` (las variables del sistema tienen prioridad). Accede a las
  tablas existentes de Supabase solo con Django ORM y modelos `managed=False`: **no se
  ejecutan migraciones** sobre esas tablas.
- **Frontend:** `frontend/.env.local` con `VITE_API_BASE_URL`. Las variables `VITE_*` son
  públicas: nunca contienen secretos. React solo habla con la API de Django.
- **Secretos:** solo en variables de entorno o en el panel de cada plataforma. Nunca en el
  repositorio.

## Verificación antes de publicar

```powershell
# backend/
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py test tests --settings=config.test_settings
.\.venv\Scripts\python.exe manage.py spectacular --file ../docs/openapi.yaml --validate   # si cambió el contrato

# frontend/
npm run lint
npm test
npm run build
```

Las pruebas usan SQLite y archivos temporales; **ninguna toca Supabase**.

## Despliegue

Cloudflare Pages (frontend) + Render (API) + Supabase (base) + Cloudinary o R2 (imágenes) +
Resend (correo). Guía paso a paso y variables: [docs/despliegue.md](docs/despliegue.md).

## Documentación

Índice completo en [docs/README.md](docs/README.md). Detalle de cada aplicación en
[backend/README.md](backend/README.md) y [frontend/README.md](frontend/README.md).
