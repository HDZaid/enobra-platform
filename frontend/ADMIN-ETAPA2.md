# EnObra — Administración, etapa 2: CRUD de Noticias

## Qué incluye

- Listado de noticias en `/admin/noticias` con búsqueda, categoría, paginación y estados.
- Editor de **crear / editar** con título, categoría (`Anuncios`, `Eventos`, `Proyectos`), fecha, descripción, portada, marca de ejemplo y publicación.
- Confirmación antes de **eliminar**.
- Validación de campos, fechas e imágenes (JPG/PNG/WebP/GIF; hasta 10 MB, según la configuración Django consultada).
- Vista previa **interactiva solo en memoria**: permite ensayar el CRUD con ejemplos, incluso con imágenes locales seleccionadas; no persiste, no se refleja en el sitio público y se pierde al recargar. No se usa `localStorage`.
- Indicador de Noticias del dashboard actualizado cuando se modifica la vista previa.

## Integración futura con el backend (rama de compañeros)

| Acción | Método y ruta | Servicio React |
| --- | --- | --- |
| Listar noticias | `GET /api/v1/news/` | `newsService.list` |
| Crear noticia | `POST /api/v1/news/` | `newsService.create` |
| Editar noticia | `PATCH /api/v1/news/{id}/` | `newsService.update` |
| Eliminar noticia | `DELETE /api/v1/news/{id}/` | `newsService.remove` |
| Subir portada | `POST /api/v1/admin/media/` (`multipart/form-data`, campos `file`, `kind=news`) | `adminMediaService.uploadNewsImage` |

El formulario envía **solo** `title`, `category`, `date`, `description`, `image`, `demo`, `published`.

**Restricción importante:** el backend acepta en `image` una URL `https://...` o una ruta `/media/...`, no acepta `/assets/...`, `data:` ni `blob:`. El editor mantiene esta separación. Las fotos seleccionadas en vista previa se guardan únicamente como datos temporales en la memoria de React; en modo real primero se suben mediante la API de medios y después se guarda la referencia devuelta. Si Django responde `501`, `401`, `403` o falla, la interfaz **no anuncia un guardado exitoso**.

La subida de archivos y su persistencia dependen de la implementación de Django y de la configuración del Storage que el equipo elija. Si la carga se completa pero falla la creación/edición, el backend debe definir cómo limpiar medios huérfanos. No se implementa ni se configura un proveedor de almacenamiento desde React.

## Archivos del parche

- `frontend/src/features/admin/pages/AdminNewsPage.jsx`
- `frontend/src/features/admin/components/AdminNewsEditor.jsx`
- `frontend/src/features/admin/services/adminMediaService.js`
- `frontend/src/features/admin/utils/newsEditor.js`
- `frontend/src/components/layout/AdminLayout.jsx`
- `frontend/src/features/admin/components/AdminShell.jsx`
- `frontend/src/features/admin/pages/AdminDashboardPage.jsx`
- `frontend/tests/adminNewsEditor.test.mjs`
- `frontend/ADMIN-ETAPA2.md`

No se modifica `backend/`, ni las páginas públicas, ni el código de Leo o Geovani. Este ZIP es **incremental** y presupone que ya aplicaste el parche de Administración etapa 1.

## Pruebas en PowerShell

Desde la raíz de `enobra-platform`:

```powershell
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run build
git status --short
npm --prefix frontend run dev
```

Entra a `http://localhost:5173/admin/login`, elige **Ver diseño de demostración**, luego **Noticias**. Prueba crear una noticia, cambiar su categoría, editarla, seleccionar una imagen local y eliminarla; verifica que el indicador de Noticias se actualice. Recarga la página: los cambios de prueba deben desaparecer. No es necesario levantar Django.

**Antes de crear el commit**, comparte los resultados de lint/test/build y el estado de Git. Revisa el diseño con el mockup aprobado. Después puede prepararse un PR de `feature/news-admin-contact` hacia `frontend-dev` cuando el equipo acuerde integrarlo.
