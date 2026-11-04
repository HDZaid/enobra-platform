# EnObra — Frontend

<!-- enobra-documentacion-vigente -->
> Guía vigente, revisión documental del 3-nov-2026.
> [Base técnica](../docs/BASE-DOCUMENTACION-TECNICA.md), [inventario](../docs/INVENTARIO-DOCUMENTACION.md) y [estado](../docs/estado-proyecto.md).
<!-- /enobra-documentacion-vigente -->

React + Vite, JavaScript/JSX. Sitio público y panel administrativo conectados a
Django mediante `/api/v1/`. Estado común y pendientes en
[Estado del proyecto](../docs/estado-proyecto.md).

## Desarrollo y comprobaciones

Node.js compatible con `package.json` (>=20.19 o >=22.12):

```sh
cd frontend
npm ci
npm run dev
npm run lint
npm test
npm run build
```

Vite sirve `http://localhost:5173` y redirige `/api` y `/media` a Django local,
normalmente `http://127.0.0.1:8000`. Backend y frontend se inician por separado.
Usar `npm ci` con el lockfile versionado; no publicar node_modules ni archivos .env.

## Cloudflare Pages y API de Render

- Sitio: [enobra.com.gt](https://enobra.com.gt).
- Panel: [admin/login](https://enobra.com.gt/admin/login).
- Proyecto Pages: `enobra-platform`; rama de producción `frontend-dev`, raíz
  `frontend`, build `npm run build`, salida `dist`.
- Configurar en las variables de producción de Pages:

```dotenv
VITE_API_BASE_URL=https://enobra-api.onrender.com/api/v1
```

Vite incorpora el valor al compilar: guardar la variable requiere reconstruir el
frontend. Usar `/api/v1` en Pages sin un proxy devuelve 405 al enviar el login al
alojamiento estático. El proxy de Vite solo existe durante desarrollo.
Las variables `VITE_*` son públicas; no colocar claves, contraseñas ni tokens.

Al montar **Inicio (`/`)**, `backendWarmup.js` solicita una sola vez `health/`,
sin credenciales y sin bloquear el contenido. Tolera hasta 75 segundos; los
remontajes de React y regresar a Inicio no duplican el ping en esa carga de la
aplicación. Abrir otra ruta no dispara este ping adicional. No hay intervalos.
Las consultas normales de cada página siguen llamando a sus propios endpoints.

La primera operación todavía puede esperar el arranque de Render Free. El ping
no garantiza disponibilidad continua ni reemplaza la gestión de errores del panel.

## Funcionalidad y contratos

Sitio: Inicio, Nosotros, Servicios, Proyectos, Bienes raíces, Noticias y Contacto.
Panel: sesión, Resumen, Proyectos, Bienes raíces, Noticias, Mensajes, Usuarios,
Papelera e Historial, según permisos. La política vigente está en
[roles fijos](../docs/politica-roles-fijos.md); el backend aplica la autorización.

El [contrato OpenAPI](../docs/openapi.yaml) define listados, errores y permisos.
Servicios y búsqueda conservan endpoints pendientes (`501`). El editor
administrativo de Empresa/Nosotros no está implementado en las rutas del panel. Los modos demo y
`VITE_NEWS_PREVIEW` son de desarrollo y no prueban persistencia real.

Las fotos se entregan por la API desde R2 privado. Las referencias de borradores
usan vistas previas temporales; las publicaciones públicas reciben URLs estables.
No se necesitan credenciales R2 en React.

## Equipo y referencias

Frontend trabaja en `frontend-dev`, backend en `backend-dev`; `develop` integra.
Conservar aportaciones de Leo, Geo, Jennifer y la colaboración autorizada de Pablo.
Consultar [trabajo compartido](../docs/TRABAJO-EN-EQUIPO.md) antes de cambiar archivos
comunes. Las etapas ADMIN/NEWS y notas de implementación sustituidas se retiraron del
árbol actual; sus versiones se pueden recuperar en Git. Para producción consultar [operación actual](../docs/operacion-produccion.md) y la
[evidencia de Render y R2](../docs/Render-validacion-2026-11-03.md).

## Preparación del manual y exposición

La base técnica incluye versiones resueltas, API de 38 rutas/55 operaciones y el
diccionario de veinte modelos de backend. El manual debe separar las pantallas
integradas de Servicios/búsqueda aún pendientes y de las verificaciones reales
por rol que no se han completado en el despliegue.

Validación funcional de referencia: 191 pruebas frontend, lint y build correctos;
esta revisión solo modifica Markdown y no representa una nueva prueba de navegador.
Las cuentas de Supabase se conservarán para la exposición del 4-nov-2026. La
posterior depuración pretende dos identidades humanas (Admin e Ingeniero), con
correos por definir. No se eliminaron cuentas y el manual no incluye credenciales.
La política actual equipara Ingeniero a Administrador.
