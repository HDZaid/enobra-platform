# Implementación frontend de Leo

## Alcance y Git

Se implementaron Inicio (`/`), Nosotros (`/nosotros`), Servicios (`/servicios`) y el layout público. El trabajo parte de `origin/frontend-dev`, commit `98cbe0ebc70c71cfd62aa304ee91bdd7eac07005`, después de ejecutar `git fetch origin`. El árbol inicial estaba limpio y la rama solicitada no existía.

Rama de trabajo: `feature/leo-frontend`. Cambios sin commit ni staging. No se hicieron commits, push, merge ni Pull Requests. No se modificaron otras ramas.

## Referencia visual

Se extrajo el ZIP fuera del repositorio, excluyendo su `.git`. Se revisaron las tres páginas HTML, CSS, `main.js`, `data.js`, `store.js`, imágenes y fuentes. El ZIP contiene conflictos sin resolver en `servicios.html` y `styles.css`. La captura proporcionada por el usuario es la referencia final: introducción «Una sola visión. De la idea a la obra», menú 01–04 y sección «Nuestro enfoque», junto con la navegación celeste. El menú de servicios permanece en el flujo del documento: no se fija ni se pega al navbar al desplazarse.

- Inicio: hero, propósito e historia, dos áreas de negocio, tres proyectos de ejemplo, dos noticias de ejemplo y cierre fotográfico.
- Nosotros: presentación completa, firma, misión, visión y cuatro principios.
- Servicios: introducción en dos columnas, menú 01–04 no fijo, sección Nuestro enfoque y cuatro bloques originales con fotografía superpuesta y alternada, número delineado, panel blanco, rótulos de etapa/alcance y enlaces subrayados. Nuestro enfoque y los primeros tres bloques comparten el fondo base #fbfaf7. Construcción recupera el fondo azul oscuro original (#12233f), con texto claro. Después se añade el bloque celeste «Experiencia en cada etapa de tu proyecto», su franja inferior y finalmente el footer, según la última captura del usuario.
- Layout: marca SVG original, menú con ruta activa, encabezado que cambia al desplazarse, buscador modal, pie institucional y botón para volver arriba.

Se conservaron textos, fotografías, fuentes locales Inter/Outfit, colores, composición, puntos de adaptación y efectos de hover/parallax. Las animaciones se implementan con React, IntersectionObserver y Web Animations, respetando la preferencia de movimiento reducido. No se trasladó el motor DOM ni el almacenamiento local del prototipo.

Se revisaron capturas completas de React en escritorio y móvil. La corrección final recupera la introducción y el índice de la captura, manteniendo el color celeste. Se verificaron los cuatro destinos, la salida del índice de la pantalla al bajar y la ausencia de desbordamiento entre 320 y 1440 px. Los avisos de estado de Servicios quedan después del listado para conservar el espaciado del mockup. Las diferencias intencionales son los avisos discretos de carga/referencia/error con reintento, las rutas SPA y el manejo accesible del diálogo. No se afirma equivalencia píxel a píxel. El manifiesto del encabezado usa la estructura compartida de Inicio/Nosotros para las tres páginas.

## Arquitectura y componentes

La organización sigue siendo feature-based: cada módulo tiene su página, contenido de referencia y, cuando corresponde, servicios HTTP y componentes. Los datos estáticos del mockup están identificados en `data/reference.js`; no se presentan como respuestas de Django.

Componentes compartidos: `Brand`, `Navbar`, `Header`, `Footer`, `SearchDialog`, `MotionPage`, `ParallaxImage` y `ContentStatus`. `useReferenceResource` administra carga, reintento, cancelación al desmontar y un límite de espera de 10 segundos. Los adaptadores validan la forma de la respuesta antes de renderizarla.

`SiteLayout` conserva `Outlet`. `leo.css` limita sus reglas a `.leo-page`, `.leo-chrome` y al contenedor público `.leo-site`; las fuentes y los keyframes tienen nombres propios. No se añadieron reglas a `base.css` y se conserva su import de Tailwind.

## API y pendientes

| Endpoint | Uso |
| --- | --- |
| `GET /api/v1/company/` | Marca y datos del pie; adaptador `companyService` |
| `GET /api/v1/institution/` | Presentación, firma, misión, visión y principios |
| `GET /api/v1/services/` | Lista de Servicios y servicios del buscador |
| `GET /api/v1/services/{service_id}/` | Adaptador de detalle listo y probado; no se inventó una nueva ruta de detalle |

Todos reutilizan `src/services/apiClient.js`. Se consultaron OpenAPI, serializers, campos de medios y vistas de Django. Las respuestas 501, errores de red, tiempo agotado y contratos inválidos muestran el contenido de referencia y permiten reintentar. Una lista vacía válida muestra un estado vacío, sin reponer servicios de ejemplo. No hay guardados simulados, autenticación nueva ni localStorage.

