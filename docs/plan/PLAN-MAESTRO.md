# EnObra Platform: Plan maestro hacia la entrega del 25 de octubre

> **Documentos del plan:** este archivo (maestro) + [`PLAN-BACKEND.md`](PLAN-BACKEND.md) + [`PLAN-FRONTEND.md`](PLAN-FRONTEND.md).
> **Base:** la auditoría `auditoria-enobra-platform.md` (los códigos `§` remiten a ella) y el historial real de `git` (43 commits, 5–21 de octubre de 2026).
> **Estado:** borrador generado el jue 22-oct-2026 (22:51, Guatemala). Todo lo marcado **(confirmar)** es una suposición con valor por defecto, no una decisión tomada.

---

## 1. Cómo usar este plan (con cualquier agente)

El plan está escrito para que **cualquier persona, con cualquier agente de IA, tome una tarea y la ejecute sin leer el resto**. Por eso:

- Cada tarea es una **ficha autónoma** (`BE-xx` / `FE-xx` / `INT-xx`) con: objetivo, qué leer, qué archivos puede editar, qué NO tocar, contrato de API, criterio de "hecho" y comandos de verificación.
- **La persona asignada y el agente son campos distintos.** Para reasignar una tarea solo se cambia el campo `Responsable` en la ficha y en el tablero (sección 12); el cuerpo de la ficha no cambia.
- Cada ficha lleva un **tipo de trabajo** para elegir el agente que mejor encaje:

| Tipo | Significa | Ejemplos |
|---|---|---|
| **M** | Mecánico: CRUD, pruebas, tareas bien acotadas | endpoints de lectura, serializers |
| **D** | Diseño: decisiones de arquitectura, refactor delicado | fábrica de publicaciones |
| **U** | UI compleja: formularios, estados, accesibilidad | formulario de propiedades |
| **Q** | Revisión, QA y documentación | pruebas por rol, `.md` |

- Todo agente debe leer primero `AGENTS.md` y `docs/TRABAJO-EN-EQUIPO.md` (el repo ya los tiene). El **prompt base** para pegar a cualquier agente está en la sección 10.

---

## 2. Calendario y hitos

Hoy es **jueves 22**. La entrega es el **domingo 25**; el lunes 26 y martes 27 son solo para afinar. Quedan **dos días completos de construcción** (viernes y sábado) y un tercero para integrar.

| Hito | Cuándo | Qué se logra | Salida verificable |
|---|---|---|---|
| **H0. Contratos** | Vie 23, mañana (≤ 2 h) | Contratos de API nuevos publicados como "stub", nombres de los 32 permisos congelados, esqueleto de rutas del panel y contrato de componentes UI | `docs/openapi.yaml` con los endpoints nuevos; permisos listados en la sección 6 |
| **H1. Base** | Vie 23 | RBAC extendido, papelera genérica, kit de estados de carga, navegación por permisos, listado de propiedades | `manage.py test` y `npm test` en verde; kit UI publicado en `frontend-dev` |
| **H2. Pantallas** | Sáb 24 | Todas las pantallas conectadas a la API real (propiedades, proyectos, papelera, historial, roles) y endpoints de historial, usuarios y notificaciones | Recorrido completo con el rol Ingeniero |
| **H3. Cierre** | Dom 25 | Integración en `develop`, pruebas cruzadas por rol (Ingeniero, Arquitecta, Empleado), documentación, OpenAPI regenerado | **Entrega** |
| **H4. Afinar** | Lun 26 y mar 27 | Pendientes P1 de la sección 8, pulido visual, endurecimiento de producción | Versión final |

**Corte diario sugerido (confirmar):** cada persona actualiza su estado en el tablero (sección 12) y publica en su rama compartida antes de las 21:00 del viernes y del sábado, para que el domingo se integre sobre código ya sincronizado.

---

## 3. Equipo: qué tocó cada quien y qué le toca

Seis participantes. El mapeo sale de `git log --all --no-merges` (autor × carpetas tocadas). Jennifer aparece con dos identidades de Git (confirmado).

