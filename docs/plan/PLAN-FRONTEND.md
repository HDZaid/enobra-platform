# Plan de Frontend (React + Vite + Tailwind) hacia la entrega del 25 de octubre

> Equipo y rama: **Leo, Geo y Jennifer → `frontend-dev`**. **Pablo** colabora solo en el panel admin, en `frontend-dev`, con commits separados de los de backend y coordinado con Jennifer (regla de `docs/TRABAJO-EN-EQUIPO.md`).
> **Juan y Henry no tocan `frontend/`.** Reglas, calendario, contratos de API (§6 del maestro) y decisiones: [`PLAN-MAESTRO.md`](PLAN-MAESTRO.md). Backend: [`PLAN-BACKEND.md`](PLAN-BACKEND.md).
> Los `§` remiten a la auditoría `auditoria-enobra-platform.md`.

---

## 1. Módulos y responsables

| Módulo | Qué resuelve | Tareas | Responsable | Por qué (historial) |
|---|---|---|---|---|
| **FE-BASE** | Kit de estados de carga, subida de imágenes, rutas y permisos del panel | FE-01a, FE-01b, FE-06, FE-10 | Leo (kit) · Jennifer (rutas/permisos) | Leo: `components/layout`; Jennifer: base del panel y autenticación del cliente |
| **FE-PROP** | Bienes Raíces admin: listar, subir, editar | FE-11, FE-12 | Geo | Hizo `features/properties` y `features/projects` públicos |
| **FE-PROY** | Proyectos admin: listar, subir, editar | FE-07 | Jennifer | Hizo el editor de noticias (formulario + imagen), el mismo patrón |
| **FE-PAP** | Papelera unificada | FE-02 | Leo | Reparto por balance; pantalla de lista y acciones |
| **FE-HIS** | Historial para el administrador | FE-03 | Leo | Reparto por balance; tabla con filtros |
| **FE-ROL** | Roles y permisos, usuarios | FE-13, FE-14 | Pablo | Autor de la pantalla de usuarios (`5b89fb8`) y del backend de roles/usuarios |

---

## 2. Convenciones del proyecto (léanse antes de escribir código)

Estas salen del código actual; las tareas las asumen.

- **Estructura:** `features/<módulo>/{pages,components,services,utils}`. Para el panel, cada módulo nuevo va en **su propia carpeta** para no chocar con los demás: `features/admin-properties/`, `features/admin-projects/`, `features/admin-trash/`, `features/admin-history/`, `features/admin-roles/`. Solo FE-14 edita dentro de `features/admin/` (usuarios).
- **Lógica fuera de los componentes:** validaciones, mapeadores y reglas de permisos van en `utils/*.js` o `services/*.js` **con pruebas** en `frontend/tests/*.test.mjs` (se ejecutan con `node --test`; no hay pruebas de componentes). Un componente no debería contener una regla que merezca prueba.
- **Cliente HTTP:** `apiRequest(path, { method, body, token, signal })` de `services/apiClient.js`; lanza `ApiError` con `status`, `code`, `details`. No modificarlo (es de Jennifer). Los errores 400 traen `details` por campo.
- **Sesión del panel:** `useOutletContext()` entrega `{ session, preview, login, logout, … }`; el token es `session.access`; el usuario, `session.user` con `permissions`. **No guardar tokens en `localStorage`.**
- **Permisos en la interfaz:** `hasAdminPermission(user, permission)` de `utils/adminData.js` (`admin.all` pasa todo). Ocultar o deshabilitar es solo comodidad; **el backend siempre decide**.
- **Estilo:** Tailwind con la paleta del panel (`#12233f`, `#304e7d`, `#ff6a1f`, `#f3f6fa`, `#dfe5ec`); íconos de `lucide-react`; textos en español de Guatemala (`es-GT`); precios en quetzales (`Q 1,250,000`) con `Intl.NumberFormat`.
- **Diálogos:** el elemento nativo `<dialog>` con `showModal()` (patrón de `AdminUserEditor`). Accesibilidad: foco inicial, `aria-labelledby`, cierre con Escape, `role="alert"` en errores.
- **Modo vista previa (solo en desarrollo):** Noticias, Mensajes y Usuarios permiten trabajar sin backend con datos de ejemplo (`preview`). Los módulos nuevos pueden seguir el patrón para avanzar antes de que la API exista, **sin simular nunca un guardado exitoso en modo real**.
- **Comprobaciones antes de cada push:** `npm --prefix frontend run lint`, `… run test`, `… run build` (hoy: 84 pruebas).

### Trampas del código actual (verificadas)

