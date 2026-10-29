# INT-04 — Matriz de pruebas por rol

> Seguimiento del 28 de octubre de 2026: repetición contra Supabase completada, **70/70 comprobaciones aprobadas**, más controles de permisos y guardado con foto de los tres roles en Chromium. [Informe de la nueva ejecución](INT-04-supabase-2026-10-28.md). El resto de este documento conserva su corte original sobre SQLite; los resultados del despliegue público y almacenamiento persistente siguen pendientes.

**Responsables:** Geo y Leo · **Fecha:** domingo 25 de octubre de 2026 ·
**Código probado:** `develop` en `238fd1c` (tras INT-01, INT-02 e INT-03).

Resultado: **los tres roles se comportan como define `docs/RBAC.md`**, tanto en la API
como en el panel. No hay hallazgos que bloqueen la entrega. Quedan observaciones asignadas a
su dueño (sección 5).

## 1. Cómo se probó

| Capa | Herramienta | Resultado |
|---|---|---|
| API, 3 roles + un segundo Empleado | `backend/scripts/matriz_roles.py` contra `runserver` | **70 de 70** comprobaciones |
| API, colección del equipo | `docs/postman/EnObra-RBAC.postman_collection.json` con Newman 6.1.3 | **55 peticiones, 72 aserciones, 0 fallos** |
| Panel (React) contra la API real | Chromium (Playwright), un recorrido por rol | Menú, formularios y accesos correctos; 0 errores de consola; 0 respuestas 4xx/5xx inesperadas |
| Pruebas automáticas | `manage.py test` · `npm run lint/test/build` | 189 backend · 181 frontend · lint y build en verde |

**Entorno:** backend local con SQLite en archivo (tablas creadas igual que en las
pruebas, `seed_access_control` para los roles y cuatro cuentas de prueba), almacenamiento
local de imágenes y frontend con `VITE_API_BASE_URL` apuntando a ese backend. **No se usó
Supabase, Cloudinary ni Render:** eso se verifica en el despliegue (lunes).

Para la prueba se elevó el límite de inicios de sesión. En la configuración real son
**5 por minuto por IP** (`login: 5/min`). Funciona: devolvió 429 al superarlo. Ojo en la
demo si varias personas entran desde la misma red a la vez.

## 2. Matriz de la API

✓ = resultado esperado. El número es el código HTTP recibido. "—" = no aplica al rol en
esa fila; el caso equivalente está en otra fila.

| Área | Acción | Ingeniero | Arquitecta | Empleado |
|---|---|---|---|---|
| Sesión | `GET /auth/me/` | ✓ 200 | ✓ 200 | ✓ 200 |
| Subir | `POST /admin/media/` (foto) | ✓ 201 | ✓ 201 | ✓ 201 |
| Crear | `POST /properties/` borrador | ✓ 201 | ✓ 201 | ✓ 201 |
| Publicar | `POST /properties/` publicada | ✓ 201 | ✓ 201 | ✓ 403 |
| Ver | `GET` borrador de otro Empleado | — | ✓ 200 | ✓ 404 |
| Ver | `GET` borrador sin sesión | ✓ 404 (público) | | |
| Editar | `PATCH` borrador propio | ✓ 200 | ✓ 200 | ✓ 200 |
| Editar | `PATCH` borrador de otro Empleado | — | ✓ 200 | ✓ 403 |
| Editar | `PATCH` publicada ajena | ✓ 200 | — | ✓ 403 |
| Publicar | `PATCH published=true` | ✓ 200 | ✓ 200 (en borrador ajeno) | ✓ 403 (en el suyo) |
| Publicar | `PATCH published=false` (retirar) | — | ✓ 200 | — |
| Papelera | `DELETE` borrador propio | ✓ 204 | ✓ 204 | ✓ 204 |
| Papelera | `DELETE` publicada propia | — | ✓ 204 | — |
| Papelera | `DELETE` publicada ajena / borrador de otro | — | — | ✓ 403 / ✓ 403 |
| Papelera | `GET /admin/trash/?type=properties` | ✓ 200 (todo) | ✓ 200 (todo) | ✓ 200 (solo lo suyo) |
| Papelera | `GET /admin/trash/?type=projects` | ✓ 200 | ✓ 403 | ✓ 403 |
| Restaurar | `POST /admin/properties/{id}/restore/` | ✓ 204 | ✓ 204 | ✓ 403 |
| Restaurar | Vuelve a su estado previo (publicada) | ✓ | | |
| Eliminar definitivo | `DELETE /admin/properties/{id}/permanent/` | ✓ 204 | ✓ 403 | ✓ 403 |
| Historial | `GET /admin/audit/` y `/export/` | ✓ 200 | ✓ 403 | ✓ 403 |
| Roles | `GET` y `POST /admin/roles/` | ✓ 200 / 201 | ✓ 403 | ✓ 403 |
| Usuarios | `GET /admin/users/` | ✓ 200 | ✓ 403 | ✓ 403 |
| Proyectos | `POST /projects/` | ✓ 201 | ✓ 403 | ✓ 403 |
| Noticias | `POST /news/` | ✓ 201 | ✓ 403 | ✓ 403 |
| Sesión | `POST /auth/logout/` y luego `GET /auth/me/` | | | ✓ 204 → 401 |