| Persona | Identidad(es) Git | Commits* | Qué tocó (patrón) | Rol en este plan |
|---|---|---|---|---|
| **Leo** | María Leonor Rosales | 2 | Sitio público: Inicio, Nosotros, Servicios; `components/layout`; assets | **Frontend: kit de UI compartido, Papelera, Historial** |
| **Geo** (tú) | Geovanny Alcon (`g4usSi`) | 6 | Reestructura del monorepo, `docs/` (reglas, infraestructura, Postman), `features/projects` y `features/properties` públicos | **Frontend: Bienes Raíces admin; QA por rol y documentación de estado** |
| **Jennifer** | Jeidy/Jennifer Saquic (`Jeidy25Saquic`) + Jennifer Tecum | 18 | Noticias, Contacto, base del panel admin y autenticación del cliente, integración de ramas, reglas de equipo | **Frontend: navegación/permisos, Proyectos admin, Mensajes; integra `frontend-dev`** |
| **Henry** | Henry Díaz (`HDZaid`) | 8 | Contratos iniciales de la API, **RBAC y permisos**, login por roles, diagnóstico de BD | **Backend: permisos, fábrica de publicaciones, arquitectura, contratos** |
| **Juan** | JuanPastor | 2 | **Modelos y conexión a la base de datos** (`persistence/models`) | **Backend: datos, papelera, historial, notificaciones** |
| **Pablo** | José Pablo Zuñiga (`PabloZ7-425`) | 7 | **Backend del panel admin** (JWT, repositorios, medios, noticias, empresa) y **usuarios** (backend + pantalla) | **Backend: usuarios y calidad; Frontend: Roles y Usuarios** |

\* Commits de cada persona en todas las ramas, incluidos sus merges. Suman los 43 del repositorio. Pocos commits grandes (ej. los 36 archivos del backend admin de Pablo) pesan más que muchos pequeños, por eso el reparto mira las carpetas tocadas y no solo el conteo.

**Criterio de reparto (patrón + balance moderado):**
- Cada tarea va a quien ya conoce esa parte del código. Ej.: permisos → Henry, que escribió `access_control.py` y el RBAC; modelos y datos → Juan; usuarios → Pablo, que creó el backend y la pantalla de usuarios; formularios con subida de imágenes → Jennifer, que hizo el editor de noticias.
- Para equilibrar: Juan toma el historial y las notificaciones (antes eran de Pablo), Leo toma Papelera e Historial en la UI (no tenía tareas de admin) y Jennifer toma Proyectos admin en lugar de Geo.
- **Regla de equipo respetada:** Juan y Henry **no** tocan `frontend/`. Pablo sí puede, solo en `frontend-dev`, coordinado con Jennifer y con commits separados de los de backend.

**Carga estimada (horas con agente; capacidad supuesta ≈ 7 h/día, confirmar):**

| Persona | Viernes + sábado | Domingo | Total |
|---|---|---|---|
| Henry | 14 | 3 | ~15–17 |
| Juan | 13 | 1.5 | ~14 |
| Pablo | 14 | 0.5 | ~14.5 |
| Leo | 13 | 2 | ~15 |
| Jennifer | 10 | 3 | ~13 |
| Geo | 12 | 3 | ~15 |

El total (~86 h) queda a la par de 6 × 2 días × 7 h = 84 h: **sin holgura**. Por eso existe el plan de recorte de la sección 8 y el domingo se reserva para integrar, no para tareas nuevas.

### Agenda por persona

| Día | Henry | Juan | Pablo | Leo | Jennifer | Geo |
|---|---|---|---|---|---|---|
| **Vie 23** | BE-00, BE-01, BE-02 | BE-10, BE-04 | BE-06a, BE-08, inicio FE-13 | FE-01a, FE-01b | FE-06 (primero), FE-10, inicio FE-07 | FE-11 |
| **Sáb 24** | BE-03, BE-05 | BE-07, BE-09 | BE-06b, fin FE-13, FE-14 | FE-02, FE-03 | fin FE-07 | FE-12 |
| **Dom 25** | BE-11, INT-02, INT-03 | BE-12 | BE-13 | QA en pareja con Geo | INT-01 | INT-04, INT-05 |

---

## 4. Reglas de trabajo (resumen de `docs/TRABAJO-EN-EQUIPO.md`)