1. **`propertiesService.get` y `projectsService.get` lanzan 404 si la publicación es un borrador.** Sirven para el sitio público, **no** para editar. Cada módulo admin necesita su propio `get` que no filtre por `published` (puede reutilizar `mapProperty` y `mapProject`).
2. **Los serializers de escritura tienen `demo=true` y `published=true` por defecto.** Si el formulario omite esos campos, la publicación sale marcada como ejemplo y **publicada**. El formulario **siempre envía `demo: false` y `published` de forma explícita**.
3. **Sin el permiso `*.publish` el backend fuerza `published=false`** (y responde 403 si se pide `true` explícitamente). El formulario debe ocultar el interruptor de publicar y avisarlo, no fallar en silencio.
4. **`DELETE /projects/{slug}/` hoy borra de forma definitiva** hasta que BE-04 llegue a `backend-dev`. Mientras tanto, la acción "enviar a papelera" de proyectos se prueba **solo con datos desechables**.
5. **Imágenes:** la API exige entre 1 y 40 en `images` (fotos o renders de Proyectos y Propiedades), cada una como URL HTTPS o ruta `/media/…`. Solo se aceptan JPEG, PNG, WebP o GIF, de hasta 10 MB.
6. **Propiedades:** Terreno no admite habitaciones, baños ni parqueos. Precio y área son enteros; los máximos llegan con BE-06 (precio ≤ 9 999 999 999, área ≤ 99 999 999, contadores ≤ 999).
7. **Proyectos:** la categoría es **texto libre** (el backend crea la que no existe); no hay endpoint de categorías, así que se sugieren con `<datalist>` a partir de los proyectos cargados.

---

## 3. Contrato del kit de UI (FE-01a/b) para programar en paralelo

Todos pueden escribir sus pantallas **desde el viernes por la mañana** contra estas firmas. Leo las implementa en `frontend/src/components/ui/` y `frontend/src/services/`; si necesita cambiar una firma, avisa al equipo antes.

```jsx
// Esqueletos (aria-hidden, animate-pulse)
<Skeleton className="h-4 w-32" />
<TableSkeleton rows={6} columns={4} />
<CardSkeleton count={3} />
<FormSkeleton fields={6} />

// Botón con estado de carga: deshabilita, evita doble envío, muestra loadingText
<LoadingButton loading={bool} loadingText="Guardando…" variant="primary|outline|danger" type="submit">Guardar</LoadingButton>

// Vacío y error
<EmptyState icon={Icon} title="Aún no hay proyectos" description="…" action={{ label: 'Nuevo proyecto', onClick }} />
<ErrorState error={apiErrorOrError} onRetry={fn} action="consultar proyectos" />
//   mapea: 401 → "Tu sesión venció" (con enlace al login), 403 → "Sin permiso",
//   404, 429 → "Demasiados intentos", 501 → "Módulo aún no disponible", sin red → "Revisa tu conexión"

// Confirmación (variante destructiva; requireText obliga a escribir el nombre)
<ConfirmDialog open title="Eliminar definitivamente" description="…" confirmLabel="Eliminar"
               destructive requireText="Casa en Zona 9" busy={bool} onConfirm={fn} onCancel={fn} />

// Avisos (role="status" o "alert")
<Notice type="success|error|info" onClose={fn}>Texto</Notice>

// Utilidades puras (con pruebas)
describeApiError(error, { action })  // → string en español
fieldErrors(error)                   // → { campo: 'mensaje' } a partir de error.details (400)

// FE-01b: subida
uploadMedia(file, { kind: 'photo|render|news', token, onProgress, signal }) // → Promise<{ id, url, … }> (XMLHttpRequest)
validateImageFile(file)                                                    // → string | null (tipo y tamaño)
<MultiImageUploader value={string[]} onChange={fn} max={40} kind="photo" token={token}
                    onBusyChange={fn} label="Fotografías" />
//   arrastrar y soltar, varias a la vez, progreso por archivo, cancelar, reintentar,
//   quitar, reordenar (botones accesibles; la primera es la portada)
```

---

## 4. Fichas de tareas

### FE-01a. Kit de estados de carga
**P0 · U · 2 h · Leo · Sin dependencias · Vie 23, mañana (publicar antes de las 13:00)**

**Objetivo:** que todas las pantallas tengan carga, vacío, error y confirmación coherentes (hoy cada página repite un "Cargando…" distinto; §5).

**Leer primero:** §3 de este documento; `features/admin/pages/AdminNewsPage.jsx` y `AdminUsersPage.jsx` (estados actuales); `features/projects/components/CatalogStatus.jsx`; `features/admin/components/AdminUserEditor.jsx` (patrón de `<dialog>`).

**Puede editar:** `frontend/src/components/ui/` (nuevos: `Skeleton.jsx`, `LoadingButton.jsx`, `EmptyState.jsx`, `ErrorState.jsx`, `ConfirmDialog.jsx`, `Notice.jsx`, `apiErrors.js`), `frontend/tests/apiErrors.test.mjs`.

**No tocar:** `ContentStatus.jsx`, `useReferenceResource.js` ni las páginas públicas que ya los usan; **no se migran las páginas existentes** en esta entrega.

**Hecho cuando:**
- Los componentes de §3 existen con exactamente esas firmas.
- `describeApiError` cubre 401, 403, 404, 429, 501, 400 y error de red, con pruebas.
- Cada componente es accesible por teclado; `ConfirmDialog` con `requireText` no habilita el botón hasta que el texto coincide.
- Hay un ejemplo de uso por componente en un comentario al inicio del archivo.

