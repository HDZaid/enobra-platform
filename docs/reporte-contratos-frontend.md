# Reporte de contratos frontend ↔ backend

Fecha: 20 de octubre de 2026. Rama: `frontend/news-admin-contact` (base `3cf779a`).
Estado actualizado en `develop`: CF-01, CF-02 y CF-05 **corregidos**; los demás hallazgos conservan su alcance pendiente.

Este informe se incorpora desde `frontend/news-admin-contact` conservando el análisis
de origen. CF-02 se resolvió regenerando OpenAPI y CF-05 limitando el correo a 150
caracteres en ambos lados. El recorrido real React→Django y sus límites actuales se
detallan en [integración backend/frontend](integracion-backend-frontend.md).

## Alcance y método

Se revisó cada petición HTTP que hace el frontend (`frontend/src/**/services/*.js` y las
páginas que las usan) contra lo que el backend realmente implementa: serializers, vistas,
clases de permiso y persistencia en `backend/`. También se comparó con
[`openapi.yaml`](openapi.yaml), que según las [reglas de desarrollo](reglas-desarrollo.md)
es la referencia compartida.

Las pruebas usaron un backend simulado con la forma exacta de `UserSerializer`.
No se ejecutaron contra Django con PostgreSQL ni contra Supabase.

## Resumen

| ID | Área | Problema | Prioridad | Estado | Lo resuelve |
| --- | --- | --- | --- | --- | --- |
| CF-01 | Autenticación | El login exigía `role: "admin"`, pero Django devuelve `Ingeniero`, `Arquitecta` o `Empleado`. | P1 | **Corregido** | Frontend |
| CF-02 | OpenAPI | `openapi.yaml` no se regeneró después de agregar RBAC (`28e36dc`). | P1 | Corregido en develop | Backend |
| CF-03 | Sesión | El access token expira a los 15 min y el frontend nunca lo renueva. | P1 | Abierto | Frontend + backend |
| CF-04 | Errores | Las pantallas tratan igual `401` (sesión vencida) y `403` (sin permiso). | P2 | Abierto | Frontend |
| CF-05 | Contacto | La entrada excedía los 150 caracteres del modelo declarado; la exportación remota abreviada no confirma su longitud real. | P2 | Corregido en develop | Ambos |
| CF-06 | Medios / RBAC | Arquitecta y Empleado pueden crear propiedades, pero no pueden subir imágenes. | P2 | Abierto | Backend + Geo |
| CF-07 | Errores | Los `400` con `error.details` por campo se muestran como un mensaje genérico. | P3 | Abierto | Frontend |
| CF-08 | Filtros | La búsqueda por texto y el filtro de publicación solo se aplican a la página recibida. | P3 | Conocido | Por acordar |
| CF-09 | Cobertura | Varios contratos del backend aún no tienen consumidor en el frontend. | — | Informativo | Cada módulo |

---

## CF-01 — El login rechazaba los roles reales (corregido)

**Antes.** [`adminData.js`](../frontend/src/features/admin/utils/adminData.js) validaba
`response.user?.role !== 'admin'`. Desde el RBAC, `DjangoAuthService._principal()`
([`persistence/accounts.py`](../backend/persistence/accounts.py)) devuelve:

```json
{ "role": "Ingeniero", "roles": ["Ingeniero"], "permissions": ["admin.all", "..."] }
```

Solo las cuentas antiguas con rol `admin` o `Administrador` siguen recibiendo `role: "admin"`.
Por eso un Ingeniero, una Arquitecta o un Empleado veían el error
«La respuesta de autenticación no corresponde a una sesión administrativa válida»,
aunque Django ya hubiera aceptado sus credenciales.

**Ahora.** El frontend sigue el mismo criterio que el backend: **autoriza por permisos y usa
el nombre del rol solo para mostrarlo.**

- `readAdminSession` acepta cualquier rol y exige `access`, `refresh`, `user.role` y
  `user.permissions` (lista). Si `roles` falta, usa `[role]`.
- Una cuenta sin permisos no entra. Ve el mensaje «Tu cuenta no tiene permisos asignados…»,
  y su refresh token se revoca con `POST /auth/logout/` para no dejar una sesión abierta.