Pendientes y riesgos de integración:

1. No se verificó una instancia real de Django con persistencia. Las comprobaciones de UI usaron respuestas controladas de prueba; la aplicación mantiene las llamadas reales a `apiClient`.
2. Las vistas previas de Inicio y las entradas de proyectos, propiedades y noticias del buscador son ejemplos del ZIP. Deben sustituirse por datos reales en coordinación con sus responsables. Sus enlaces llevan a las rutas reservadas existentes, que actualmente muestran `PendingPage`.
3. Los enlaces de consulta conservan `?asunto=...`. La lectura del parámetro en Contacto corresponde a Jenny y no se implementó aquí.
4. Si la API devuelve imágenes `/media/...`, el servidor de despliegue debe servir/proxificar esa ruta. Vite conserva su proxy existente para `/api`; no se cambió su configuración.
5. Header, Footer, el espacio superior del layout y el favicon son cambios compartidos de presentación. Las páginas públicas futuras reciben ese marco, pero los estilos de contenido de Leo no se aplican a sus componentes.

## Archivos modificados

- `frontend/src/app/router.jsx`: únicamente se asignan páginas a las tres rutas de Leo, con el fallback original para las demás.
- `frontend/src/components/layout/SiteLayout.jsx`: composición pública y comportamiento de scroll.
- `frontend/index.html`: favicon original del mockup.

## Archivos nuevos

| Directorio | Archivos |
| --- | --- |
| `frontend/src/components/layout/` | `Brand.jsx`, `Navbar.jsx`, `Header.jsx`, `Footer.jsx`, `SearchDialog.jsx` |
| `frontend/src/components/layout/data/` | `reference.js`, `searchReference.js` |
| `frontend/src/components/layout/services/` | `companyService.js` |
| `frontend/src/components/ui/` | `ContentStatus.jsx`, `MotionPage.jsx`, `ParallaxImage.jsx`, `useReferenceResource.js`, `resourceValidation.js` |
| `frontend/src/features/home/pages/` | `HomePage.jsx` |
| `frontend/src/features/home/components/` | `HomeHero.jsx`, `HomeStory.jsx`, `BusinessAreas.jsx`, `PortfolioPreview.jsx`, `NewsPreview.jsx`, `HomeImpact.jsx`, `PreviewCards.jsx` |
| `frontend/src/features/home/data/` | `reference.js` |
| `frontend/src/features/about/pages/` | `AboutPage.jsx` |
| `frontend/src/features/about/data/` | `reference.js` |
| `frontend/src/features/about/services/` | `institutionService.js` |
| `frontend/src/features/services/pages/` | `ServicesPage.jsx` |
| `frontend/src/features/services/components/` | `ServiceFeature.jsx`, `ServiceIndex.jsx` |
| `frontend/src/features/services/data/` | `reference.js` |
| `frontend/src/features/services/services/` | `servicesService.js` |
| `frontend/src/styles/` | `leo.css` |
| `frontend/tests/` | `leoServices.test.mjs` |
| `frontend/public/assets/enobra/` | 23 recursos originales: fotografías, favicon, 8 fuentes TTF, sus licencias y `FUENTES.txt` |
| `docs/` | `leo-frontend.md` |

No se añadieron dependencias ni se cambiaron versiones, lockfile, scripts o configuración. Prettier se ejecutó temporalmente: existe configuración en el repositorio, pero no figura como dependencia de `package.json`.

## Verificaciones

| Verificación | Resultado |
| --- | --- |
| `npm ci` | Correcto; 285 paquetes, auditoría sin vulnerabilidades reportadas |
| `npm run lint` | Correcto, sin errores |
| `npm run test` | 9 pruebas correctas: 5 existentes y 4 nuevas |
| `npm run build` | Correcto con Vite 6, sin advertencias CSS |
| `git diff --check` | Correcto |
| Navegador | Edge headless; sin excepciones JavaScript |
| Responsive | Tres páginas a 320, 390, 768, 1024 y 1440 px, sin desbordamiento horizontal |
| Navegación | Cambio de ruta sin recarga de documento, buscador, menú móvil, Escape y devolución del foco |
| API en UI | 501 con referencia, reintento exitoso, empresa actualizada, catálogo vacío y respuesta inválida |
| Rutas reservadas | Las nueve rutas de Geo/Jenny, incluidos detalles y admin, conservan sus marcadores |

La instalación, el build y el navegador requirieron reintentos autorizados fuera del sandbox por restricciones de red/permisos. Las verificaciones finales sí se ejecutaron.

Se verificó mediante Git que `AdminLayout`, los módulos `news`, `contact`, `admin`, los servicios HTTP existentes, `routePaths`, `base.css`, los archivos de dependencias/configuración y el backend permanecen sin cambios respecto del commit de partida. Las rutas administrativas no reciben Header ni Footer públicos.