**Verificación:** `npm --prefix frontend run lint`, `… run test`, `… run build`.

---

### FE-01b. Subida múltiple de imágenes con progreso
**P0 · U · 3 h · Leo · Depende de FE-01a (componentes base) · Vie 23, tarde (publicar antes de las 19:00)**

**Objetivo:** un solo componente de imágenes para Propiedades y Proyectos (§5: "Progreso de subida con cancelar y reintentar").

**Leer primero:** §2 trampa 5; `features/admin/services/adminMediaService.js` (`POST admin/media/`, campos `file` y `kind`); `features/admin/components/AdminNewsEditor.jsx` (validación de archivo); `services/apiClient.js` (para la URL base).

**Puede editar:** `frontend/src/services/uploadClient.js` (nuevo; `fetch` no informa el progreso, por eso se usa `XMLHttpRequest`), `frontend/src/components/ui/MultiImageUploader.jsx`, `frontend/src/components/ui/imageUpload.js`, `frontend/tests/imageUpload.test.mjs`.

**No tocar:** `apiClient.js` (Jennifer); `adminMediaService.js`, que usa Noticias y se queda como está.

**Contrato:** `POST /api/v1/admin/media/` multipart (`file`, `kind` = `photo|render|news|logo`), con `Authorization: Bearer`. Responde 201 con `{ id, url, … }`. La URL base se toma igual que en `apiClient.js` (`VITE_API_BASE_URL` o `/api/v1`).

**Hecho cuando:**
- Hasta 3 subidas simultáneas; barra de progreso por archivo; cancelar y reintentar.
- `validateImageFile` rechaza antes de subir lo que no sea JPEG/PNG/WebP/GIF o supere 10 MB, con mensaje claro.
- Reordenar (la primera es la portada), quitar y límite `max` respetado.
- `onBusyChange(true)` mientras hay subidas, para que el formulario bloquee el envío.
- Si el backend responde 401/403/429/413/501, se muestra el mensaje de `describeApiError` en esa imagen sin romper las demás.
- La URL devuelta se valida (HTTPS o `/media/…`) antes de aceptarla.
- Pruebas para: validación de archivo, reordenamiento, límite máximo y mapeo de errores.

**Verificación:** `npm --prefix frontend run lint`, `… run test`, `… run build`.

---

### FE-06. Rutas, menú y permisos del panel
**P0 · D · 3 h · Jennifer · Sin dependencias · Vie 23, **primero** (esqueleto de rutas antes de las 11:00)**

**Objetivo:** que todo el panel cuelgue de rutas y permisos coherentes con los 32 permisos, y que los demás puedan enchufar sus pantallas sin tocar archivos compartidos.

**Leer primero:** `app/routePaths.js`, `app/router.jsx`, `features/admin/utils/adminData.js`, `components/layout/AdminLayout.jsx`, `features/admin/components/AdminShell.jsx`, `AdminAccessDenied.jsx`; `PLAN-MAESTRO.md §6.1`.

**Puede editar:** los archivos anteriores, `frontend/tests/adminData.test.mjs`, y crear `features/admin/pages/AdminPlaceholderPage.jsx`.

**No tocar:** el contenido de las pantallas de los demás (solo se registran sus rutas).

**Paso 1 (antes de las 11:00): esqueleto.** Registrar estas rutas, cada una apuntando a `AdminPlaceholderPage` ("En construcción · responsable: X"), y avisar al equipo. Cada dueño reemplaza el `element` de **su** ruta:

| Ruta | Pantalla | Dueño |
|---|---|---|
| `/admin/bienes-raices` | Listado | Geo (FE-11) |
| `/admin/bienes-raices/nuevo` | Formulario | Geo (FE-12) |
| `/admin/bienes-raices/:id/editar` | Formulario | Geo (FE-12) |
| `/admin/proyectos` | Listado | Jennifer (FE-07) |
| `/admin/proyectos/nuevo` | Formulario | Jennifer (FE-07) |
| `/admin/proyectos/:slug/editar` | Formulario | Jennifer (FE-07) |
| `/admin/papelera` | Papelera | Leo (FE-02) |
| `/admin/historial` | Historial | Leo (FE-03) |
| `/admin/roles` · `/nuevo` · `/:id` | Roles | Pablo (FE-13) |

**Paso 2: permisos.** Reescribir `adminSectionPermissions` y `canAccessAdminSection` (`admin.all` sigue pasando todo):

| Sección | Permisos que la habilitan (cualquiera) |
|---|---|
| `dashboard` | ninguno (basta tener sesión) |
| `properties` | `properties.create`, `.edit.any`, `.edit.own`, `.publish`, `.trash.any`, `.trash.own`, `.restore`, `.delete_permanently` |
| `projects` | los mismos 8 con prefijo `projects.` |
| `trash` | cualquier `*.trash.*`, `*.restore` o `*.delete_permanently` de propiedades o proyectos |
| `history` | `audit.read` |
| `roles` | `roles.manage`, `roles.read` |
| `users` | `users.manage`, `users.read` |
| `news` | `news.create`, `news.edit`, `news.publish`, `news.delete` |
| `inbox` | `inquiries.read`, `inquiries.manage` |