- Las secciones se habilitan con los permisos que exige Django:

  | Sección | Permiso requerido (backend) | Ingeniero | Arquitecta | Empleado |
  | --- | --- | --- | --- | --- |
  | Resumen | ninguno | ✅ | ✅ | ✅ |
  | Noticias (`/news/` escritura, `/admin/media/`) | `admin.all` (`IsAdminOrReadOnly`, `IsAdmin`) | ✅ | — | — |
  | Mensajes (`/inquiries/`) | `admin.all` (`IsAdmin`) | ✅ | — | — |
  | Bienes raíces | cualquier `properties.*` | ✅ | ✅ | ✅ |

- El menú lateral oculta lo que el rol no puede usar. Una ruta abierta directamente muestra
  «Esta sección no está disponible para tu rol», sin hacer peticiones que terminarían en `403`.
- El Resumen solo consulta los contadores autorizados. Arquitecta y Empleado ven un aviso de
  que sus opciones de bienes raíces aparecerán cuando se integre ese módulo.
- La etiqueta `ADMIN` fija ahora muestra el rol real (`INGENIERO`, `ARQUITECTA`, `EMPLEADO`).
- El login muestra un mensaje propio para `429` (límite `login: 5/min`).

**Archivos:** `utils/adminData.js`, `components/layout/AdminLayout.jsx`,
`components/AdminShell.jsx`, `components/AdminAccessDenied.jsx` (nuevo),
`pages/AdminDashboardPage.jsx`, `pages/AdminLoginPage.jsx` y `tests/adminData.test.mjs`.

**Verificación:** `npm test` (54/54), `npm run lint` y `npm run build` correctos. También se
recorrió el login en Chromium con backend simulado para Ingeniero, Arquitecta, Empleado y una
cuenta sin permisos, en escritorio y móvil.

> **Requisito para la prueba real.** Un Ingeniero solo ve Noticias y Mensajes si su rol tiene
> el permiso `admin.all` en la base. Ejecuta `manage.py seed_access_control` antes de probar.
> Si su rol no tiene permisos cargados, no podrá entrar: verá el aviso de cuenta sin permisos.
> Es el comportamiento correcto, porque Django también le respondería `403` en cada sección.

---

## CF-02 — `openapi.yaml` no refleja el RBAC

**Prioridad: P1.** Es la causa de fondo de CF-01: el frontend se programó con el contrato
publicado, y ese contrato quedó atrás.

| Contrato publicado (`docs/openapi.yaml`) | Backend real |
| --- | --- |
| `User.role` → `RoleEnum` con un único valor: `admin`. | `role` es texto libre (`Ingeniero`, `Arquitecta`, `Empleado`, `admin`…). |
| `User` no tiene `roles` ni `permissions`. | `UserSerializer` devuelve `roles: string[]` y `permissions: string[]`. |
| La descripción general dice «escritura requiere rol admin». | La escritura de propiedades acepta permisos `properties.*`. |
| No existen estas rutas. | `GET /admin/permissions/`, `GET/POST /admin/roles/`, `GET/PATCH /admin/roles/{id}/`, `GET /admin/properties/trash/`, `POST /admin/properties/{id}/restore/`, `DELETE /admin/properties/{id}/permanent/`. |

**Corrección:** desde `backend/`, regenerar el contrato y versionarlo:

```powershell
.\.venv\Scripts\python.exe manage.py spectacular --file ../docs/openapi.yaml --validate
```

Además, eliminar o desaprobar `Role.ADMIN` en `apps/common/enums.py` si ya no es el modelo
de roles, y actualizar la colección de Postman y `admin-backend.md`. Este último todavía dice
que las cuentas necesitan el rol `admin` o `Administrador`.

---

## CF-03 — La sesión vence a los 15 minutos sin renovarse

**Prioridad: P1.**

`DjangoAuthService` emite access tokens de 900 s y refresh tokens de 7 días. El frontend
guarda ambos en memoria, pero nunca llama a `authService.refresh()` ni a `authService.me()`
(están definidos y no se usan). Tampoco lee `expires_in`.

**Reproducción:**

1. Inicia sesión y espera más de 15 minutos.
2. Abre Noticias o Mensajes, o guarda una noticia.

Cada petición devuelve `401 not_authenticated`. La interfaz dice «La sesión no tiene permisos
para administrar noticias», sin cerrar la sesión ni renovarla, y el usuario no sabe que debe
volver a entrar. Además, recargar la página pierde la sesión, porque solo vive en el estado de React.

