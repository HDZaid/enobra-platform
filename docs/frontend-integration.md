# Integración del frontend en frontend-dev

Fecha: 20 de octubre de 2026 (America/Guatemala). Destino exclusivo: `frontend-dev`.

## Revisión inicial y alcance

Árbol inicial limpio. Se ejecutó `git fetch --prune origin`, seguido de un fetch
explícito de todas las referencias porque el checkout solo descargaba `main`.
Se revisaron las seis ramas remotas; no aparecieron otras. La rama local inicial
`work` se renombró a `frontend-dev` y avanzó por fast-forward al remoto; no se
crearon ramas de trabajo adicionales ni se modificaron `main` o `develop`.

| Rama | HEAD revisado | Resultado frente a frontend-dev inicial |
| --- | --- | --- |
| main | baaeed7 | Ancestro, sin commits exclusivos. |
| develop | cfafd6c | Ancestro, sin commits exclusivos. Backend ya presente en el destino. |
| frontend-dev | d2c2808 | Leo ya integrado; se conservan páginas, layout, buscador, recursos, estilos y tests. |
| frontend/news-admin-contact | 9189058 | Noticias, contacto y administración pendientes; incluye también backend que se excluye. |
| feature/projects-&-real-estates | da2d292 | Un commit exclusivo nuevo, con proyectos y propiedades. Se incorpora después de Jennifer. |
| fix/db-connection-diagnostics | a79493d | Backend/diagnóstico; no se fusiona. Sus cambios frontend de RBAC también están en 9189058. |

## Etapa 1: preservar Leo

Se conserva el contenido de Inicio, Nosotros, Servicios, Header, Navbar, Footer,
SearchDialog y SiteLayout. Las páginas y su navegación se comprueban en Chromium
con respuestas API controladas, a 1440 y 390 píxeles. Eso valida la UI y su fallback,
no la disponibilidad de datos reales ni una conexión de producción.

## Etapa 2: Jennifer

Integración selectiva de `frontend/` desde el ancestro frontend `98cbe0e` hasta
`9189058`, mediante parche binario con aplicación de tres vías. Se evita un merge
completo porque arrastraría `backend/config/settings.py` y
`backend/persistence/db_diagnostics.py`. No se copió el snapshot completo de la rama:
se conservaron los archivos exclusivos de Leo y sus cambios compartidos.

Commits fuente que aportan frontend/documentación: `0263024`, `a9961a5`, `530a7f9`,
`ed224bd`, `bbb7556`, `aaffc96`, `3cf779a`, `9189058`. Los merges `5d996c9` y
`e4c7831` no se repiten. Los originales permanecen en su rama; el nuevo commit
registra la procedencia del parche sin atribuirse sus autores originales.

Módulos: noticias públicas y detalle, categorías/paginación, formulario de contacto,
login, dashboard, CRUD/editor de noticias, imágenes y bandeja de mensajes. RBAC
usa `user.permissions`, con acceso `admin.all` a noticias/mensajes. La sesión se
mantiene en memoria y se pierde al recargar; el backend sigue siendo quien autoriza.
La demostración administrativa solo se habilita en desarrollo.

Conflicto textual: `frontend/src/app/router.jsx`, resuelto uniendo imports y rutas
de ambos trabajos. Se mantiene SiteLayout, el favicon y todos los recursos de Leo.
Se corrige la duplicación de `<main id="main">` en noticias, detalle y contacto al
montarlos dentro de SiteLayout. Las fuentes Inter/Outfit reutilizan los archivos
locales y licencias existentes, sin depender de Google Fonts.

Compartidos modificados en esta etapa: router.jsx, routePaths.js, AdminLayout.jsx,
vite.config.js (proxy `/media`) y documentación. No se cambian dependencias,
lockfile, cliente HTTP ni backend. Se añade styles/fonts.css para las fuentes comunes.

Validación: `npm ci` (caché en `/workspace/.npm-cache`), lint, 58 pruebas sin fallos
ni omitidas, build y `git diff --check`. La primera instalación falló por permisos
de caché en `/home/agent/.npm`; se repitió con caché escribible sin relajar integridad.
Chromium comprueba rutas públicas, protección de rutas administrativas, navegación
a noticias en modo demo, ausencia de errores JS, desbordamiento horizontal y IDs
repetidos, a 1440 y 390 píxeles. API simulada con 501 para esta comprobación.

## Contratos y límites

Se conserva `/api/v1/` y el cliente `apiRequest`: errores `{error:{code,message,details}}`,
Bearer por solicitud, paginación `{count,page,page_size,results}`. Servicios existentes:
`news/` GET/POST, `news/{slug}/` GET/PATCH/DELETE; `inquiries/contact/` POST;
`inquiries/` GET y `inquiries/{id}/` GET/PATCH; `auth/login/`, `auth/refresh/`,
`auth/logout/` POST, `auth/me/` GET; `admin/media/` POST multipart.
Las pruebas de servicios verifican métodos, rutas, payloads, tokens y errores.

