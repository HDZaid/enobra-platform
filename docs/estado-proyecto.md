# Estado del proyecto EnObra

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
| `develop` | Integración vigente (`9b2f69a`: `238fd1c` + INT-04 + INT-05). Contiene todo `frontend-dev` (`1ecb60a`) y todo `backend-dev`. |
| `backend-dev` | Igual a `develop` (`238fd1c`). |
| `frontend-dev` | En `1ecb60a`, ancestro de `develop`. Antes de seguir trabajando: `git merge origin/develop`. |
| `main` | Sin cambios. No recibe la entrega hasta el despliegue. |
| `despliegue/cloudinary` | `develop` + configuración de despliegue (Render, Cloudinary, Resend, Cloudflare Pages) + cierres de RBAC y H2 del 25-oct + limpieza de documentación. Se integra a `develop` y `main` al desplegar. |
| `despliegue/r2` | Por crear desde `despliegue/cloudinary`, con imágenes en Cloudflare R2. |

No quedan ramas alternas de trabajo diario. `feature/Tareas-Leo` ya se retiró. PR #13 y #14 están
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
| BE-04 SQL | P2 | Umbral de inactividad de `limpiar_proyectos_inactivos()`: la solicitud de pasar de 3 a 8 meses sigue **sin aplicar**. Requiere acuerdo de Henry, Juan y el Ingeniero y autorización sobre Supabase ([papelera.md](papelera.md)). | Juan con Henry | Antes de usar la papelera en la base real |
| ADM-01 | P2 | Borrar una imagen (`DELETE admin/media/{id}/`, solo con `media.delete`) no comprueba si alguna publicación la sigue usando. | Backend | Backlog |
| CF-08 / BE-22 | P3 | El filtro publicada/borrador y la búsqueda de Proyectos se aplican en el cliente, sobre la página cargada (con aviso). | Backend + frontend | Backlog |
| BE-04 | P2 | La función de Supabase `limpiar_proyectos_inactivos()` podría borrar proyectos que están en la papelera. Ver [BE-04-compatibilidad-limpieza-supabase.md](BE-04-compatibilidad-limpieza-supabase.md). | Juan | Antes de usar la papelera en la base real |
| DESP | P1 | Despliegue y prueba de humo en la URL real con los tres roles. Las imágenes guardadas en disco local (`/media/...`) no sobreviven al despliegue. | Equipo | Lunes 26 – martes 27 |
| DATOS | P1 | Cargar roles y cuentas reales en Supabase: `seed_access_control` sin `--sync`, más una cuenta por rol. Solo así la matriz de INT-04 vale para la base real. | Henry | Lunes |

**Cerrados el 25-oct (noche), rama `despliegue/cloudinary`:**

| ID | Qué se hizo |
|---|---|
| RBAC límite 1 | `POST admin/users/` pide `users.manage` y el rol asignado no puede superar los permisos de quien crea la cuenta (`403`). El formulario solo ofrece los roles asignables. |
| RBAC límite 3 | `roles.manage` ya no otorga permisos que no posee, al crear un rol ni al agregar permisos a uno existente (también el propio). Pruebas en `tests/test_privilege_escalation.py`. |
| RBAC límites 2, 4 y INT-04/H1 | Decisión: se mantienen como están y quedan escritos en [RBAC.md](RBAC.md#decisiones-pendientes-y-límites-conocidos). El Empleado sigue viendo solo sus propiedades en el panel. |
| INT-04/H2 | Historial ya no escribe "None" para subidas de imágenes (`audit()` en `persistence/support.py`). |

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
| Henry | BE-00 (stubs), BE-01, BE-02, BE-03, BE-05, BE-11, INT-02, INT-03 | Carga de datos reales; umbral de la limpieza SQL |
| Juan | BE-04, BE-07, BE-09, BE-10, BE-12 | Función SQL de limpieza y respaldo de la base antes de tocar Supabase |
| Pablo | BE-06a/b, BE-08, BE-13 (en `usuarios-api.md`), FE-13, FE-14 | — |
| Leo | FE-01a/b, FE-02, FE-03 | Repetir con Geo el recorrido de INT-04 sobre la base real |
| Jennifer | FE-06, FE-07, FE-10, INT-01 | CF-03 y activar la papelera de proyectos |
| Geo | BE-00 y BE-04 (cierre), FE-11, FE-12, INT-04, INT-05 | — |

Backlog sin cambios: BE-14 a BE-22 y FE-04, FE-05, FE-08, FE-09 y FE-15
(`plan/PLAN-MAESTRO.md`).

## 6. Documentos

Índice completo en [README.md](README.md). Los informes por etapa y por rama de octubre
(`estado-ramas.md`, `frontend-integration.md`, `integracion-backend-frontend.md`,
`reporte-revision-admin.md`, `reporte-contratos-frontend.md`, `INT-01-integracion-frontend.md`,
`geo-frontend.md`, `leo-frontend.md`, `usuarios-frontend.md`, `probar-admin.md`,
`infraestructura.md` y los `frontend/ADMIN-*`, `NEWS-*` y `CONTACTO-*`) **se retiraron el
25-oct** en `despliegue/cloudinary`: sus cifras y pendientes ya están aquí y siguen en el
historial de Git (`git log --all -- <ruta>`).