**Paso 3: menú agrupado** en `AdminShell`: *Contenido* (Bienes Raíces, Proyectos, Noticias, Papelera), *Comunicación* (Mensajes), *Administración* (Usuarios, Roles, Historial); solo se muestra lo permitido.

**Paso 4: detalles que se rompen con rutas dinámicas.**
- `AdminLayout` y `AdminShell` resuelven la sección y el título con la ruta **exacta** (`sectionByPath`, `pageNames`). Con `/admin/bienes-raices/12/editar` fallan: usar `matchPath` o una función `sectionForPath(pathname)` en `adminData.js`, con pruebas.
- `AdminAccessDenied` dice que la sección exige "acceso administrativo completo": cambiar a un mensaje basado en permisos.
- Exponer en el contexto `refreshUser()`, que llama a `GET /auth/me/` y actualiza `session.user.permissions`. Lo necesita FE-13/FE-14 cuando alguien edita su propio rol.

**Hecho cuando:**
- Con un usuario de prueba que solo tiene `properties.create`, el menú muestra únicamente Bienes Raíces y Resumen; las demás rutas muestran acceso denegado.
- Con `admin.all` aparece todo.
- Las rutas dinámicas resuelven bien su sección; hay pruebas para `canAccessAdminSection` y `sectionForPath`.

**Verificación:** `npm --prefix frontend run lint`, `… run test`, `… run build`.

---

### FE-10. Mensajes, Noticias y Resumen con los permisos nuevos
**P0 · M · 2 h · Jennifer · Depende de FE-06 · Vie 23**

**Objetivo:** que las pantallas que ya existen respeten los permisos finos (§4.6).

**Puede editar:** `features/admin/pages/AdminInboxPage.jsx`, `AdminNewsPage.jsx`, `AdminDashboardPage.jsx`, `features/admin/utils/*`, sus pruebas.

**Qué hacer:**
- **Mensajes:** con solo `inquiries.read`, ocultar "Marcar atendido" y "Archivar" (requieren `inquiries.manage`).
- **Noticias:** "Añadir" solo con `news.create`; "Editar" con `news.edit`; el interruptor publicar/borrador con `news.publish`; "Eliminar" con `news.delete`.
- **Resumen:** las tarjetas de Proyectos y Propiedades hoy muestran "—" porque no tienen origen. Obtener el total con `GET /projects/?page_size=1` y `GET /properties/?page_size=1` (con token, para contar también borradores) solo si la persona puede ver esa sección. Actualizar los textos de "Próximos pasos" que dicen que esos módulos "se integrarán".

**Hecho cuando:** los botones respetan los permisos; los conteos del Resumen son reales; las pruebas de `adminData` cubren los casos nuevos.

---

### FE-11. Bienes Raíces admin: listado y acciones
**P0 · U · 6 h · Geo · Depende de FE-06 (ruta) y FE-01a (estados) · Vie 23**

**Objetivo:** el listado administrativo de propiedades con sus acciones (§4.1). La API ya está lista.

**Leer primero:** §2 (trampas 1, 2 y 3); `features/admin/pages/AdminNewsPage.jsx` (patrón de lista con filtros y confirmación); `features/properties/services/propertiesService.js` y `propertyFilters.js`; `apps/properties/views.py` (qué ve cada permiso).

**Puede editar:** `frontend/src/features/admin-properties/**` (nueva carpeta: `pages/AdminPropertiesPage.jsx`, `components/`, `services/adminPropertiesService.js`, `utils/propertyPermissions.js`), `frontend/tests/adminProperties.test.mjs`. Reemplazar solo el `element` de `/admin/bienes-raices` en `router.jsx`.

**No tocar:** `router.jsx` (otra cosa que ese `element`), `AdminShell.jsx`, `adminData.js` (Jennifer); el sitio público de propiedades.

**Contrato (ya existe):**
- `GET /properties/?page&page_size&q&operation&type&zone&min_price&max_price&sort` con token: incluye borradores. Un Empleado (`edit.own`) recibe **solo sus propios borradores**; Arquitecta e Ingeniero, todo.
- `PATCH /properties/{id}/ { "published": bool }`: publicar o pasar a borrador (exige `properties.publish`).
- `DELETE /properties/{id}/` → 204, a papelera (`trash.any`; con `trash.own` solo borradores propios).

