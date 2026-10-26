# EnObra · Frontend

React 18 + Vite (JavaScript/JSX), Tailwind CSS 4 y Lucide React. Contiene el sitio público y
el panel administrativo; consume únicamente la API de Django (`../backend/`).

Estado, pruebas y pendientes vigentes: [../docs/estado-proyecto.md](../docs/estado-proyecto.md).

## Arranque

Node.js ≥ 20.19 o ≥ 22.12. Desde la raíz del repositorio, con el backend corriendo en otra
terminal (ver [../backend/README.md](../backend/README.md)):

```bash
cd frontend
npm ci
npm run dev        # http://localhost:5173/
```

| Comando | Qué hace |
|---|---|
| `npm test` | Pruebas con `node --test` (`tests/*.test.mjs`) |
| `npm run lint` | ESLint |
| `npm run build` | Compila a `dist/` (incluye `public/_redirects` y `_headers`) |
| `npm run preview` | Sirve el build localmente |

Usa `npm ci` para instalar y `npm install` solo al agregar o actualizar dependencias,
versionando también `package-lock.json`.

## Variables (`.env.local`)

Copia `.env.example`. Todas las `VITE_*` son **públicas** y se leen al compilar: nunca
contienen secretos.

| Variable | Desarrollo | Producción (Cloudflare Pages) |
|---|---|---|
| `VITE_API_BASE_URL` | `/api/v1` (Vite redirige `/api` y `/media` a Django) | `https://api.<dominio>/api/v1`, sin barra final |
| `VITE_API_PROXY_TARGET` | Opcional; destino del proxy (por defecto `http://127.0.0.1:8000`) | No aplica |
| `VITE_NEWS_PREVIEW` | `true` muestra noticias de ejemplo si la API falla | `false` |

## Rutas

Definidas en `src/app/routePaths.js` y `src/app/router.jsx`.

| Sitio público | Panel (`/admin`, requiere sesión) |
|---|---|
| `/` Inicio · `/nosotros` · `/servicios` | `/admin/login` · `/admin` (resumen) |
| `/proyectos` · `/proyectos/:slug` | `/admin/bienes-raices` · `/nuevo` · `/:id/editar` |
| `/bienes-raices` · `/bienes-raices/:id` | `/admin/proyectos` · `/nuevo` · `/:slug/editar` |
| `/noticias` · `/noticias/:slug` | `/admin/noticias` · `/admin/mensajes` |
| `/contacto` | `/admin/papelera` · `/admin/historial` |
| | `/admin/roles` · `/admin/usuarios` |

Cada sección del panel se muestra según los permisos del usuario (`utils/adminData.js`).
Ocultar un botón es solo comodidad: **el backend siempre decide**. Una ruta sin permiso
muestra "No disponible para tu rol".

## Organización

```text
src/
├── app/              # Router y rutas
├── components/
│   ├── layout/       # Header, Footer, SiteLayout, AdminLayout, buscador
│   └── ui/           # Kit compartido (Leo): MultiImageUploader, LoadingButton, ConfirmDialog,
│                     # ErrorState, EmptyState, Notice, Skeleton, apiErrors, imageUpload
├── features/         # Una carpeta por módulo: pages/, components/, services/, utils/
│   ├── home/ about/ services/ projects/ properties/ news/ contact/   # sitio público
│   └── admin/ admin-properties/ admin-projects/ admin-trash/ admin-history/ admin-roles/
├── services/         # apiClient.js (HTTP) y uploadClient.js (subidas)
└── styles/
```

| Responsable | Módulos |
|---|---|
| Leo (@Leonor-Rosales) | Inicio, Nosotros, Servicios, layout, kit de UI, Papelera, Historial |
| Geo (@g4usSi) | Proyectos y Bienes Raíces públicos, Bienes Raíces del panel |
| Jennifer (@Jeidy25Saquic) | Noticias, Contacto, sesión y navegación del panel, Proyectos del panel, Mensajes |
| Pablo (@PabloZ7-425) | Roles y Usuarios del panel |

Los archivos compartidos (`src/app/`, `components/layout/`, `services/apiClient.js`,
`package.json`) tienen dueño: ver [../docs/TRABAJO-EN-EQUIPO.md](../docs/TRABAJO-EN-EQUIPO.md).

## Contrato con la API

- Contrato: [../docs/openapi.yaml](../docs/openapi.yaml). Listados `{count, page, page_size, results}`;
  errores `{error: {code, message, details}}`. `apiErrors.js` distingue 401 (sesión vencida)
  de 403 (sin permiso) y muestra los errores por campo.
- Los formularios de publicaciones envían siempre `demo: false` y `published` explícito.
  Sin permiso de publicar se guarda como borrador y se avisa.
- Imágenes: `POST /admin/media/` y se guarda la URL que devuelve (disco local en
  desarrollo; Cloudinary o R2 en producción). Nunca se suben directo al proveedor.
- **Sesión:** el token vive solo en memoria. Recargar la página la cierra, y el acceso
  dura **15 minutos sin renovación automática** (pendiente CF-03). Para la demo, entra de
  nuevo antes de un recorrido largo.
- Servicios y búsqueda global responden `501` en la API; la interfaz lo maneja.

## Pruebas de navegador (opcionales)

`tests/browser/*.cjs` usan Playwright y Chromium, que **no** son dependencias del proyecto.
Instálalos aparte y pasa su ruta por variables:

```bash
npm --prefix /tmp/enobra-browser install playwright@1.64.1
export PLAYWRIGHT_MODULE=/tmp/enobra-browser/node_modules/playwright CHROMIUM_PATH=/usr/bin/chromium

# React contra Django real con una base SQLite temporal (no toca Supabase):
python backend/scripts/verify_frontend_integration.py
```

`verify_frontend_integration.py` crea la base y cuentas aleatorias, arranca Django y Vite en
puertos libres, ejecuta `live-backend.cjs` y borra todo al terminar. Los recorridos que usan
`INTEGRATION_BASE_URL`, `INTEGRATION_EMAIL` e `INTEGRATION_PASSWORD` crean datos: úsalos
solo con cuentas y bases de prueba, nunca con producción.

## Despliegue

Cloudflare Pages: directorio raíz `frontend`, comando `npm run build`, salida `dist`.
`public/_redirects` hace que las rutas del panel funcionen al recargar y `public/_headers`
añade cabeceras de seguridad. Pasos completos en [../docs/despliegue.md](../docs/despliegue.md).
