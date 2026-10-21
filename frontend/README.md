# EnObra — Frontend integrado

Proyecto React + Vite en JavaScript/JSX, preparado para conectarse a los contratos de Django REST Framework de este mismo repositorio.

> **Estado en `frontend-dev`:** integrados los módulos públicos de Leo, Jennifer y Geo, más login, dashboard, noticias y mensajes del panel. Validación de UI con API controlada; la conexión real y persistencia se verifican en la fase de backend. Faltan los formularios administrativos de proyectos, propiedades y contenido institucional.

## Requisitos

Node.js >= 20.19 o >= 22.12 y npm. Desde la raíz del repositorio:

```bash
cd frontend
npm ci
npm run dev
```

Abra `http://localhost:5173/`. Para compilar y ejecutar comprobaciones:

```bash
npm run test
npm run lint
npm run build
```

El repositorio incluye `package-lock.json` para instalar dependencias con `npm ci`.
No incorpora `node_modules` ni tokens. Usa `npm install` cuando agregues o actualices
dependencias y versiona también los cambios del lockfile.

## API

- El servidor Django está en [`../backend/`](../backend/README.md); se ejecuta en otra terminal.
- El contrato compartido está en [`../docs/openapi.yaml`](../docs/openapi.yaml).
- Prefijo predeterminado: `/api/v1`, configurable con `VITE_API_BASE_URL` en `.env.local`.
- Vite redirige `/api` y `/media` a Django en `http://127.0.0.1:8000` durante desarrollo.
- La API responde con `{count,page,page_size,results}` en listados y `{error:{code,message,details}}` en errores.
- El backend incluido ya registra persistencia para varios módulos, pero necesita su configuración de base de datos. Servicios y búsqueda siguen pendientes; la UI maneja 501. Los modos demo están identificados, limitados a desarrollo y no representan guardados reales.
- El cliente HTTP se encuentra en `src/services/apiClient.js` y los servicios particulares dentro de `src/features/*/services/`.
- No subir secretos ni incluir contraseñas o tokens reales en el repositorio. Las peticiones protegidas reciben el token explícitamente; falta acordar sesión y renovación con el backend.

## Reparto del trabajo

| Persona | Módulo | Rutas públicas |
| --- | --- | --- |
| Leo (@Leonor-Rosales) | Inicio, Nosotros, Servicios, layout visual | `/`, `/nosotros`, `/servicios` |
| Geo (@g4usSi) | Proyectos y Bienes raíces, detalles | `/proyectos`, `/bienes-raices` |
| Jennifer (@Jeidy25Saquic) | Noticias, Contacto, panel y auth del frontend | `/noticias`, `/contacto`, `/admin` |

El panel será compartido: **cada persona implementará los formularios de administración de su propio módulo**. Los cambios en archivos compartidos (`src/app/`, `src/components/layout/`, `src/styles/`) se coordinan y revisan entre las personas afectadas. Las asignaciones son orientativas: cualquier integrante puede contribuir a otros módulos.

El equipo completo tiene tres integrantes de frontend y tres de backend. Las
[reglas compartidas](../docs/reglas-desarrollo.md) identifican responsables, contratos
y flujo de ramas. Todo está sujeto a cambios por acuerdo del equipo.

## Rutas y mockup

Las rutas de React se definen en `src/app/router.jsx` y `src/app/routePaths.js`. Se usan rutas limpias (`/noticias`) en lugar de archivos `.html`. Para migrar, conservar el contenido y aspecto del mockup original `MockUp---enObra`, sin copiar el `localStorage` como fuente permanente de contenido. El contenido administrable debe provenir de la API.

La base inicial no incluía los archivos del mockup ni sus recursos. Las ramas de módulos
pueden incorporarlos al migrar sus páginas, identificando los recursos de demostración.
Cloudflare R2 es la [propuesta de almacenamiento](../docs/infraestructura.md), todavía
sujeta a cambios y pendiente de implementación.

## Siguiente fase

1. Validar el flujo completo contra Django configurado: login/RBAC, expiración, consultas, guardados, medios, contacto y visitas.
2. Incorporar los formularios administrativos de proyectos, propiedades y contenido institucional cuando sus autores los publiquen.
3. Confirmar datos del cliente, contenido real y reglas de despliegue, CORS y medios.
4. En esta fase se trabaja y publica exclusivamente en `frontend-dev`, sin crear ramas ni fusionar hacia `develop` o `main`.

## Integración en frontend-dev

El estado unificado, las ramas revisadas, los contratos y las limitaciones se documentan
en [Integración del frontend](../docs/frontend-integration.md). Los informes ADMIN/NEWS
describen sus entregas de origen; el reporte de integración indica la validación conjunta.

## Conexión actual con Django

Login, datos institucionales, Noticias, Contacto y Mensajes se verificaron de extremo
a extremo con Django/ORM y almacenamiento local desechable. Inicio consulta noticias
y Contacto consulta los datos de empresa. Consulta [integración y pendientes](../docs/integracion-backend-frontend.md)
para reproducir las pruebas y conocer los límites de catálogos y Supabase.
La previsualización pública de noticias es opcional: `VITE_NEWS_PREVIEW=true`, solo
en desarrollo. Sin esa opción, una API de noticias caída muestra error.
