# EnObra Platform

<!-- enobra-documentacion-vigente -->
> Guía vigente. Revisión documental: 3-nov-2026.
> [Base y límites técnicos](docs/BASE-DOCUMENTACION-TECNICA.md). Las evidencias no se reinterpretan como nuevas ejecuciones.
<!-- /enobra-documentacion-vigente -->
Monorepo con dos aplicaciones independientes: **Django + Django REST Framework** en
`backend/` y **React + Vite** en `frontend/`. Se comunican por HTTP mediante `/api/v1/`.
Cada aplicación tiene sus dependencias, configuración y comandos de arranque.

## Ramas compartidas del equipo

Frontend: **Leo, Geo y Jennifer en frontend-dev**; Pablo trabaja el **Administrador**
también en frontend-dev. Backend: **Juan, Pablo y Henry en backend-dev**. Una sola rama
por equipo, sin ramas alternas. Antes de trabajar o publicar, revisar y sincronizar
los cambios de compañeros. Ver [reglas de trabajo](docs/TRABAJO-EN-EQUIPO.md).

## Documentación técnica

La [base técnica](docs/BASE-DOCUMENTACION-TECNICA.md), el
[diccionario de datos](docs/DICCIONARIO-DATOS.md) y el
[inventario de fuentes](docs/INVENTARIO-DOCUMENTACION.md) preparan el manual.
Los planes/etapas sustituidos se retiraron del árbol actual; su historial queda en Git.

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
│   ├── infraestructura.md    # Infraestructura y límites de operación
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

- Sitio y panel: [enobra.com.gt](https://enobra.com.gt), Cloudflare Pages desde frontend-dev.
- API: [Render](https://enobra-api.onrender.com/api/v1/health/), Gunicorn y PostgreSQL Supabase.
- R2 privado activo; fotos públicas mediante la API y borradores protegidos.
- Inicio solicita health una vez por carga; Actions reintenta al publicar develop.
  No hay ping periódico. P-02 mantiene su limpieza diaria independiente.
- Los módulos del panel están integrados. Servicios y búsqueda siguen con endpoints
  pendientes (`501`); no ejecutar migraciones para recrear tablas existentes.

Consultar [estado vigente y pendientes](docs/estado-proyecto.md),
[operación y diagnóstico](docs/operacion-produccion.md) y
[evidencia del despliegue](docs/Render-validacion-2026-11-03.md).

## Trabajo en equipo

Somos seis integrantes (tres de backend y tres de frontend), coordinados mediante
contratos. Consulta las [reglas y responsables](docs/reglas-desarrollo.md) y la
[infraestructura vigente](docs/infraestructura.md): Cloudflare Pages, Render,
Supabase y R2 privado. Véase [configuración R2](docs/R2-configuracion.md).
Las asignaciones no restringen las contribuciones y todos los acuerdos están sujetos a cambios.