- **Una rama compartida por área:** `frontend-dev` (Leo, Geo, Jennifer) y `backend-dev` (Juan, Pablo, Henry). No crear ramas alternas. `develop` integra; `main` solo versiones estables.
- **Antes de empezar y antes de publicar:** árbol limpio, `git fetch --prune`, leer `git log HEAD..origin/<rama>` y el diff, hacer merge con mensaje convencional. Nunca `push --force`, `rebase` de ramas compartidas ni `reset --hard`.
- **Commits convencionales:** `feat(backend): …`, `feat(frontend): …`, `test(...)`, `docs(...)`, `merge(...)`.
- **Hooks:** `git config core.hooksPath .githooks` en cada clon.
- **Aviso sobre los fines de línea:** al revisar el repositorio, 37 archivos figuran como modificados solo por CRLF. Antes de publicar, ejecutar `git diff --stat` y no commitear archivos que no se tocaron.
- **Comprobaciones antes de cada push:**
  - Backend (desde `backend/`): `python manage.py check` y `python manage.py test tests --settings=config.test_settings`.
  - Frontend (desde la raíz): `npm --prefix frontend run lint`, `npm --prefix frontend run test`, `npm --prefix frontend run build`.

### Zonas de conflicto y responsable de cada archivo compartido

Como todos trabajan en la misma rama, estos archivos son donde chocan los cambios. **Solo el responsable los edita; los demás le piden el cambio o lo coordinan antes.**

| Archivo(s) | Responsable | Por qué |
|---|---|---|
| `backend/config/settings.py`, `config/urls.py`, `config/bindings.py` | **Henry** | Cada módulo nuevo se registra ahí |
| `backend/apps/accounts/access_policy.py` | **Henry** | Catálogo de permisos y roles |
| `backend/persistence/catalog.py` | **Juan** (BE-04), luego Henry (BE-05) | Papelera genérica y fábrica tocan el mismo archivo; **orden fijo** |
| `docs/openapi.yaml` | **Henry (solo él lo regenera)** | Es un archivo generado; si varios lo editan, siempre hay conflicto |
| `frontend/src/app/router.jsx`, `routePaths.js` | **Jennifer** | Rutas del panel |
| `frontend/src/features/admin/components/AdminShell.jsx`, `utils/adminData.js`, `components/layout/AdminLayout.jsx` | **Jennifer** | Menú y permisos |
| `frontend/src/services/apiClient.js`, `package.json` | **Jennifer** | Cliente HTTP y dependencias compartidas |
| `frontend/src/components/ui/*` | **Leo** | Kit de componentes |

---

## 5. Dependencias: quién espera a quién

| Tarea que espera | Necesita | Cómo se evita el bloqueo |
|---|---|---|
| FE-02 Papelera (Leo) | BE-04 (Juan) para proyectos | La parte de propiedades ya existe en la API; se construye primero |
| FE-03 Historial (Leo) | BE-07 (Juan) | Se desarrolla contra el contrato del H0 y datos de ejemplo; se conecta el sábado a mediodía |
| FE-07, FE-11, FE-12 (formularios) | FE-01b (Leo): subida de imágenes | Leo publica la versión de props definida en `PLAN-FRONTEND.md` el viernes por la tarde |
| FE-07, FE-11, FE-12 con rol Arquitecta/Empleado | BE-02 (Henry) | Se prueban primero con Ingeniero; con otros roles el sábado por la tarde |
| FE-13 Roles (Pablo) | nada nuevo | La API de roles ya existe |
| FE-14 Usuarios (Pablo) | BE-08 (Pablo) | Es la misma persona |
| BE-05 Fábrica (Henry) | BE-04 (Juan) | **Juan termina BE-04 el viernes**; Henry arranca BE-05 el sábado |
| Todas las pantallas | FE-06 (Jennifer): rutas y menú | Jennifer publica el esqueleto de rutas el viernes antes de las 11:00 |

---

## 6. Contratos que se congelan en el H0

### 6.1 Los 32 permisos (nombres congelados)

Los 12 primeros ya existen en `access_policy.py`; **no se renombran**.