**Qué hacer:**
- Tabla con portada, título, operación, tipo, zona, precio (con `/ mes` en Alquiler), estado (Publicada/Borrador) y fecha; paginación de 12.
- Filtros: búsqueda `q`, operación, tipo y zona (de `GET /properties/facets/`). **Filtro por estado (publicada/borrador): del lado del cliente sobre la página cargada, con el mismo aviso que ya usa Noticias**, porque la API aún no filtra por `published` (BE-22 en el backlog).
- Acciones por fila: ver en el sitio (si está publicada), editar, publicar/pasar a borrador (`properties.publish`), enviar a papelera (`ConfirmDialog`, `properties.trash.*`). "Nueva propiedad" solo con `properties.create`.
- Con `trash.own` sin `trash.any`, deshabilitar "papelera" en publicaciones ya publicadas, con tooltip.
- Skeleton al cargar, `ErrorState` con reintentar, `EmptyState` con acción.
- La API no devuelve quién creó cada propiedad; para el Empleado la lista ya viene filtrada por el backend, por lo que no hace falta decidir "propia o ajena" en pantalla.

**Hecho cuando:**
- Con Ingeniero: listar, filtrar, publicar/despublicar y enviar a papelera funcionan contra la API real.
- Con Empleado: la lista muestra solo sus borradores y no aparece "Publicar".
- Hay pruebas para el mapeo, los filtros y las reglas de permisos (`canTrashProperty`, `canPublishProperty`, …).

**Verificación:** `npm --prefix frontend run lint`, `… run test`, `… run build`.

---

### FE-12. Bienes Raíces admin: subir y editar
**P0 · U · 6 h · Geo · Depende de FE-01b (subida) y FE-11 (servicio) · Sáb 24**

**Objetivo:** el formulario de alta y edición de propiedades (§4.1: "Subir publicación" y "Editar publicación").

**Leer primero:** §2 (todas las trampas); `apps/properties/serializers.py` (`PropertyWriteSerializer`); `features/admin/components/AdminNewsEditor.jsx` (aviso de cambios sin guardar, validación y errores por campo); `features/admin/utils/newsEditor.js` (patrón `validateDraft` / `makePayload`).

**Puede editar:** `frontend/src/features/admin-properties/**` y `frontend/tests/adminProperties.test.mjs`. Reemplazar el `element` de `/admin/bienes-raices/nuevo` y `/:id/editar`.

**Campos y reglas (de `PropertyWriteSerializer`):**

| Campo | Regla |
|---|---|
| `title` | obligatorio, ≤ 160 |
| `operation` | `Venta` o `Alquiler` |
| `type` | `Casa`, `Apartamento`, `Terreno` o `Local` |
| `zone` | ≤ 60; `location` ≤ 120 |
| `price` | entero ≥ 0 (máx. 9 999 999 999 con BE-06); en Alquiler es mensual |
| `rooms`, `baths`, `parking` | enteros 0–999; **si el tipo es Terreno se ocultan y se envían en 0** |
| `area` | entero ≥ 1 (máx. 99 999 999); en Terreno es la superficie del terreno |
| `date` | fecha de publicación (ordena "más recientes") |
| `description`, `commercial` | obligatorios (`commercial` = condiciones comerciales) |
| `images` | 1 a 40 |
| `renders` | 0 a 40 |
| `video` | enlace HTTPS de YouTube o vacío |
| `demo` | **enviar siempre `false`** |
| `published` | **enviar siempre explícito**; si no hay `properties.publish`, ocultar el interruptor, enviar `false` y avisarlo |

**Qué hacer:**
- Formulario por secciones o pasos: datos generales → ubicación → características → precio y condiciones → descripción → multimedia (con `MultiImageUploader` para fotos y para renders) → revisión. (Si hay retraso, una sola página con secciones; ver recorte 6.)
- Botones **Guardar borrador** y **Guardar y publicar** (este último solo con `properties.publish`).
- Edición: cargar con un `adminPropertiesService.get(id, token)` **que no oculte borradores**; guardar con `PATCH`.
- Bloquear el envío mientras `MultiImageUploader` reporte `busy`.
- Errores 400: mostrarlos junto a cada campo con `fieldErrors`; 403, 404 y 429 con `describeApiError`. Si el backend responde 403 al editar ("solo puedes editar tus propios borradores"), explicarlo.
- Aviso de cambios sin guardar al salir (`useBlocker` de React Router, más `beforeunload`).
- Botón con `LoadingButton` y `Notice` de éxito; tras crear, ir al listado.

**Hecho cuando:**
- Crear una propiedad con 2 fotos y publicarla aparece en `/bienes-raices` (sitio público); editarla cambia los datos; guardarla como borrador no la muestra públicamente.
- Un Terreno no envía habitaciones, baños ni parqueos distintos de 0.
- El payload **siempre** lleva `demo: false` y `published` explícito (prueba).
- Con Empleado: solo puede guardar borrador y no ve "publicar".
- Pruebas: `validatePropertyDraft`, `makePropertyPayload`, `propertyToDraft` (API → formulario), regla Terreno, límites.

**Verificación:** `npm --prefix frontend run lint`, `… run test`, `… run build`.

---

### FE-07. Proyectos admin: listado, subir y editar
**P0 · U · 5 h · Jennifer · Depende de FE-06 y FE-01b · Vie 23 (listado) y sáb 24 (formulario)**

**Objetivo:** lo mismo que Bienes Raíces para Proyectos, como módulo **separado** (§4.2).

