# Proyectos y Bienes Raíces — integración de Geovani

Se migraron las cuatro pantallas públicas del mockup HTML a la base React 18 + Vite, conservando la tipografía, introducciones, tarjetas, colores, galerías y composición adaptable. Se reutilizan React Router, Lucide y los estilos compartidos ya integrados con Tailwind; no se agregaron dependencias.

## Rutas y organización

| Ruta | Página | Contrato Django |
| --- | --- | --- |
| `/proyectos` | `ProjectsPage` | `GET projects/`, `GET projects/years/` |
| `/proyectos/:slug` | `ProjectDetailPage` | `GET projects/{id}/` (el `id` del contrato ya es un slug) |
| `/bienes-raices` | `PropertiesPage` | `GET properties/`, `GET properties/facets/` |
| `/bienes-raices/:id` | `PropertyDetailPage` | `GET properties/{id}/`, `POST inquiries/visits/` |

Las rutas API se resuelven bajo el prefijo de `src/services/apiClient.js` (`/api/v1` por defecto). Los módulos viven en `src/features/projects/` y `src/features/properties/`, con componentes, páginas y servicios separados. Los componentes comunes a ambos catálogos y sus estilos están en `projects/components/` y `projects/styles/catalog.css`; las propiedades los importan explícitamente para evitar duplicación sin intervenir en los componentes globales del equipo.

`CatalogPage` reutiliza `MotionPage` y fija el título después del efecto del layout, que aún clasifica estas rutas como `pending`. Header, Footer, layout, Noticias, Contacto, Administración y backend no fueron modificados. Los dos puntos de integración compartidos son el registro de las cuatro páginas en `router.jsx` y el proxy `/media` en `vite.config.js`.

## Comportamiento

- Proyectos: filtro por año, paginación, detalle, fotografías, renders y video de YouTube cuando el registro lo incluye (también en el detalle de propiedades; ver la sección Video).
- Propiedades: operación, tipo, zona, búsqueda, precios enteros y orden `recent`, `price_asc` o `price_desc`; los filtros se aplican al pulsar **Buscar propiedades**. Cambiar operación o favoritos los aplica directamente. Los cambios reinician la paginación.
- La URL conserva la búsqueda aplicada y la página; admite recarga, navegación atrás/adelante y copiar el enlace. Solo los IDs favoritos se guardan localmente. La vista de favoritos utiliza el parámetro `ids` de Django; si no hay favoritos evita solicitar todo el catálogo accidentalmente.
- Estados explícitos de carga, vacío, error con reintento y 404; se cancelan peticiones anteriores al cambiar filtros o rutas.
- Visita: nombre de hasta 120 caracteres, teléfono de Guatemala de ocho dígitos (acepta espacios/guiones), fecha válida de hoy o futura. Se envía `property_id`, `name`, `phone` normalizado y `preferred_date`. Se muestran errores de campo del servidor y se evita el doble envío. Solo un acuse válido produce confirmación.
- WhatsApp utiliza el número proporcionado por `GET company/`. Si no está disponible, el detalle ofrece un enlace a Contacto; no se inventa un número.
- Los registros marcados `demo` por Django se identifican como ejemplos. Las imágenes de catálogos se obtienen exclusivamente de la respuesta API; un recurso ausente o fallido muestra un respaldo neutro con Lucide. No hay catálogo de ejemplo de producción ni almacenamiento de solicitudes en el navegador.

## Video

El contrato de video es **únicamente un enlace HTTPS de YouTube**. El campo `video` de proyectos y propiedades se valida en Django (`VideoReferenceField`, `backend/apps/common/fields.py`) y se guarda en `proyecto_video.url_youtube` y `propiedad_video.url_youtube`; una cadena vacía significa sin video. El backend no admite MP4/WebM ni almacena archivos de video, y el frontend tampoco los reproduce: agregar ese soporte exigiría cambiar antes el contrato del backend, de forma coordinada.

`parseYoutube` (`projects/services/catalogMapper.js`) replica la validación del backend. Formatos admitidos, con un ID de 11 caracteres `[A-Za-z0-9_-]`:

| Host | Formato |
| --- | --- |
| `youtube.com`, `www.youtube.com`, `m.youtube.com` | `/watch?v=<id>`, `/embed/<id>`, `/shorts/<id>` |
| `youtu.be` | `/<id>` |