| Grupo | Permisos |
|---|---|
| Plataforma (existen) | `admin.all`, `users.manage`, `roles.manage`, `audit.read` |
| Bienes Raíces (existen) | `properties.create`, `properties.edit.any`, `properties.edit.own`, `properties.publish`, `properties.trash.any`, `properties.trash.own`, `properties.restore`, `properties.delete_permanently` |
| **Proyectos (nuevos)** | `projects.create`, `projects.edit.any`, `projects.edit.own`, `projects.publish`, `projects.trash.any`, `projects.trash.own`, `projects.restore`, `projects.delete_permanently` |
| **Noticias (nuevos)** | `news.create`, `news.edit`, `news.publish`, `news.delete` |
| **Mensajes (nuevos)** | `inquiries.read`, `inquiries.manage` |
| **Medios (nuevos)** | `media.upload`, `media.delete` |
| **Empresa (nuevo)** | `company.edit` |
| **Complementos (nuevos)** | `users.read`, `roles.read`, `audit.export` |

### 6.2 Endpoints nuevos o modificados (se publican como stub en H0)

| Endpoint | Cambio | Permiso | Tarea |
|---|---|---|---|
| `GET /api/v1/admin/audit/` | Nuevo. Filtros: `page`, `page_size`, `user_id`, `module`, `action`, `date_from`, `date_to`, `q`. Respuesta paginada con `id`, `user {id,name}`, `action`, `module`, `record_id`, `record_name`, `description`, `date` | `audit.read` | BE-07 |
| `GET /api/v1/admin/audit/export/` | Nuevo. Mismos filtros; devuelve CSV | `audit.export` | BE-07 |
| `GET /api/v1/admin/trash/?type=properties\|projects` | Nuevo. Lista unificada: `type`, `id`, `title`, `trashed_at`, `trashed_by`, `trashed_by_name`, `was_published`, `owner_id` | `*.trash.*`, `*.restore` o `*.delete_permanently` del tipo | BE-04 |
| `DELETE /api/v1/projects/{slug}/` | **Cambia:** envía a papelera en lugar de borrar | `projects.trash.any/own` | BE-04 |
| `GET /api/v1/admin/projects/trash/`, `POST …/{slug}/restore/`, `DELETE …/{slug}/permanent/` | Nuevos (espejo de propiedades) | `projects.restore`, `projects.delete_permanently` | BE-04 |
| `PATCH /api/v1/admin/users/{id}/` | Nuevo. Cuerpo: `name?`, `active?` | `users.manage` | BE-08 |
| `PUT /api/v1/admin/users/{id}/role/` | Nuevo. Cuerpo: `role_id` | `users.manage` | BE-08 |
| `POST /api/v1/admin/media/` | **Cambia el permiso:** `admin.all` → `media.upload` | `media.upload` | BE-02 |
| `GET /api/v1/auth/me/` | Sin cambio; ya devuelve `permissions` | n/a | n/a |

---

## 7. Decisiones abiertas (con valor por defecto para no bloquear)

Cada una se ejecuta con el valor por defecto **a menos que el ingeniero indique otra cosa**. Si cambia, solo se ajustan las fichas indicadas.

| ID | Decisión | Valor por defecto | Afecta | ¿Quién decide? |
|---|---|---|---|---|
| DEC-01 | Nombres y número de permisos | Los 32 de la sección 6.1 | BE-01, FE-06, FE-13 | Ingeniero |
| DEC-02 | ¿El seed pisa los roles editados desde la interfaz? | **No.** El seed solo crea lo que falta; reconciliar requiere el flag `--sync` | BE-03 | Henry |
| DEC-03 | Dónde guardar la sesión del panel (hoy solo en memoria) | `sessionStorage` solo para el refresh token; **después de la entrega** | FE-08 (backlog) | Ingeniero + Jennifer |
| DEC-04 | ¿Noticias va a papelera? | **No** por ahora: borrado definitivo con confirmación | BE-04 | Ingeniero |
| DEC-05 | Papelera de Proyectos: ¿columnas nativas o el mecanismo actual? | Mecanismo actual (JSON en `contenido_pagina`), sin cambios de esquema. Columnas nativas y `estado_limpieza` quedan para después y requieren aprobación sobre Supabase | BE-04 | Ingeniero + Juan |
| DEC-06 | Alcance del "Disparador" | **Confirmado: notificar por correo** al recibir una consulta. WhatsApp queda en backlog (requiere credenciales) | BE-09 | Resuelta |
| DEC-07 | ¿Proyectos distingue propio/cualquiera como Propiedades? | **Sí** (espejo de propiedades) | BE-01 | Ingeniero |
| DEC-08 | Permisos de Arquitecta/Empleado sobre Proyectos y Mensajes | **Ninguno** por ahora; sí reciben `media.upload` | BE-01 | Ingeniero |
| DEC-09 | Almacenamiento de imágenes | Disco local para la entrega; almacenamiento persistente antes de producción | Backlog | Ingeniero |
| DEC-10 | Quién integra a `develop` | Jennifer (front) y Henry (back) | INT-01, INT-02 | Equipo |

