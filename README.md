# EnObra Platform

Monorepo con dos aplicaciones independientes: **Django + Django REST Framework** en
`backend/` y **React + Vite** en `frontend/`. Se comunican por HTTP mediante `/api/v1/`.
Cada aplicación tiene sus dependencias, configuración y comandos de arranque.

## Estructura

```text
enobra-platform/
├── backend/
│   ├── apps/                 # Contratos y lógica por dominio
│   │   ├── accounts/         # Autenticación
│   │   ├── common/           # Utilidades compartidas del backend
│   │   ├── company/          # Empresa e información institucional
│   │   ├── inquiries/        # Solicitudes de contacto y visitas
│   │   ├── media/            # Contratos de medios
│   │   ├── news/             # Noticias
│   │   ├── projects/         # Proyectos
│   │   ├── properties/       # Bienes raíces
│   │   ├── search/           # Búsqueda
│   │   └── services/         # Servicios de construcción
│   ├── config/               # Settings, URLs, ASGI/WSGI y registro de implementaciones
│   ├── .env.example          # Variables del servidor
│   ├── manage.py
│   ├── requirements.txt
│   └── README.md             # Contratos y desarrollo de la API
├── frontend/
│   ├── src/
│   │   ├── app/              # Entrada de la aplicación y rutas
│   │   ├── components/       # Componentes reutilizables y layouts
│   │   ├── features/         # Páginas y servicios organizados por funcionalidad
│   │   ├── services/         # Cliente HTTP compartido
│   │   ├── styles/           # Estilos globales
│   │   └── main.jsx
│   ├── tests/
│   ├── .env.example          # Variables públicas de Vite
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── README.md             # Desarrollo y reparto de módulos
├── docs/
│   ├── README.md             # Índice de documentación
│   ├── reglas-desarrollo.md  # Equipo, contratos y flujo de colaboración
│   ├── infraestructura.md    # Propuesta de despliegue, sujeta a cambios
│   └── openapi.yaml          # Contrato compartido entre backend y frontend
├── .gitignore
└── README.md
```

## Desarrollo local

Requisitos: Python 3.12+ y Node.js compatible con `frontend/package.json`.
Abre dos terminales desde la raíz del repositorio.

### Terminal 1: backend (PowerShell)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py runserver
```

La creación del entorno, instalación y copia de `.env` se hacen en el primer arranque.
En los siguientes basta ejecutar `runserver` desde `backend/` con el Python del entorno.
En macOS/Linux usa `.venv/bin/python` y `cp` en lugar de `Copy-Item`.

### Terminal 2: frontend

```powershell
cd frontend
npm ci
npm run dev
```

Frontend: <http://localhost:5173/>. API: <http://127.0.0.1:8000/api/v1/health/>.
Swagger: <http://127.0.0.1:8000/api/docs/>.
Vite ya redirige `/api` al backend durante desarrollo.

## Configuración y responsabilidades

- **Backend:** código Python, validaciones, permisos y futuras implementaciones de persistencia.
  Su archivo local `backend/.env` se carga automáticamente; las variables del sistema tienen prioridad.
  Usa PostgreSQL alojado en Supabase mediante `DATABASE_URL` y accede a las tablas existentes
  exclusivamente con Django ORM. No se crean esas tablas con migraciones de Django.
- **Frontend:** componentes, rutas, estilos y peticiones HTTP. Para cambiar la URL de la API,
  copia `frontend/.env.example` a `frontend/.env.local` y ajusta `VITE_API_BASE_URL`.
  Las variables `VITE_*` son públicas: no deben contener secretos. React nunca se conecta
  directamente a Supabase/PostgreSQL: consume únicamente la API de Django.
- **Documentación compartida:** contratos y acuerdos entre ambas aplicaciones en `docs/`.
- **Despliegue:** ejecuta Django desde `backend/` usando `config.wsgi:application` o
  `config.asgi:application`. El resultado de compilar React está en `frontend/dist/`.
  En producción configura el proxy de `/api` o una URL de API pública y su origen CORS;
  el proxy de Vite solo funciona durante desarrollo.

La configuración activa de Django es `backend/config/`. Se retiraron `core/` y `api/`,
que eran plantillas iniciales sin uso. Los imports internos (`apps.*`, `config.*`) se conservan.

## Verificación

Desde `backend/`:

```powershell
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py spectacular --file ../docs/openapi.yaml --validate
```

Desde `frontend/`:

```powershell
npm test
npm run lint
npm run build
```

## Estado actual

La API define contratos e interfaces y ya admite configurar la conexión a PostgreSQL mediante
`DATABASE_URL`; los modelos y repositorios todavía están pendientes. Los endpoints sin
implementación responden `501 not_implemented`. Las tablas de negocio ya existen y deben
mapearse sin `makemigrations`/`migrate`. El frontend contiene rutas, servicios HTTP y pantallas
provisionales.

Consulta [la documentación del backend](backend/README.md),
[la del frontend](frontend/README.md) y [el contrato OpenAPI](docs/openapi.yaml).

## Trabajo en equipo

Somos seis integrantes (tres de backend y tres de frontend), coordinados mediante
contratos. Consulta las [reglas y responsables](docs/reglas-desarrollo.md) y la
[propuesta de infraestructura](docs/infraestructura.md): Cloudflare Pages para el
frontend con dominio `.gt` y Render para Django. El proveedor de fotos/renders sigue
pendiente; Cloudflare R2 es solo una propuesta.
Las asignaciones no restringen las contribuciones y todos los acuerdos están sujetos a cambios.