Las filas de papelera para proyectos salen de la colección Postman (carpeta 03b); el
resto, de `matriz_roles.py`.

## 3. Panel en el navegador (contra la API real)

| | Ingeniero | Arquitecta | Empleado |
|---|---|---|---|
| Menú visible | Resumen, Bienes raíces, Proyectos, Noticias, Papelera, Mensajes, Usuarios, Roles, Historial | Resumen, Bienes raíces, Papelera | Resumen, Bienes raíces, Papelera |
| Nueva propiedad con subida real de foto (FE-12) | "Guardar y publicar" → **Publicada** | "Guardar y publicar" → **Publicada** | Sin botón de publicar → **Borrador** |
| Papelera (FE-02) | Con acceso | Con acceso; restaurar sí, eliminar definitivo no | Con acceso, solo lo suyo |
| Historial (FE-03) | Con acceso, filtros y exportar CSV | "No disponible para tu rol" | "No disponible para tu rol" |
| Roles (FE-13) / Usuarios (FE-14) | Con acceso | "No disponible para tu rol" | "No disponible para tu rol" |
| Errores de consola / respuestas 4xx-5xx inesperadas | 0 / 0 | 0 / 0 | 0 / 0 |

Las rutas sin permiso se probaron entrando directo por la URL, no solo ocultando el menú.

## 4. Cambios hechos en esta tarea

- **Colección Postman RBAC:** nueva carpeta **03b — Matriz por rol (INT-04)** con 19
  peticiones (imágenes, publicación del Empleado, papelera unificada, historial, roles,
  usuarios, proyectos y noticias por rol).
- **La colección no corría en Newman** y se corrigió:
  - 55 URLs no llevaban la barra final en su arreglo `path`. Newman la quitaba y Django
    respondía 500 a los POST.
  - Dos scripts declaraban `const data`, que choca con la variable global `data` del
    sandbox de Postman.
- **`backend/scripts/matriz_roles.py`:** el script de la sección 2, reutilizable contra
  cualquier API de desarrollo (credenciales por variables de entorno).
- **`docs/postman/README.md`:** cómo correr la colección con Newman y resultado de
  referencia.

## 5. Hallazgos

| # | Tipo | Hallazgo | Dueño | Bloquea la entrega |
|---|---|---|---|---|
| H1 | Decisión de producto | Con sesión, `GET /properties/` de un **Empleado** devuelve **solo las propiedades que él creó** (borradores y publicadas). No ve las publicadas por otros en el panel; en el sitio público sí, porque ahí no se envía token. Viene del filtro `owner_id` en `PropertyRepository.list` (`persistence/catalog.py`). No es un problema de seguridad. Decidir si es lo deseado y documentarlo en `docs/RBAC.md`, o cambiar el filtro para que el Empleado vea "publicadas de todos + sus borradores". | Henry (RBAC) con Juan (catálogo) | No |
| H2 | Defecto menor | En **Historial**, las subidas de imágenes muestran **"None"** en la columna Registro. `audit()` en `persistence/support.py` hace `str(getattr(obj, "titulo", ""))` y `ContenidoPagina.titulo` es `None`. Arreglo de una línea: `str(getattr(obj, "titulo", "") or "")`. Los registros ya guardados seguirán diciendo "None". | Juan (historial, BE-07) | No |
| H3 | Corregido | La colección Postman RBAC no corría en Newman (sección 4). | Geo | — |
| H4 | Pendiente de activar | La **papelera de proyectos** funciona en el backend integrado: `DELETE /projects/{slug}/` → `GET /admin/trash/?type=projects` → `POST .../restore/`, y vuelve publicada. Verificado el 25-oct. En el panel sigue apagada (`PROJECT_TRASH_ENABLED = false` en `admin-projects/utils/projects.js`). Activarla y probarla en pantalla. | Jennifer (FE-07) | No |

## 6. Qué no cubre esta prueba

- Base real de Supabase, Cloudinary, Resend y Render (prueba de humo del despliegue).
- Vista móvil del panel y lectores de pantalla.
- Concurrencia real (dos personas editando a la vez) sobre PostgreSQL.
- Roles personalizados creados desde el panel. Solo se probó crear uno (Ingeniero); no
  se entró con una cuenta que lo tenga.

## 7. Repetir la prueba

```bash
# 1. Backend de desarrollo con las cuatro cuentas (NUNCA contra la base real)
cd backend && python manage.py runserver

# 2. Matriz de la API
pip install requests pillow
QA_PASSWORD='...' python scripts/matriz_roles.py http://127.0.0.1:8000/api/v1/ resultado.json

# 3. Colección Postman (ver docs/postman/README.md)
cd ../docs/postman && npx newman@6.1.3 run copia-local-con-credenciales.json --working-dir .
```
