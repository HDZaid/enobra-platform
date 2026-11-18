# EnObra — Frontend

<!-- enobra-documentacion-vigente -->
> Guía vigente, revisión documental del 17-nov-2026.
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

Las vistas de Proyectos y Bienes raíces intentan mostrar datos públicos guardados
mientras Render despierta. El build de Pages copia hasta 20 publicaciones de
cada catálogo y un subconjunto de sus medios. El navegador guarda respuestas
públicas hasta siete días. La respuesta de la API refresca los datos y un 404 de
detalle prevalece sobre la copia. Ver [operación](../docs/operacion-produccion.md#copia-pública-del-catálogo-en-pages).
Mientras los datos no están confirmados, la etiqueta de disponibilidad muestra
un indicador de carga (`catalogFreshness`, `FreshLabel`). Si la API falla, se
marca «Sin confirmar» y se ofrece reintentar, sin presentar como vigente lo guardado.

Inicio muestra proyectos publicados con ese mismo origen y solicita las noticias
publicadas por separado. Las tarjetas abren un álbum. Bienes raíces permite
seleccionar Venta y Alquiler. Las fichas preparan consultas de WhatsApp con su
enlace y Pages Functions añade metadatos para compartirlo.

## Funcionalidad y contratos

Sitio: Inicio, Nosotros, Servicios, Proyectos, Bienes raíces, Noticias y Contacto.
Panel: sesión, Resumen, Proyectos, Bienes raíces, Noticias, Mensajes, Usuarios,
Papelera e Historial, según permisos. Resumen muestra accesos rápidos y avisos
sobre la publicación del catálogo. Usuarios separa cuentas activas e inactivas.
La política vigente está en
[roles fijos](../docs/politica-roles-fijos.md); el backend aplica la autorización.

El [contrato OpenAPI](../docs/openapi.yaml) define listados, errores y permisos.
La página pública de Servicios tiene contenido de referencia. Los endpoints de
Servicios y búsqueda responden `501`. El sitio muestra información de Empresa,
cuya API está disponible. Falta su editor en el panel. Los modos demo y
`VITE_NEWS_PREVIEW` son de desarrollo y no prueban persistencia real.

Las fotos se entregan por la API desde R2 privado. Las referencias de borradores
usan vistas previas temporales y las publicaciones públicas reciben URLs estables.
Las imágenes públicas copiadas durante el build se sirven desde Pages cuando
están disponibles. Las credenciales de R2 quedan en el backend.

## Equipo y referencias

Frontend trabaja en `frontend-dev`, backend en `backend-dev`; `develop` integra.
Conservar aportaciones de Leo, Geo, Jennifer y la colaboración autorizada de Pablo.
Consultar [trabajo compartido](../docs/TRABAJO-EN-EQUIPO.md) antes de cambiar archivos
comunes. Las etapas ADMIN/NEWS y notas de implementación sustituidas se retiraron del
árbol actual; sus versiones se pueden recuperar en Git. Para producción consultar [operación actual](../docs/operacion-produccion.md) y la
[evidencia de Render y R2](../docs/Render-validacion-2026-11-03.md).

## Validación y documentación

La revisión local de `aa96acd` del 17-nov pasó 203 pruebas y lint.
En producción se comprobaron las páginas públicas de Inicio y login y la copia
estática de Pages. El recorrido autenticado por titular y la publicación con
imagen se registran por separado. Consultar [estado del proyecto](../docs/estado-proyecto.md)
y [base del manual técnico](../docs/BASE-DOCUMENTACION-TECNICA.md).
