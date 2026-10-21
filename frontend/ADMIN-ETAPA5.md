# EnObra — Etapa 5: publicación editorial y categorías de noticias

## Alcance

Esta entrega **solo modifica el frontend de Noticias**, tanto público como administrativo.
No modifica Django, las tablas, los roles, la autenticación ni la bandeja de mensajes.
Puede aplicarse encima de la etapa 2 y también es compatible con las etapas 3 y 4.

## Cambios

- **Noticias públicas:** selector de categoría (Todas, Anuncios, Eventos, Proyectos), enlazado con `?category=...` para que la URL pueda compartirse. El cambio de categoría regresa a la primera página y conserva otros parámetros de URL.
- **API:** `GET /api/v1/news/?category=...&page=...&page_size=...`, usando el filtro que ya ofrece Django. La paginación y el total se calculan sobre la categoría seleccionada.
- **Modo de muestra:** las publicaciones ficticias se filtran antes de paginar; no se mezclan con resultados reales.
- **Administración de noticias:** botón para publicar o pasar a borrador sin abrir el editor. Con Django se envía exclusivamente `PATCH /api/v1/news/{slug}/` con `{ "published": true/false }` y Bearer token; no se reemplazan los otros campos.
- **Modo demostración:** cambia el estado en memoria, muestra si un ejemplo está publicado o en borrador, y se revierte al recargar. Nunca hace peticiones de escritura.
- **Claridad:** se explica que la búsqueda textual del panel administrativo es **solo sobre la página cargada**, porque el backend aún no admite el filtro `q` en Noticias.
- **Concurrencia y errores:** se bloquean otras acciones de la tabla mientras se actualiza una publicación; la vista se recarga tras confirmar el cambio real.

## Pruebas

Desde la raíz del repositorio:

```powershell
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run build
npm --prefix frontend run dev
```

En el navegador:

1. Abrir `/noticias`, elegir **Eventos**, comprobar URL `?category=Eventos` y las tarjetas correspondientes; volver a **Todas**.
2. Entrar a `/admin/login` y abrir **Ver diseño de demostración**.
3. En **Noticias**, pulsar el icono de **Pasar a borrador** de una noticia y comprobar el nuevo estado.
4. Pulsar **Publicar** y comprobar que vuelve a **Publicado**; recargar para confirmar que la prueba no persiste.
5. Cuando exista un entorno Django de pruebas autorizado, verificar el mismo flujo con una cuenta administrativa y datos de prueba. No usar datos de producción para probar.

## Pendientes deliberadamente fuera de esta etapa

- Eliminar solicitudes reales: requiere acuerdo del equipo y un contrato `DELETE` en backend.
- Ajustes de RBAC, renovación JWT y permisos granulares: pendientes de coordinación.
- Búsqueda textual global de noticias: el backend solo admite `category`, `page` y `page_size`.

No ejecutar `git add`, `git commit` ni `git push` hasta validar el parche en el equipo local.