---

## 8. Alcance: qué entra y qué no

### Dentro de la entrega (P0)
Todo lo que pidieron al inicio: **fábrica abstracta escalable en el backend, documentación, subir publicaciones (Bienes Raíces y Proyectos por separado), edición, papelera, historial para administrador, roles y permisos, estados de carga y el disparador de consultas.**

### Fuera de la entrega (backlog para el 26–27 o después)
| Elemento | Motivo | Tarea |
|---|---|---|
| Endurecer producción (`SECRET_KEY`, `DEBUG`, HTTPS, CORS) | No bloquea la demo; sí el despliegue | BE-14 |
| Restablecer contraseña / cambiar la propia | No está en la lista original | BE-15 |
| Evitar borrar medios en uso (ADM-01) | Riesgo conocido, no bloqueante | BE-16 |
| Servicios y Búsqueda (hoy 501) | Siguen con contenido de referencia | BE-17 |
| Almacenamiento persistente de imágenes | Depende de DEC-09 | BE-18 |
| Auditoría con valores antes/después | Mejora de la v1 | BE-19 |
| Columnas nativas de papelera y `estado_limpieza` | Requiere aprobación sobre Supabase | BE-20 |
| Notificación por WhatsApp | Requiere credenciales | BE-21 |
| Filtro `published` en el listado de propiedades/proyectos | El front filtra en cliente mientras tanto | BE-22 |
| Sesión persistente y refresh automático | DEC-03 | FE-08 |
| Contenido institucional (empresa y Nosotros) | No está en la lista original | FE-09 |
| Páginas 403/404 del panel | Pulido | FE-04 |
| Servicios/Búsqueda públicos con API real | Depende de BE-17 | FE-05 |

### Plan de recorte (si el sábado a las 18:00 vamos atrasados)
Se corta **en este orden**, sin discutir:

1. Exportar CSV del historial (`audit.export`).
2. Acciones masivas y "vaciar papelera".
3. Duplicar rol y buscador de la matriz de permisos.
4. Aplicar la fábrica a las vistas existentes (queda solo en el código nuevo).
5. Pantalla de cambio de rol en usuarios (queda solo vía API y Postman).
6. Pasos del formulario: se reduce a un formulario de una página.

---

## 9. Cobertura de lo que pidieron al inicio

| Requerimiento original | Tareas | Estado del código hoy |
|---|---|---|
| Abstract Factory, backend escalable | BE-03, BE-05 | No existe |
| Documentación (.md) | BE-11, BE-12, BE-13, INT-04 | Hay reportes sueltos; falta referencia |
| Subir publicaciones: Bienes Raíces | FE-11, FE-12 | API lista, sin pantalla |
| Subir publicaciones: Proyectos | FE-07 | API lista (solo `admin.all`), sin pantalla |
| Mostrar historial (administrador) | BE-07, FE-03 | Se escribe, no se lee |
| Roles y permisos | BE-01, BE-02, BE-03, BE-08, FE-06, FE-13, FE-14 | API de roles lista; faltan permisos y pantalla |
| Edición de publicaciones | FE-12 (propiedades), FE-07 (proyectos) | API lista |
| Papelera de publicaciones | BE-04, FE-02 | Solo propiedades |
| Estados de carga | FE-01a, FE-01b | Solo texto "Cargando…" |
| Disparador: consulta (backend) | BE-09 | No existe |

---

## 10. Adaptación a distintos agentes

### 10.1 Prompt base (pegar a cualquier agente, completando lo marcado)