**Leer primero:** §2 (trampas 1, 2, 3, 4 y 7); `apps/projects/serializers.py`; `features/admin/components/AdminNewsEditor.jsx` y `AdminNewsPage.jsx` (su propio patrón); `features/projects/services/projectsService.js` (`mapProject`).

**Puede editar:** `frontend/src/features/admin-projects/**` (nueva), `frontend/tests/adminProjects.test.mjs`. Reemplazar el `element` de las 3 rutas de proyectos.

**Contrato (ya existe; permisos finos con BE-02):**
- `GET /projects/?year&page&page_size` con token (incluye borradores); `GET /projects/years/`.
- `POST /projects/`, `PATCH /projects/{slug}/`, `PUT`, `DELETE /projects/{slug}/` (esta última, **definitiva hoy, papelera con BE-04**).

**Campos (de `ProjectWriteSerializer`):** `title` ≤ 160, `category` ≤ 80 (texto libre con sugerencias), `country` ≤ 80 (por defecto "Guatemala"), `year` entero ≥ 1900 y ≤ año actual + 5, `description`, `images` 1–40, `renders` 0–40, `video` (YouTube HTTPS o vacío), `demo` (**siempre `false`**), `published` (**siempre explícito**).

**Qué hacer:**
- Listado: portada, título, categoría, año, país y estado; filtro por año (de `GET /projects/years/`); búsqueda por texto del lado del cliente sobre la página cargada, con aviso. Acciones: ver en el sitio, editar, publicar/borrador (`projects.publish`), papelera (`projects.trash.*`).
- **El botón "enviar a papelera" se deja detrás de una constante** (`PROJECT_TRASH_ENABLED`) que se activa cuando BE-04 esté en `backend-dev` y probado; antes borraría de forma definitiva.
- Formulario con `MultiImageUploader`, aviso de cambios sin guardar y errores por campo, igual que FE-12. La categoría usa `<datalist>`.
- Un `adminProjectsService.get(slug, token)` que no oculte borradores.
- El `slug` se genera al crear y no cambia si se edita el título; mostrarlo de solo lectura en edición.

**Hecho cuando:** crear un proyecto con imágenes lo muestra en `/proyectos`; editar y despublicar funcionan; payload con `demo: false` y `published` explícito (prueba); pruebas de validación, mapeo y permisos.

**Verificación:** `npm --prefix frontend run lint`, `… run test`, `… run build`.

---

### FE-02. Papelera
**P0 · U · 4 h · Leo · Depende de FE-01a y BE-04 · Sáb 24 (mañana)**

**Objetivo:** una sola pantalla para ver, restaurar y eliminar definitivamente lo que está en papelera (§4.3).

**Leer primero:** `PLAN-MAESTRO.md §6.2`; `apps/properties/urls.py` (rutas de papelera de propiedades).

**Puede editar:** `frontend/src/features/admin-trash/**` (nueva), `frontend/tests/adminTrash.test.mjs`. Reemplazar el `element` de `/admin/papelera`.

**Contrato:**
- `GET /admin/trash/?type=properties|projects&page&page_size` → `{ count, page, page_size, results: [{ type, id, title, trashed_at, trashed_by, trashed_by_name, was_published, owner_id }] }`.
- Restaurar: `POST /admin/properties/{id}/restore/` · `POST /admin/projects/{slug}/restore/` (204).
- Eliminar definitivamente: `DELETE /admin/properties/{id}/permanent/` · `DELETE /admin/projects/{slug}/permanent/` (204).
- Permisos por tipo: `*.restore` para restaurar, `*.delete_permanently` para eliminar. Quien solo tiene `*.trash.own` ve **únicamente su papelera**.

**Qué hacer:**
- Pestañas **Bienes Raíces** y **Proyectos**; mostrar solo las que la persona puede ver.
- Tabla: título, tipo, "estaba publicada", fecha de envío y quién la envió (`trashed_by_name`).
- Restaurar con confirmación simple; eliminar definitivamente con `ConfirmDialog` y `requireText` igual al título. Ocultar o deshabilitar las acciones sin permiso.
- Aviso claro de que restaurar devuelve la publicación a su estado anterior.
- Skeleton, vacío ("La papelera está vacía"), error con reintento y refresco tras cada acción.
- *(Recorte 2: restaurar en bloque y "vaciar papelera" quedan para el final.)*

**Hecho cuando:** un elemento enviado a papelera desde FE-11 aparece aquí, se restaura con su estado previo y se elimina definitivamente solo con confirmación; un Empleado ve solo lo suyo; pruebas del mapeo y de las reglas de acciones por permiso.

**Verificación:** `npm --prefix frontend run lint`, `… run test`, `… run build`.

---

### FE-03. Historial (administrador)
**P0 · U · 4 h · Leo · Depende de FE-01a y BE-07 · Sáb 24 (tarde; se desarrolla antes con datos de ejemplo)**

**Objetivo:** que el administrador pueda leer qué se hizo, quién y cuándo (§4.4).

