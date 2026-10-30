# Estado del proyecto EnObra

> 29-oct: Geovanny descarta transferir el repo a una organización para la entrega.
> Producción: perfil y pruebas preparados; validación de URLs aplazada hasta el
> despliegue, mientras continúa el frontend. Véase [BE-14-produccion.md](BE-14-produccion.md).

> Seguimiento de Jenny: tareas de entrega y habilitación J-02 completas. Lista
> consolidada de cierres y únicos pendientes externos en [PENDIENTES-JENNIFER.md](PENDIENTES-JENNIFER.md).
> Las listas históricas de bloqueo por P-01/P-02 o botón apagado quedan sustituidas.

> Estado final del 29-oct: [limpieza diaria activa](P02-limpieza-activa.md) en GitHub Actions, gratuita para este repo público. Simulación y ejecución real aprobadas (0 publicaciones vencidas). P-02 y su automatización están completas. El pendiente de activar un Cron Job en Render que aparezca abajo es histórico y queda sustituido; no crear un servicio duplicado. Mantenimiento: Pablo, respaldo Juan.

> Estado vigente, 29-oct: [P-02 y papelera de 90 días](P02-papelera-90-dias.md). P-01 cerrado; función SQL antigua retirada de Supabase y ausencia verificada. La nueva limpieza corre desde el backend después de más de 90 días en papelera. Código y pruebas listos; falta activar/verificar el Cron Job en Render (Juan, respaldo Pablo). Los bloqueos anteriores por decidir P-01/P-02 y las políticas de inactividad de 3/8 meses quedan sustituidos. Jenny puede validar la habilitación del frontend con la versión integrada; no requiere otro OK de Henry.

> Acuerdo vigente del 29-oct: [responsables y cierres](responsables-y-cierres.md) sustituye las exclusividades y dependencias personales de Henry de este documento. Pablo puede integrar backend, modificar configuración y generar OpenAPI; Jenny integra frontend y Juan verifica despliegue, con los respaldos indicados. P-01 está cerrado. P-02 pasa a limpieza desde el backend tras más de 90 días en papelera; consultar su informe antes de dar por activada la ejecución automática.

> Actualización del 28 de octubre de 2026: P-01 integrado en `develop` (`7c6488f`) y roles reales creados. La matriz HTTP se repitió sobre Supabase: **70/70 aprobadas**; también se comprobaron menús, pantallas restringidas y guardado con foto desde los tres roles en Chromium. P-01 pasó editar/papelera/restaurar con un proyecto ficticio. [Informe y alcance](INT-04-supabase-2026-10-28.md). API y panel locales con base real; despliegue público, imágenes persistentes y P-02 continúan pendientes. Las cifras y estados del corte del 25-oct que siguen son históricos.

**Corte:** domingo 25 de octubre de 2026 (America/Guatemala) · **Rama:** `develop` en
`238fd1c` · **Responsable del documento:** Geo (INT-05).

Este es el documento vigente de estado. Reemplaza las cifras y los pendientes de los
reportes anteriores (sección 6), que se conservan como historia. Si algo aquí
contradice a otro documento, vale este hasta su próxima actualización.

## 1. Resumen

- **El panel administrativo del plan de entrega está completo e integrado en `develop`:**
  - Bienes Raíces: listado, alta, edición, publicación y papelera.
  - Proyectos: listado, alta y edición.
  - Noticias, Mensajes, Papelera, Historial, Roles y Usuarios.
  - Roles por datos con 32 permisos y la fábrica de publicaciones.
- **La integración ya está hecha:**
  - INT-01: frontend, Jennifer.
  - INT-02 e INT-03: backend y OpenAPI, Henry.
  - INT-04: matriz por rol, Geo y Leo. Los tres roles se comportan como dice
    `RBAC.md` en la API y en el panel ([INT-04-matriz-roles.md](INT-04-matriz-roles.md)).
- **Sin validar todavía:** la base real de Supabase con estos roles, el almacenamiento
  definitivo de imágenes y el despliegue. Eso es del lunes 26 y martes 27.
- **Riesgo principal para la demo:** la sesión del panel vence a los 15 minutos y el
  frontend no la renueva (CF-03, sección 4).

## 2. Ramas

| Rama | Estado |
|---|---|
| `develop` | Integración vigente (`238fd1c`). Contiene todo `frontend-dev` (`1ecb60a`) y todo `backend-dev`. |
| `backend-dev` | Igual a `develop` (`238fd1c`). |
| `frontend-dev` | En `1ecb60a`, ancestro de `develop`. Antes de seguir trabajando: `git merge origin/develop`. |
| `main` | Sin cambios. No recibe la entrega hasta el despliegue. |

