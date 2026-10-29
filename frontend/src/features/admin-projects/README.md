# FE-07: administración de Proyectos

Rutas `/admin/proyectos`, `/nuevo` y `/:slug/editar`. Servicio administrativo separado
del público para conservar borradores. Lista paginada con filtro de año y búsqueda
sobre la página cargada. La categoría es texto libre con sugerencias de la primera
página del catálogo; no hay endpoint de categorías.

El formulario reutiliza FE-01b (Leo), permite fotos/renders, reordenamiento y YouTube,
valida antes de enviar y conserva el slug al editar. Envía siempre `demo: false` y
`published` explícito. Sin `projects.publish`, se guarda como borrador y se informa.
Bloquea guardado durante subidas y pide confirmación antes de salir con cambios.

`PROJECT_TRASH_ENABLED` está en true tras el cierre documentado de P-01/P-02.
El backend integrado envía a papelera mediante DELETE, conserva las imágenes y
permite restaurar el estado anterior. Usar este frontend junto al backend integrado,
nunca con la API antigua que eliminaba definitivamente en esa URL. La limpieza
programada actual actúa después de más de 90 días en papelera; referencia:
`docs/P02-limpieza-activa.md`. Los permisos se mantienen por acción y propietario;
la autorización definitiva pertenece a Django.

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

Habilitación revalidada: 182 pruebas frontend, lint/build y 27 pruebas backend de
papelera/retención. Chromium con Django/SQLite temporal verificó cancelar envío,
enviar desde Proyectos y restaurar desde Papelera, tanto publicado como borrador,
conservando imágenes/slug y ocultación pública durante la papelera. No se hicieron
escrituras en Supabase ni se desplegó una API web con estas pruebas.
