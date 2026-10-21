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
