# FE-07: administración de Proyectos

Rutas `/admin/proyectos`, `/nuevo` y `/:slug/editar`. Servicio administrativo separado
del público para conservar borradores. Lista paginada con filtro de año y búsqueda
sobre la página cargada. La categoría es texto libre con sugerencias de la primera
página del catálogo; no hay endpoint de categorías.

El formulario reutiliza FE-01b (Leo), permite fotos/renders, reordenamiento y YouTube,
valida antes de enviar y conserva el slug al editar. Envía siempre `demo: false` y
`published` explícito. Sin `projects.publish`, se guarda como borrador y se informa.
Bloquea guardado durante subidas y pide confirmación antes de salir con cambios.

`PROJECT_TRASH_ENABLED` permanece en false. La API antigua elimina físicamente usando
el mismo DELETE; activar solo tras probar BE-04 en el backend integrado. El guardado,
la publicación y los borradores se probaron con Ingeniero (`admin.all`). Los permisos
finos dependen de BE-01/02 y no se certifican con el backend anterior. Las reglas
`edit.own`/`trash.own` suponen el filtrado de propietarios que debe hacer el servidor,
igual que en el módulo de propiedades; nunca sustituyen la autorización del backend.

Verificación: lint, 141 pruebas y build. Chromium con Django real, SQLite y archivos
temporales: alta con dos fotos, reordenamiento, publicación pública, edición, slug
estable, despublicación, edición de borrador, confirmación de cambios y ancho 390 px.
Se ejecutó `frontend/tests/browser/admin-projects.cjs` mediante un adaptador temporal
del runner aislado `backend/scripts/verify_frontend_integration.py`, cambiando solo
el destino de la prueba de navegador. Sin conexiones ni escrituras a Supabase.

La prueba de navegador requiere un entorno desechable con `INTEGRATION_BASE_URL`,
`INTEGRATION_EMAIL`, `INTEGRATION_PASSWORD` e `INTEGRATION_IMAGE` (PNG válido), además
de Playwright/Chromium configurados. No usarla contra datos o cuentas de producción.

Las imágenes retiradas o subidas sin guardar pueden permanecer en almacenamiento;
BE-16/BE-18 deben resolver referencias y limpieza recuperable. El formulario no
borra archivos automáticamente ni modifica el esquema SQL de imágenes.