**Corrección sugerida:** ante un `401` de una petición autenticada, intentar una vez
`POST /auth/refresh/` y repetir la petición. Si el refresh también falla, cerrar la sesión y
volver a `/admin/login` con un aviso de sesión vencida. Antes hay que acordar con backend dónde
se conserva el refresh token entre recargas: el README del frontend descarta `localStorage`.
Una cookie `HttpOnly` requeriría un cambio de contrato.

---

## CF-04 — `401` y `403` producen el mismo mensaje

**Prioridad: P2.** El contrato distingue `not_authenticated` (401) de `permission_denied` (403)
en [`errors.py`](../backend/apps/common/errors.py). Estas funciones los agrupan:

- `messageForError` en [`AdminNewsPage.jsx`](../frontend/src/features/admin/pages/AdminNewsPage.jsx)
- `errorText` en [`AdminInboxPage.jsx`](../frontend/src/features/admin/pages/AdminInboxPage.jsx)
- el `catch` de `submit` en [`AdminNewsEditor.jsx`](../frontend/src/features/admin/components/AdminNewsEditor.jsx)

Un `401` debe llevar a iniciar sesión de nuevo (ver CF-03). Un `403` debe explicar que el rol
no tiene permiso. Con CF-01, el `403` ya no debería aparecer en las secciones ocultas, pero
sí puede aparecer si un Ingeniero cambia los permisos de un rol mientras la otra persona
tiene la sesión abierta.

---

## CF-05 — Correo de contacto más largo que la columna

**Prioridad: P2.** Es la contraparte en el frontend de ADM-03 del
[reporte administrativo](reporte-revision-admin.md).

| Capa | Límite del correo |
| --- | --- |
| [`ContactForm.jsx`](../frontend/src/features/contact/components/ContactForm.jsx) | `maxLength={254}` |
| [`contactValidation.js`](../frontend/src/features/contact/services/contactValidation.js) | Sin límite de longitud |
| `ContactInquiryCreateSerializer.email` | Sin `max_length` |
| `MensajeContacto.correo` | `max_length=150` |

Un correo válido de 151 a 254 caracteres pasa ambas validaciones y falla al escribir en
PostgreSQL. La interfaz mostraría el error genérico «No fue posible enviar tu consulta».

**Corrección:** agregar `max_length=150` al serializer y regenerar OpenAPI. En el frontend,
usar `maxLength={150}` y validar `data.email.length > 150` en `validateContact`, con su prueba.

---

## CF-06 — Arquitecta y Empleado no pueden subir imágenes

**Prioridad: P2.** Este problema todavía no tiene consumidor: afectará al formulario
administrativo de propiedades (módulo de Geo).

`PropertyAccessPermission` permite a Arquitecta y Empleado crear y editar propiedades, y una
propiedad incluye `images` y `renders`. Pero `POST /admin/media/` usa `IsAdmin`, es decir,
exige `admin.all`. Esos roles solo podrían guardar propiedades con URLs HTTPS externas o con
imágenes que haya subido antes un Ingeniero.

**Corrección sugerida (por acordar):** crear un permiso como `media.upload` y asignarlo a los
tres roles, o permitir la subida a quien tenga `properties.create`/`properties.edit.*`.
`DELETE /admin/media/{id}/` debería seguir restringido por ADM-01.

---

## CF-07 — Se ignoran los detalles de validación por campo

**Prioridad: P3.** Ante un `400 validation_error`, Django responde con
`error.details = { "campo": ["mensaje"] }`. El cliente HTTP los conserva en `ApiError.details`,
pero ninguna pantalla los usa (no hay referencias a `.details` fuera de `apiClient.js`):

- El editor de noticias muestra «Django rechazó los datos. Revisa la imagen y los campos obligatorios».
- El formulario de contacto muestra «No fue posible enviar tu consulta…».

**Corrección sugerida:** asignar `details` a los errores de cada campo cuando la clave
coincida con un campo del formulario y dejar el mensaje genérico para el resto. La
validación del cliente reduce estos casos, pero no los elimina: por ejemplo, un `slug`
repetido o un límite como el de CF-05.

---

## CF-08 — Filtros que la API no ofrece

**Prioridad: P3. Limitación conocida**, documentada en `ADMIN-CIERRE-FRONTEND.md`.

`GET /news/` solo acepta `category`, `page` y `page_size`. `GET /inquiries/` acepta además
`kind` y `status`. La búsqueda por texto (en ambas pantallas) y el filtro
«Publicado/Borrador» de Noticias se aplican **solo a la página recibida**. Con más de 12
registros, el contador y la paginación no corresponden al filtro aplicado.