No quedan ramas alternas. `feature/Tareas-Leo` ya se retiró. PR #13 y #14 están
fusionados.

## 3. Pruebas (cifras vigentes)

Los documentos anteriores citan 33, 38, 47, 57, 76 u 84 pruebas. Esas cifras eran
correctas en su fecha; **las actuales son estas**:

| Qué | Resultado sobre `238fd1c` |
|---|---|
| Backend `manage.py test tests --settings=config.test_settings` | **189 pruebas, OK**; `manage.py check` sin incidencias |
| Frontend `npm run lint` · `npm test` · `npm run build` | Lint OK · **181 pruebas, OK** · build OK (aviso de bundle de 533 kB, no bloquea) |
| Matriz por rol contra la API (`backend/scripts/matriz_roles.py`) | **70 de 70** |
| Colección Postman RBAC (Newman 6.1.3) | **55 peticiones, 72 aserciones, 0 fallos** |
| Panel en Chromium contra la API real, 3 roles | Menús, formularios, papelera, historial y accesos correctos; 0 errores de consola |

Todas sobre SQLite aislada y almacenamiento local. **Ninguna prueba toca Supabase.**

## 4. Pendientes y hallazgos abiertos

| ID | Prioridad | Qué | Dueño | Para cuándo |
|---|---|---|---|---|
| CF-03 | **P1** | El access token dura 15 min y el frontend nunca llama a `auth/refresh/`. Al vencer, guardar responde 401 y se pierde lo escrito en el formulario. Mitigación para la demo: volver a iniciar sesión antes de cada recorrido largo. | Jennifer (sesión, FE-06) | Lunes, antes de la demo |
| INT-04/H4 | P1 | Papelera de proyectos **apagada en el frontend** (`PROJECT_TRASH_ENABLED = false`). En el backend integrado ya funciona: `DELETE` → papelera → restaurar, y queda publicada otra vez (verificado el 25-oct). Falta activarla y probarla en la pantalla. | Jennifer (FE-07) | Lunes |
| INT-04/H1 | P2 | Con sesión, un Empleado solo ve **sus** propiedades en el panel, también las publicadas, y no las de otros. Decidir si es lo deseado y documentarlo en `RBAC.md`. | Henry con Juan | Lunes |
| INT-04/H2 | P3 | En Historial, las subidas de imágenes muestran "None" en Registro (`audit()` en `persistence/support.py`). Arreglo de una línea. | Juan (BE-07) | Lunes |
| ADM-01 | P2 | Borrar una imagen (`DELETE admin/media/{id}/`, solo con `media.delete`) no comprueba si alguna publicación la sigue usando. | Backend | Backlog |
| CF-08 / BE-22 | P3 | El filtro publicada/borrador y la búsqueda de Proyectos se aplican en el cliente, sobre la página cargada (con aviso). | Backend + frontend | Backlog |
| BE-04 | P2 | La función de Supabase `limpiar_proyectos_inactivos()` podría borrar proyectos que están en la papelera. Ver [BE-04-compatibilidad-limpieza-supabase.md](BE-04-compatibilidad-limpieza-supabase.md). | Juan | Antes de usar la papelera en la base real |
| DESP | P1 | Despliegue y prueba de humo en la URL real con los tres roles. Las imágenes guardadas en disco local (`/media/...`) no sobreviven al despliegue. | Equipo | Lunes 26 – martes 27 |
| DATOS | P1 | Cargar roles y cuentas reales en Supabase: `seed_access_control` sin `--sync`, más una cuenta por rol. Solo así la matriz de INT-04 vale para la base real. | Henry | Lunes |

**Resueltos desde los reportes anteriores:**

| ID | Resuelto por | Evidencia |
|---|---|---|
| CF-01 | Login con roles reales | Corregido en octubre |
| CF-02 | INT-03 | OpenAPI regenerado y validado |
| CF-04 | Kit de Leo | `apiErrors.js` distingue 401 ("sesión venció") de 403 ("sin permiso") |
| CF-05, ADM-03 | Límite de correo | 150 caracteres en ambos lados |
| CF-06 | BE-01 | `media.upload` en los tres roles; INT-04 subió con cada uno (201) |
| CF-07 | FE-07, FE-12, FE-13, FE-14 | Errores por campo en los formularios nuevos |
| ADM-02 | BE-06a | Límites numéricos de propiedades validados |
| CF-09 | FE-02, FE-07, FE-11, FE-12 | Las pantallas de propiedades, proyectos y papelera consumen sus contratos |

## 5. Tareas del plan de entrega