```text
Eres un asistente de desarrollo en el repositorio EnObra Platform
(Django + DRF en backend/, React + Vite + Tailwind en frontend/).

1. Lee primero AGENTS.md y docs/TRABAJO-EN-EQUIPO.md y respétalos.
2. Tu tarea es la ficha <ID> del archivo <PLAN-BACKEND.md | PLAN-FRONTEND.md>.
   Léela completa. Solo puedes editar los archivos de "Puede editar".
   Lo de "No tocar / coordinar" requiere avisar a su responsable antes.
3. Rama: <backend-dev | frontend-dev>. No crees ramas. Antes de empezar:
   git status, git fetch --prune, revisa git log y git diff de HEAD..origin/<rama>,
   y haz merge. Nunca uses push --force, rebase de la rama compartida ni reset --hard.
4. Trabaja en cambios pequeños. Commits convencionales (tipo(alcance): descripción).
5. No inventes endpoints ni campos: usa docs/openapi.yaml y los contratos de la
   ficha. Si el backend responde 501, muestra el error en la interfaz; no simules éxito.
6. No incluyas secretos, claves ni credenciales en código, docs o commits.
7. Termina cuando se cumpla "Hecho cuando" y pasen las comprobaciones de
   "Verificación". Si algo es ambiguo o te bloquea, detente y pregunta
   en lugar de suponer.
8. Al terminar, resume: archivos cambiados, pruebas ejecutadas con su resultado,
   y lo que quedó pendiente o dudoso.
```

### 10.2 Cómo reasignar una tarea
1. Cambiar `Responsable` en la ficha y en el tablero (sección 12).
2. Si la nueva persona es de otro equipo, revisar la regla de `frontend/` (solo Leo, Geo, Jennifer y Pablo).
3. Avisar al responsable del archivo compartido si la tarea lo toca (sección 4).

### 10.3 Formato de ficha (para agregar tareas nuevas)

```text
### ID. Título
Prioridad · Tipo (M/D/U/Q) · Estimación · Responsable · Depende de
Objetivo:        qué debe quedar funcionando, en una o dos frases.
Leer primero:    archivos y secciones de la auditoría que dan contexto.
Puede editar:    lista cerrada de archivos o carpetas.
No tocar:        archivos compartidos y su responsable.
Contrato:        endpoints, permisos, campos.
Hecho cuando:    criterios comprobables.
Verificación:    comandos exactos.
```

---

## 11. Integración y cierre (domingo 25)

| ID | Tarea | Responsable | Est. | Notas |
|---|---|---|---|---|
| **INT-01** | Integrar `frontend-dev` en `develop` (sync, lint, test, build, resolver conflictos conservando ambas contribuciones) | **Jennifer** | 3 h | Tras el corte del sábado |
| **INT-02** | Integrar `backend-dev` en `develop` (sync, `check`, tests) | **Henry** | 1.5 h | Antes de INT-03 |
| **INT-03** | Regenerar `docs/openapi.yaml` con `--validate --fail-on-warn` y revisar que el frontend coincide | **Henry** | 0.5 h | Después de INT-02 |
| **INT-04** | Matriz de pruebas por rol: Ingeniero, Arquitecta, Empleado × (subir, editar, publicar, papelera, restaurar, historial, roles). Actualizar la colección Postman RBAC | **Geo + Leo** | 3 h | En pareja; cada hallazgo se asigna a su dueño |
| **INT-05** | Documento "Estado del proyecto": unificar `estado-ramas.md`, `reporte-*.md` e `integracion-backend-frontend.md` para que no se contradigan (hoy citan 38, 47 y 76 pruebas; actuales: 57 y 84) | **Geo** | 2 h | Se apoya en este plan |

**Definición de "hecho" global (aplica a toda ficha):**
- Lint, pruebas y build en verde; sin pruebas desactivadas para conseguirlo.
- Pruebas nuevas para la lógica añadida (mapeadores, validaciones, reglas de permisos).
- Commits convencionales y rama sincronizada antes del push.
- Sin secretos en el código ni en la documentación.
- El estado de la ficha actualizado en el tablero.

---

## 12. Tablero de estado

`[ ]` pendiente · `[~]` en curso · `[x]` hecho · `[!]` bloqueado

