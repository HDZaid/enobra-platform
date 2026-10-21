# Noticias — React + Tailwind + Lucide (EnObra)

Esta entrega corresponde solo al módulo público de Noticias de Jennifer.
Respeta los encabezados, textos, distribución de tarjetas y colores del mockup aprobado.
El estilo se implementa con Tailwind CSS v4, con Lucide React para iconos.

Rutas:
- `/noticias` — listado paginado.
- `/noticias/:slug` — detalle.

API ya definida en Django:
- `GET /api/v1/news/?page=1&page_size=12`
- `GET /api/v1/news/{news_id}/`
- Respuesta paginada `{count,page,page_size,results}`.

Si el backend no responde (error de red) o devuelve HTTP 501, en modo desarrollo
se muestran las dos noticias DEMO del mockup y se indican como ejemplos.
En producción no se sustituyen resultados ni errores reales por contenido demo.
Para deshabilitar la vista previa: `VITE_NEWS_PREVIEW=false` en `.env.local`.

No modifica `SiteLayout`, `AdminLayout`, `base.css`, `vite.config.js`, ni los
componentes de Leo y Geo. Cuando Leo integre el Header y Footer, se mostrará
automáticamente alrededor del contenido gracias a `SiteLayout`.

Las fuentes Inter y Outfit se referencian desde Google Fonts en un CSS de una
línea; se usan fuentes alternativas del sistema si la red no está disponible.
Las fotos incluidas provienen del mockup de referencia. El Storage real
sigue pendiente de decisión, sin dependencia obligatoria de un proveedor.

Para instalar este parche:
1. Estar en la rama `feature/news-admin-contact` creada desde `frontend-dev` actualizado.
2. Copiar la carpeta `frontend/` del ZIP encima de la misma carpeta del repositorio.
3. Comprobar cambios: `git status --short` (NO hacer `git add .` todavía).
4. Desde `frontend/`: `npm ci`, `npm run test`, `npm run lint`, `npm run build`, `npm run dev`.
5. Abrir `http://localhost:5173/noticias` y `http://localhost:5173/noticias/proximo-proyecto`.

Nota de integración: `src/app/router.jsx` se cambió mínimamente para registrar las
dos páginas. Si alguien modifica el enrutador mientras trabajas, compara ese
archivo antes de sustituirlo para no pisar rutas ajenas.