No se ejecutan migraciones ni se modifica persistencia, permisos o modelos.
No se declara validada la autenticación, persistencia, entrega de mensajes o subida
real de medios contra Supabase/Django. Antes de integrar backend hay que validar
credenciales por configuración segura, permisos efectivos, CORS, caducidad/refresh,
URLs de medios, respuestas vacías/errores y guardados persistidos. Los datos demo
no equivalen a datos reales. Los formularios de administración de proyectos y
propiedades se evalúan según el trabajo publicado, sin inventar módulos ausentes.

## Etapa 3: Geo y aplicación conjunta

Después de validar y publicar `452ed73` (Jennifer), se integra mediante merge el
commit original `da2d292e64f4feed256352d06674788f7d65aed6` de Geo. Su autor,
fecha y commit se conservan en el historial. Este avance toca solo frontend y
`docs/geo-frontend.md`, por lo que no exige una selección de backend.

Segundo conflicto textual en router.jsx: se incorporan Proyectos, su detalle,
Bienes Raíces y su detalle manteniendo todas las rutas de Leo y Jennifer. Se
retiran los marcadores de Geo y se evitan rutas repetidas de Jennifer. El merge
automático duplicaba la clave `/media` de Vite; se conserva un único proxy.
Se preserva la eliminación del banner de `d2c2808`, sin restaurar HomeHero.

Se corrige SiteLayout para que no sobrescriba los títulos de Noticias/Contacto;
las rutas desconocidas tienen un título propio. PendingPage se convierte en un
contenedor dentro del único main del layout, evitando otro landmark anidado en
la ruta no encontrada. CatalogPage conserva su sincronización de título.

Compartidos finales: `src/app/router.jsx`, `src/app/routePaths.js`,
`src/components/layout/AdminLayout.jsx`, `src/components/layout/SiteLayout.jsx`,
`src/features/shared/pages/PendingPage.jsx`, `vite.config.js`, `eslint.config.js`,
`src/styles/fonts.css` y los README. Las dependencias y package-lock.json siguen
idénticos a `d2c2808`; no se añadieron dependencias a la aplicación.

Validación de la aplicación conjunta:

- `npm --prefix frontend ci` con caché escribible: correcto.
- `npm --prefix frontend run lint`: correcto.
- `npm --prefix frontend run test`: 72 pruebas aprobadas, cero fallidas/omitidas.
- `npm --prefix frontend run build`: correcto (Vite, 2018 módulos).
- `git diff --check` y comprobación del índice: correctos.
- Chromium: 12 rutas a 1440 y 390 px, incluyendo detalles, login y ruta desconocida;
  un solo main, IDs únicos, títulos de Noticias/Contacto y sin desbordamiento.
- Filtro de año y categoría con query string; formulario de contacto con teléfono
  normalizado; apertura/cierre con Escape del diálogo de visita; catálogos vacíos,
  error 501, reintento y detalle 404. Imágenes API fallidas muestran su respaldo.
- Redirección de acceso anónimo, error de login 401, sesión con `admin.all`,
  dashboard, editor de noticias y envío de un borrador con Bearer y `published:false`,
  bandeja de mensajes, logout, rol Arquitecta y denegación de la ruta de noticias.
- Cero errores JavaScript no capturados en ese recorrido. Las respuestas están
  interceptadas; los mensajes de éxito de la UI se verifican frente a acuses de
  prueba, no prueban ninguna escritura real ni acceso a producción.
- `git diff d2c2808 -- backend` vacío: esta fase no modifica backend.

### Repetir el recorrido de navegador

`frontend/tests/browser/integration.cjs` conserva el recorrido ejecutado. Usa
Playwright como herramienta de verificación externa; no añade dependencias al
producto. Requiere el servidor Vite con prefijo API predeterminado en 5173 y un
Chromium instalado. En esta máquina:

```bash
npm --cache /workspace/.npm-cache --prefix /tmp/enobra-browser install --no-audit --no-fund playwright
# Desde la raíz, con npm --prefix frontend run dev en otra terminal:
PLAYWRIGHT_MODULE=/tmp/enobra-browser/node_modules/playwright \
CHROMIUM_PATH=/usr/bin/chromium \
node frontend/tests/browser/integration.cjs
```

Las variables anteriores seleccionan herramientas locales y no contienen secretos.
Tras reinstalar node_modules, reiniciar Vite para evitar sus dependencias optimizadas
obsoletas. Las pruebas Node siguen ejecutándose con `npm --prefix frontend run test`.

## Pendientes reales antes de backend

Todo el trabajo frontend publicado en las ramas revisadas queda incorporado.
No hay módulos públicos pendientes de Geo en el estado inspeccionado. Eso no
significa que el producto esté completo: faltan formularios administrativos de
proyectos, propiedades y contenido institucional que esas ramas no proporcionan;
la sesión no tiene renovación automática ni persistencia tras recargar; servicios y
búsqueda global todavía necesitan implementación de backend. El buscador de Leo
conserva su comportamiento de referencia y no se presenta como búsqueda real.

Validar contra Django/Supabase los roles/permisos, listado de borradores, CRUD y
persistencia, contacto/visitas, archivos multipart y URLs públicas, CORS, refresh y
expiración. Confirmar contenido real y datos institucionales. Video en esta versión
usa enlaces HTTPS de YouTube conforme a VideoReferenceField (no MP4/WebM).
No se consultó ni modificó la base de datos durante esta fase. Los informes de cada
rama conservan su evidencia histórica; este informe define la verificación conjunta.