Actualizado el 25 de octubre de 2026 (INT-05), verificado por commit en `develop`. Pendientes abiertos y hallazgos: `docs/estado-proyecto.md`.

### Backend (detalle en `PLAN-BACKEND.md`)
| ID | Tarea | Resp. | Prioridad | Est. | Estado |
|---|---|---|---|---|---|
| BE-00 | Contratos stub y congelar permisos | Henry | P0 | 2 h | [x] Stubs (Henry) y cierre en la API real (Geo) |
| BE-01 | Catálogo de 32 permisos y roles base | Henry | P0 | 3 h | [x] b6766ff |
| BE-02 | `ResourcePermission` aplicado a todos los módulos | Henry | P0 | 3 h | [x] 8e6fdda |
| BE-03 | Seed no destructivo | Henry | P0 | 1 h | [x] fb37457 |
| BE-04 | Papelera genérica y unificada | Juan | P0 | 4 h | [x] b7a2b1e + registro en la API real |
| BE-05 | Fábrica de publicaciones (Abstract Factory) | Henry | P0 | 4 h | [x] 9462719 |
| BE-06 | Límites numéricos y carrera de borradores | Pablo | P0 | 2 h | [x] BE-06a y BE-06b; 24-oct: 122 pruebas backend en verde (SQLite) |
| BE-07 | Endpoint de Historial y exportación | Juan | P0 | 3 h | [x] bb8b9bf |
| BE-08 | Editar usuarios y cambiar rol | Pablo | P0 | 3 h | [x] ec8f363; reglas verificadas al cerrar BE-13 el 25-oct |
| BE-09 | Notificador de consultas (correo) | Juan | P0 | 3 h | [x] be25ef9 |
| BE-10 | Validar el esquema contra Supabase | Juan | P0 | 1.5 h | [x] a6d90cf |
| BE-11 | Docs: RBAC, arquitectura, ADR | Henry | P0 | 2 h | [x] 3f8fd6d |
| BE-12 | Docs: auditoría y papelera | Juan | P0 | 1.5 h | [x] 7b94bbf |
| BE-13 | Docs: actualizar API de usuarios | Pablo | P0 | 0.5 h | [x] En `docs/usuarios-api.md` (ec8f363); cierre 25-oct: permisos, seis reglas, errores y guardados parciales; 189 pruebas SQLite |
| BE-14 … BE-22 | Backlog posterior a la entrega | varios | P1/P2 | n/a | [ ] |

### Frontend (detalle en `PLAN-FRONTEND.md`)
| ID | Tarea | Resp. | Prioridad | Est. | Estado |
|---|---|---|---|---|---|
| FE-01a | Kit UI: esqueletos, botón de carga, vacío, error, confirmación | Leo | P0 | 2 h | [x] 9a79504 |
| FE-01b | Subida múltiple de imágenes con progreso | Leo | P0 | 3 h | [x] 9a79504 |
| FE-02 | Papelera | Leo | P0 | 4 h | [x] 7c659dd |
| FE-03 | Historial | Leo | P0 | 4 h | [x] 47c8e88 |
| FE-06 | Rutas, menú y permisos del panel | Jennifer | P0 | 3 h | [x] |
| FE-07 | Proyectos admin (listado, subir, editar) | Jennifer | P0 | 5 h | [x] |
| FE-10 | Mensajes, Noticias y Resumen con permisos nuevos | Jennifer | P0 | 2 h | [x] |
| FE-11 | Bienes Raíces admin: listado y acciones | Geo | P0 | 6 h | [x] 9c90853 |
| FE-12 | Bienes Raíces admin: subir y editar | Geo | P0 | 6 h | [x] 8249fcb |
| FE-13 | Roles y permisos | Pablo | P0 | 6 h | [x] Interfaz verificada; roles.read habilitado por BE-02 |
| FE-14 | Usuarios: editar y cambiar rol | Pablo | P0 | 3 h | [x] 24-oct: 162 pruebas, lint, build y recorrido con API real/SQLite |
| FE-04, FE-05, FE-08, FE-09 | Backlog posterior a la entrega | varios | P1 | n/a | [ ] |