**Opciones:** agregar `q` y `published` a los query serializers del backend, o retirar esos
filtros de la interfaz. Se necesita acuerdo de ambas áreas.

---

## CF-09 — Contratos sin consumidor en el frontend

**Informativo.** No es un fallo: son contratos implementados (o en `501`) cuyas pantallas aún
muestran `PendingPage`.

| Contrato | Estado backend | Pantalla / responsable |
| --- | --- | --- |
| `GET/POST /projects/`, `/projects/{id}/`, `/projects/years/` | Implementado | Proyectos — Geo |
| `GET/POST /properties/`, `/properties/{id}/`, `/properties/facets/` | Implementado (RBAC) | Bienes raíces — Geo |
| `/admin/properties/trash/`, `.../restore/`, `.../permanent/` | Implementado (RBAC) | Panel de propiedades — Geo |
| `POST /inquiries/visits/` | Implementado | Modal «Solicitar visita» — Geo |
| `GET/PUT /company/`, `GET/PUT /institution/` | Implementado | Inicio / Nosotros y su panel — Leo |
| `GET /services/`, `/services/{id}/` | `501` (sin repositorio) | Servicios — Leo |
| `GET /search/` | `501` (sin repositorio) | Por asignar |
| `/admin/permissions/`, `/admin/roles/` | Implementado | Gestión de roles — por asignar (requiere `roles.manage`) |
| `/media/{id}/` (GET, DELETE) | Implementado | Sin uso; ver ADM-01 antes de exponer el borrado |

`adminSectionPermissions` en `adminData.js` ya define la sección `properties`. Quien implemente
ese panel puede reutilizar `canAccessAdminSection` y `hasAdminPermission` para mostrar
acciones por permiso: `properties.publish`, `properties.edit.own`, `properties.restore`, etc.

---

## Contratos verificados que sí se cumplen

| Operación | Comprobación |
| --- | --- |
| `POST /auth/login/` | Envía `{email, password}` y trata `401` y `429`. Con CF-01, lee `role`, `roles` y `permissions`. |
| `POST /auth/logout/` | Envía `{refresh}` y acepta `204`. El header `Authorization` sobra (la vista no autentica), pero no afecta. |
| `GET /news/` (público y admin) | `category`, `page` y `page_size` válidos. Lee `{count, page, page_size, results}`. Con token de Ingeniero incluye borradores. |
| `POST /news/`, `PATCH /news/{slug}/` | Respeta `title ≤ 160`, categorías `Anuncios/Eventos/Proyectos`, fecha ISO e imagen HTTPS o `/media/…` de hasta 500 caracteres. Envía `demo` y `published` explícitos: el backend usa `true` por defecto en ambos. Publicar usa un `PATCH` parcial. |
| `DELETE /news/{slug}/` | Acepta `204` sin cuerpo. |
| `POST /admin/media/` | `multipart/form-data` con `file` y `kind=news`. Tipos y tamaño (10 MB) iguales a `MEDIA_ALLOWED_CONTENT_TYPES` y `MEDIA_MAX_UPLOAD_BYTES`. Valida la `url` devuelta con las mismas reglas que `MediaReferenceField`. |
| `GET /inquiries/` | `kind`, `status`, `page` y `page_size` válidos. `normalizeInquiry` admite los campos nulos de `InquirySerializer`. |
| `PATCH /inquiries/{id}/` | Solo avanza `nuevo → atendido → archivado`, la misma secuencia que impone `update_status`. |
| `POST /inquiries/contact/` | Nombre ≤ 120, teléfono de 8 dígitos normalizado, asunto ≤ 80, mensaje ≤ 2000 y honeypot `website` vacío. Trata `429` y `501`. Excepción: el correo (CF-05). |
| Errores | `apiClient` lee `{error: {code, message, details}}` y conserva `status`, `code` y `details`. |

## Próximos pasos sugeridos

1. CF-02 y CF-05 ya están resueltos en develop; conservar sus pruebas y el esquema generado actualizado.
2. Frontend: renovación de sesión y distinción `401`/`403` (CF-03, CF-04).
3. Acordar el permiso de subida de medios para los roles de propiedades (CF-06) antes de que
   Geo construya el panel de bienes raíces.
4. Probar CF-01 contra Django real: `seed_access_control` y una cuenta activa por cada rol,
   usando la colección `EnObra-RBAC` de Postman como referencia.