Estado verificado en `develop` por su commit, no solo por la casilla del issue.

| Persona | Hecho | Pendiente |
|---|---|---|
| Henry | BE-00 (stubs), BE-01, BE-02, BE-03, BE-05, BE-11, INT-02, INT-03 | H1 (decisión) y carga de datos reales |
| Juan | BE-04, BE-07, BE-09, BE-10, BE-12 | H2; respaldo de la base antes de tocar Supabase |
| Pablo | BE-06a/b, BE-08, BE-13 (en `usuarios-api.md`), FE-13, FE-14 | — |
| Leo | FE-01a/b, FE-02, FE-03 | Repetir con Geo el recorrido de INT-04 sobre la base real |
| Jennifer | FE-06, FE-07, FE-10, INT-01 | CF-03 y activar la papelera de proyectos |
| Geo | BE-00 y BE-04 (cierre), FE-11, FE-12, INT-04, INT-05 | — |

Backlog sin cambios: BE-14 a BE-22 y FE-04, FE-05, FE-08, FE-09 y FE-15
(`plan/PLAN-MAESTRO.md`).

## 6. Documentos

| Documento | Uso |
|---|---|
| **Este documento** | Estado vigente |
| [INT-04-matriz-roles.md](INT-04-matriz-roles.md) | Qué puede cada rol, probado |
| [RBAC.md](RBAC.md), [arquitectura.md](arquitectura.md), [papelera.md](papelera.md), [auditoria.md](auditoria.md), [usuarios-api.md](usuarios-api.md), [openapi.yaml](openapi.yaml) | Referencia vigente |
| [plan/](plan/) | Plan de entrega y tablero |
| [INT-01-integracion-frontend.md](INT-01-integracion-frontend.md) | Integración del frontend (24-oct) |
| [estado-ramas.md](estado-ramas.md), [integracion-backend-frontend.md](integracion-backend-frontend.md), [frontend-integration.md](frontend-integration.md), [reporte-revision-admin.md](reporte-revision-admin.md), [reporte-contratos-frontend.md](reporte-contratos-frontend.md) | **Históricos** (12–21 de octubre). Sus cifras de pruebas y sus pendientes se actualizan aquí. |

## Decisiones posteriores — issue #17

Para sesión y papelera, consultar [decisiones de Jennifer](decisiones-jennifer-issue-17.md).
J-01 adopta reingreso para la demo, con aviso en el panel; la renovación automática
no se da por implementada. J-02 mantiene la papelera de Proyectos desactivada hasta
resolver P-01 antes de usar Supabase. J-03 y J-04 conservan las propuestas del issue.

## Seguimiento de Jennifer

Ver [cierre de tareas disponibles y pendientes por responsable](PENDIENTES-JENNIFER.md)
y el [recorrido preparado de demo](demo/recorrido-jennifer.md). Las pruebas nuevas
son locales; las condiciones de J-01 a J-04 siguen vigentes y P-01 no se certifica
como cerrado. El cierre funcional sobre Supabase permanece pendiente.

## Revalidación de Jennifer tras P-01

Frontend-dev sincronizada con develop `8dc4016`. Check y 191 pruebas backend,
lint/181 pruebas/build frontend y Chromium con Django/SQLite temporal aprobados.
Se verificaron creación, edición y restauración de Proyectos; las pruebas backend
cubren reinicio de marcas y rollback. La evidencia de Supabase del equipo está en
[INT-04 Supabase](INT-04-supabase-2026-10-28.md), no en las pruebas locales nuevas.
P-01 ya está integrado. El bloqueo para activar papelera sobre Supabase es **P-02**,
control de la función SQL y sus invocadores; la constante continúa false.
La tabla histórica anterior y los reportes iniciales no sustituyen este seguimiento.
Responsables y solicitudes en [pendientes de Jennifer](PENDIENTES-JENNIFER.md).

## Cierre de habilitación frontend J-02

Tras el cierre P-01/P-02 acreditado en `docs/P02-limpieza-activa.md`, se habilitó
PROJECT_TRASH_ENABLED. Verificados envío y restauración desde UI con proyectos
publicados/borradores, imágenes y slug conservados. Lint, 182 pruebas frontend,
build y 27 pruebas backend de papelera/retención aprobados; Chromium sobre
Django/SQLite desechables. Sin escrituras a Supabase ni despliegue web nuevo.
Los textos anteriores que mantienen J-02 bloqueado quedan como antecedentes.
La revisión en URL desplegada sigue con Geovanny/Leo, Jenny como respaldo y Juan
para API/despliegue (Pablo de respaldo). No se modificó la automatización activa.