### Integración
| ID | Tarea | Resp. | Estado |
|---|---|---|---|
| INT-01 | Integrar frontend en `develop` | Jennifer | [x] 9c4f706 |
| INT-02 | Integrar backend en `develop` | Henry | [x] 4ee2e2b |
| INT-03 | Regenerar OpenAPI | Henry | [x] 238fd1c |
| INT-04 | Pruebas por rol | Geo + Leo | [x] 25-oct: `docs/INT-04-matriz-roles.md` |
| INT-05 | Documento de estado | Geo | [x] 25-oct: `docs/estado-proyecto.md` |

---

## 13. Riesgos

| Riesgo | Probabilidad | Efecto | Mitigación |
|---|---|---|---|
| **Plan sin holgura** (≈85 h para 84 h disponibles) | Alta | Entrega incompleta | Plan de recorte (sección 8); P1 fuera; corte diario |
| Conflictos en la rama compartida | Alta | Pérdida de tiempo el domingo | Zonas de conflicto con responsable; sincronizar cada pocas horas |
| **Supabase no validado**: todo se probó en SQLite | Media | Errores al conectar con la base real el último día | BE-10 es lo primero que hace Juan el viernes |
| Cambio de `DELETE /projects/{slug}/` (de definitivo a papelera) | Baja | Quien lo use verá otro comportamiento | Hoy ninguna pantalla lo llama; se documenta en OpenAPI |
| Pablo reparte su tiempo entre backend y frontend | Media | Retrasa Roles y Usuarios | Sus tareas de backend son cortas; el recorte 5 protege FE-14 |
| Permisos del ingeniero cambian (DEC-01, 07, 08) | Media | Retrabajo en BE-01 y FE-06 | Los permisos se generan con una función; cambiar el catálogo es una línea |
| Imágenes en disco local | Media | Se pierden en un despliegue sin disco persistente | Aceptable para la demo; DEC-09 antes de producción |
| Agentes distintos generan estilos distintos | Media | Código inconsistente | Prompt base común; `AGENTS.md`; lint y tests obligatorios |

### Evidencia FE-06

Rutas y menú por permisos implementados en `frontend-dev`, conservando FE-11.
Incluye placeholders por responsable, secciones dinámicas y `refreshUser()` en el
contexto de sesión. Lint, 100 pruebas y build aprobados. Validación de interfaz
con API simulada; la comprobación integrada de roles reales depende de BE-01/02.

### Evidencia FE-10

Implementado en `frontend-dev`: acciones de Noticias por `news.create/edit/publish/delete`,
Mensajes de solo lectura sin `inquiries.manage`, y Resumen con totales de los módulos
permitidos (`page_size=1`, token de sesión). Errores parciales muestran indicador no
disponible; cero sigue siendo cero. Al editar sin permiso de publicación se omite
`published` del PATCH; las nuevas noticias sin ese permiso se crean en borrador.
Se ajustó también AdminNewsEditor porque sus botones permiten cambiar la publicación.

Verificación: lint, 115 pruebas y build aprobados. Prueba Chromium reproducible en
`frontend/tests/browser/admin-permissions.cjs` con ocho perfiles y API interceptada.
No acredita Supabase ni autorización real: BE-01/02 siguen pendientes de integración.
No se modificó backend, Roles de Pablo ni el módulo de propiedades de Geo.

### Evidencia FE-07

Implementados listado y formulario de Proyectos en `frontend-dev`. Se integró el
commit de Leo `9a79504` (FE-01a/b) preservando su autoría y archivos, sin nuevas ramas.
Lint, 141 pruebas y build aprobados; Chromium contra Django real con SQLite temporal
verificó creación, subida múltiple, orden, sitio público, edición, despublicación,
borradores, slug estable, cambios sin guardar y móvil. Sin acceso a Supabase.
Papelera desactivada hasta verificar BE-04 en el entorno integrado. Roles finos
pendientes de BE-01/02. Detalle en `frontend/src/features/admin-projects/README.md`.

### Evidencia INT-01

Frontend integrado sin conflictos desde `1ecb60a`; merge `9c4f706`. Lint, 181
pruebas, build y recorridos Chromium aprobados. Backend sin cambios; papelera de
Proyectos desactivada. La aceptación conjunta no se da por cerrada. Ver
[reporte INT-01](../INT-01-integracion-frontend.md).