**Leer primero:** `PLAN-MAESTRO.md §6.2`; `persistence/models/audit.py` (qué se guarda); el modo `preview` de `features/admin/utils/users.js` como ejemplo de datos de muestra.

**Puede editar:** `frontend/src/features/admin-history/**` (nueva), `frontend/tests/adminHistory.test.mjs`. Reemplazar el `element` de `/admin/historial`.

**Contrato:**
- `GET /admin/audit/?page&page_size&q&module&action&user_id&date_from&date_to` (permiso `audit.read`) → `{ count, page, page_size, results: [{ id, user: { id, name }, action, module, record_id, record_name, description, date }] }`.
- `GET /admin/audit/export/` con los mismos filtros → CSV (permiso `audit.export`).

**Qué hacer:**
- Tabla: fecha y hora local (`es-GT`), usuario, módulo, acción (con color), registro y descripción (resumida).
- Filtros: texto, módulo, acción y rango de fechas. Filtro por usuario solo si la persona puede listar usuarios (`users.read`/`users.manage`); si no, no aparece.
- Etiquetas legibles: módulos `properties`→Bienes Raíces, `projects`→Proyectos, `news`→Noticias, `users`→Usuarios, `roles`→Roles, `media`→Imágenes, `inquiries`→Mensajes; acciones `CREAR`, `EDITAR`, `ELIMINAR`, `PAPELERA`, `RESTAURAR`, `ELIMINAR_PERMANENTE`, `ESTADO`, `ROL`. **Un valor desconocido se muestra tal cual, sin romper la pantalla.**
- Detalle del evento en un diálogo con la descripción completa. *(No existe "antes/después": ver BE-19.)*
- Exportar CSV (solo con `audit.export`): descargar el texto recibido como archivo `historial-AAAA-MM-DD.csv`. *(Recorte 1.)*
- Skeleton, vacío, error con reintento y paginación.
- Con solo `audit.read` el botón de exportar no aparece.

**Hecho cuando:** los filtros se combinan y se reflejan en la API; acciones y módulos desconocidos no rompen la tabla; pruebas del mapeo y de las etiquetas.

**Verificación:** `npm --prefix frontend run lint`, `… run test`, `… run build`.

---

### FE-13. Roles y permisos
**P0 · U · 6 h · Pablo · Depende de FE-06 y FE-01a · Vie 23 (inicio) y sáb 24 (fin)**

**Estado (24-oct):** interfaz implementada y revisada en `frontend-dev`.
Se corrigió el aviso de cambios al restaurar los permisos originales en otro
orden; compara el contenido que se enviaría, sin mutar el borrador.
Lint, 156 pruebas y build aprobados. Chromium contra Django real con SQLite
desechable verificó creación de un rol de tres permisos, edición, reversión,
aviso al navegar, bloqueo de Ingeniero, `refreshUser()` y menú de una cuenta
creada con ese rol por API; también se comprobó navegación móvil sin desborde.
Solo lectura y errores 400/501 comprobados con API interceptada. La lectura
real con `roles.read` sigue pendiente de BE-01/02 (Henry): los GET actuales
todavía exigen `roles.manage`. La asignación desde pantalla corresponde a
FE-14; esta revisión no valida Supabase.

**Objetivo:** la pantalla para crear y editar roles con una matriz de permisos (§4.5). La API de roles y permisos ya existe.

**Leer primero:** `apps/accounts/views.py` y `serializers.py` (`RoleWriteSerializer`); `persistence/access_control.py` (reglas del backend); `features/admin/components/AdminUserEditor.jsx` (patrón de diálogo y errores).

**Puede editar:** `frontend/src/features/admin-roles/**` (nueva), `frontend/tests/adminRoles.test.mjs`. Reemplazar el `element` de las 3 rutas de roles. Trabaja en **`frontend-dev`, con commits separados de los de backend**, y avisa a Jennifer.

**Contrato (ya existe):**
- `GET /admin/permissions/` → `[{ name, description }]` · `GET /admin/roles/` → `[{ id, name, description, active, permissions[] }]` · `GET /admin/roles/{id}/`.
- `POST /admin/roles/ { name, description?, active?, permissions[] }` · `PATCH /admin/roles/{id}/` (parcial).
- Reglas que ya impone el backend (la pantalla debe reflejarlas, no duplicarlas): nombre único; los nombres `admin` y `administrador` están reservados; el rol **Ingeniero** no se renombra, no se desactiva y conserva `admin.all`; todo permiso debe existir.

**Qué hacer:**
- `/admin/roles`: lista con nombre, descripción, estado y cantidad de permisos; marca de "rol del sistema" en Ingeniero. *(La API no devuelve la cantidad de usuarios por rol, así que no se muestra.)*
- `/admin/roles/nuevo` y `/admin/roles/:id`: nombre, descripción, activo y **matriz de permisos agrupada por módulo**: Bienes Raíces, Proyectos, Noticias, Mensajes, Medios, Empresa, Usuarios, Roles, Historial y "Acceso total" (`admin.all`, con advertencia). Seleccionar o limpiar un grupo entero. Cada permiso muestra su `description`.
- Ingeniero: nombre, estado y permisos **bloqueados** visualmente.
- Solo lectura si la persona tiene `roles.read` pero no `roles.manage`.
- Errores 400 por campo (`fieldErrors`) y mensajes de las reglas anteriores.
- Aviso de cambios sin guardar.
- Si el rol editado es uno que la persona misma tiene, llamar a `refreshUser()` (de FE-06) para que el menú se actualice.
- *(Recorte 3: duplicar rol y buscador de permisos.)*