Se descartan (el video queda vacío y no se muestra reproductor) los enlaces `http`, otros hosts (incluidos `music.youtube.com`, `youtube-nocookie.com` y dominios con sufijo como `youtube.com.evil.com`), credenciales en la URL, puertos distintos de 443, espacios, caracteres de control y barras invertidas, IDs inválidos, enlaces de más de 500 caracteres y cualquier archivo de video.

`CatalogVideo` arma el reproductor solo con el ID validado, sin reutilizar el host, la ruta ni los parámetros del enlace recibido: un `iframe` de `https://www.youtube-nocookie.com/embed/<id>` con `sandbox`, `referrerPolicy`, carga diferida y título descriptivo. Debajo se ofrece siempre un enlace de respaldo «Ver en YouTube» (`https://www.youtube.com/watch?v=<id>`, nueva pestaña, `rel="noopener noreferrer"`). La aplicación no define una política CSP; si la infraestructura agrega una, debe permitir `frame-src https://www.youtube-nocookie.com`.

## Storage y desarrollo

Las imágenes (URLs HTTP/HTTPS y rutas `/media/...`) se procesan sin conectar a Storage ni incluir credenciales. Vite redirige `/api` y `/media` a `http://127.0.0.1:8000`. En producción, Django/infraestructura debe servir URLs públicas accesibles y configurar la ruta `/media` si usa referencias relativas.

```powershell
npm --prefix frontend run dev
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run build
```

El backend registra repositorios Django para proyectos y propiedades (`DjangoProjectRepository` y `DjangoPropertyRepository`, en `backend/config/bindings.py` y `backend/persistence/catalog.py`), además de noticias, contacto y visitas, empresa, medios y acceso. Solo las interfaces de servicios y búsqueda siguen pendientes y responden 501.

La base PostgreSQL consultada (solo lectura, 20 de octubre de 2026) tiene el esquema esperado: `categoria_proyecto`, `proyecto`, `proyecto_video`, `tipo_propiedad`, `tipo_operacion`, `propiedad` y `propiedad_video`, con la columna `url_youtube` en las dos tablas de video. Sin embargo, actualmente **no tiene registros de catálogo**: todas esas tablas están vacías. Mientras no se creen registros, el catálogo público no tiene contenido que mostrar.

Si Django no está ejecutándose, se verá el estado de error del catálogo. Nada de esto activa datos de respaldo ni simula solicitudes exitosas.

## Verificación

`tests/catalogs.test.mjs` tiene 14 pruebas de Node (la suite completa suma 23): mapeadores, URLs de imágenes, contratos inválidos, parámetros de filtros y paginación, facetas, detalles no publicados, fechas y teléfonos, payload de visitas, acuses y propagación de 400/404/501. Cuatro cubren el video de YouTube: formatos admitidos, MP4/WebM, hosts inválidos, IDs inválidos y enlaces manipulados, video vacío o ausente, y que el embed y el enlace de respaldo se construyan solo con el ID.

Se revisaron las cuatro rutas en navegador con respuestas API interceptadas exclusivamente en la sesión de pruebas, utilizando datos del mockup identificados como ejemplos. Se comprobaron el filtro por año, paginación, operación, orden, rango inválido, búsqueda sin resultados, persistencia de favoritos, galerías/fotos/renders, formulario de visita (error y éxito controlados), Escape/restauración del foco, carga, reintento, 404 y respaldo ante imágenes fallidas. Se verificó el catálogo y el detalle a 390 px y escritorio. Estas pruebas no prueban persistencia real ni envían solicitudes a EnObra.

Para la integración se revisaron `origin/develop`, `origin/frontend-dev` y `origin/frontend/news-admin-contact` (20 de octubre de 2026). Se conserva la base visual de Leo y se sigue la separación de componentes, servicios y validaciones usada por Jennifer.

- `origin/frontend-dev` solo elimina un banner de `HomeHero.jsx`; no toca los archivos compartidos.
- `origin/frontend/news-admin-contact` agrega las rutas de noticias, contacto y administración (incluidas `/admin/noticias` y `/admin/mensajes`) y modifica `router.jsx`, `routePaths.js` y `vite.config.js` (proxy `/media`). Al combinarla con esta rama deben conservarse ambas partes: sus rutas y las cuatro páginas de Proyectos y Bienes Raíces en `router.jsx`, y un único proxy `/media` junto a `/api` en `vite.config.js`.

Los cambios quedan en la rama de trabajo existente `feature/projects-&-real-estates`; no se publica con push ni se abre un PR.