**Hecho cuando:** crear un rol con 3 permisos, asignarlo a un usuario (FE-14) y entrar con esa cuenta muestra solo esas secciones; el rol Ingeniero no se puede degradar desde la pantalla; pruebas del agrupamiento de permisos, del estado inicial y del payload.

**Verificación:** `npm --prefix frontend run lint`, `… run test`, `… run build`.

---

### FE-14. Usuarios: editar y cambiar rol
**P0 · M · 3 h · Pablo · Depende de BE-08 (Pablo) y FE-13 · Sáb 24**

**Objetivo:** completar la pantalla de usuarios, que hoy solo lista y crea (§4.5).

**Leer primero:** `features/admin/pages/AdminUsersPage.jsx`, `components/AdminUserEditor.jsx`, `services/usersService.js`, `utils/users.js`, `tests/users.test.mjs`; `docs/usuarios-api.md` (con BE-08/BE-13).

**Puede editar:** esos archivos y crear `features/admin/components/AdminUserEditDialog.jsx`. **Crear un diálogo nuevo en lugar de modificar `AdminUserEditor`** para no romper la creación, que ya funciona.

**Contrato (BE-08):** `PATCH /admin/users/{id}/ { name?, active? }` y `PUT /admin/users/{id}/role/ { role_id }`.

**Qué hacer:**
- Botón "Editar" por fila: nombre, estado activo y rol (selector de roles activos, `GET /admin/users/roles/`).
- Reflejar las reglas del backend: no se puede desactivarse ni cambiarse el rol a uno mismo; no se puede tocar al último Ingeniero; no se puede asignar un rol con permisos que uno no tiene. Mostrar el mensaje que devuelva el servidor.
- Desactivar con `ConfirmDialog`.
- Si se guardan dos cambios (datos y rol) y uno falla, decirlo con claridad en lugar de mostrar éxito.
- *(Recorte 5: si falta tiempo, el cambio de rol queda solo vía API y Postman.)*

**Hecho cuando:** se edita un usuario y su rol desde la pantalla contra la API real; los mensajes de error de las reglas se muestran; las pruebas de `users.test.mjs` siguen en verde con las nuevas.

**Verificación:** `npm --prefix frontend run lint`, `… run test`, `… run build`.

---

## 5. Backlog posterior a la entrega (26–27 de octubre y después)

| ID | Tarea | Resp. sugerido | Origen | Nota |
|---|---|---|---|---|
| FE-04 | Páginas 403/404 propias del panel y reemplazo de `PendingPage` como "no encontrada" pública | Leo | Auditoría §4.6 | Pulido |
| FE-05 | Servicios y Búsqueda públicos con API real | Leo | Auditoría §3.1 | Depende de BE-17 |
| FE-08 | Sesión persistente y renovación automática con `/auth/refresh/` | Jennifer | Auditoría §4.7, DEC-03 | Hoy recargar cierra la sesión; no usar `localStorage` sin acuerdo |
| FE-09 | Edición de contenido institucional (empresa y Nosotros) | Jennifer | Auditoría §4.6 | La API ya existe (`PUT /company/`, `/institution/`) |
| FE-15 | Migrar las páginas existentes al kit de estados de carga | Leo | Auditoría §5 | Después de la entrega |
| FE-16 | Pestaña "Historial" dentro de cada publicación | Leo | Auditoría §4.4 | Requiere filtrar por `record_id` |
| FE-17 | Biblioteca de medios | Geo | Auditoría §4.6 | Requiere un endpoint de listado |

---

## 6. Comprobación de cierre del frontend (domingo)

Antes de INT-01, quien integre confirma:

- [ ] `npm --prefix frontend run lint`, `… run test` y `… run build` en verde (hoy: 84 pruebas; deben ser más).
- [ ] Recorrido manual como **Ingeniero**: crear, editar, publicar y enviar a papelera una propiedad y un proyecto; restaurar; eliminar definitivamente; ver el historial; crear un rol, asignarlo y entrar con esa cuenta.
- [ ] Recorrido como **Arquitecta** y **Empleado**: solo ven lo que su rol permite; Empleado solo guarda borradores; ambos pueden subir imágenes.
- [ ] Todas las pantallas nuevas muestran carga, vacío y error; ninguna simula un guardado exitoso cuando la API responde 501 o falla.
- [ ] Sin tokens ni credenciales en el código ni en la documentación.
- [ ] Vista móvil (390 px) y escritorio (1440 px) revisadas en listados y formularios.
