# EnObra — Bloque de cierre de Noticias, Contacto y Administración

## Propósito

Consolidar en una sola entrega las mejoras que se pueden terminar desde el **frontend** sin modificar contratos de Django, roles, bases de datos ni los módulos de otros integrantes. Se aplica sobre `feature/news-admin-contact` **después del push de las etapas 3 y 5**. No requiere instalar la etapa 4.

## Funcionalidad incluida en este bloque

### Editor administrativo de noticias

- Vista previa editorial mientras se escribe: título, categoría, fecha, portada y contenido. Se renderiza como texto React, no como HTML interpretado.
- Acciones explícitas: **Guardar cambios** (mantener estado al editar), **Guardar borrador** y **Guardar y publicar**.
- Aviso de cambios sin guardar al cancelar, cerrar con X, hacer clic fuera del diálogo o pulsar Escape. El usuario decide si descarta o sigue editando.
- Conteo de caracteres del título y del contenido; validación de título, categoría, fecha, descripción e imagen; validación de tipo y tamaño del archivo.
- Carga real de imagen por `POST /api/v1/admin/media/` y posterior guardado de noticia por `POST /api/v1/news/` o `PATCH /api/v1/news/{slug}/`. La vista previa usa memoria local y nunca escribe en Django.
- No se añade editor HTML ni formato enriquecido: el contrato actual de Noticias almacena `description` como texto.

### Tabla administrativa de noticias

- Filtros por categoría y por estado publicado/borrador; búsqueda por texto en la página visible; acciones crear, editar, publicar, retirar y eliminar con confirmación.
- Enlace para ver en el sitio una publicación real que ya está publicada.
- Reintento de consultas fallidas y botón para limpiar filtros.
- Fecha legible en español de Guatemala. Los filtros de texto y estado se aplican **solo a la página recibida** en sesiones reales, porque el backend no expone esos filtros globales.

### Sitio público de Noticias

- Categorías con URL compartible y paginación existente, fecha legible en tarjetas y detalles.
- Reintento de cargas fallidas y recuperación al encontrar una categoría o página vacía.
- No se muestran borradores desde la API pública. Los ejemplos de desarrollo se identifican como tales y no son datos reales.

### Contacto y bandeja

- Contacto: contador de caracteres del mensaje, límite de longitud de correo, texto de envío actualizado y confirmación únicamente cuando el servidor responde correctamente.
- Bandeja: reintentar al fallar la consulta, limpiar filtros, mostrar cantidad de elementos, evitar mostrar resultados antiguos al cambiar de filtro/página y ajustar la página cuando la cantidad de registros cambia.
- Estados de solicitudes: `nuevo → atendido → archivado`. **No se implementa eliminación de solicitudes reales.**

### Pruebas

- Nuevas pruebas de lógica editorial: cambios pendientes, vista previa, filtros de publicación y fechas.
- Nuevas pruebas HTTP simuladas para noticias (crear, publicar, eliminar), solicitudes (listar y actualizar) e imágenes (multipart, referencia segura).
- Las pruebas usan `fetch` simulado; **no prueban una base de datos o servidor Django en ejecución**.

## Rutas y contratos utilizados

| Uso | Método | Ruta |
| --- | --- | --- |
| Listar noticias | GET | `/api/v1/news/` |
| Crear noticia | POST | `/api/v1/news/` |
| Actualizar/publicar | PATCH | `/api/v1/news/{slug}/` |
| Eliminar noticia | DELETE | `/api/v1/news/{slug}/` |
| Subir imagen | POST multipart | `/api/v1/admin/media/` |
| Enviar contacto | POST | `/api/v1/inquiries/contact/` |
| Listar solicitudes | GET | `/api/v1/inquiries/` |
| Actualizar estado | PATCH | `/api/v1/inquiries/{id}/` |

Las operaciones administrativas envían `Authorization: Bearer <access>`. El contrato de `DELETE` de noticias ya existe en Django; no se extrapola a mensajes.

## Verificación local

Desde la raíz del repositorio:

```powershell
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run build
npm --prefix frontend run dev
```

Pruebas manuales recomendadas:

1. `/admin/login` → **Ver diseño de demostración** (solo en desarrollo).
2. **Noticias** → **Añadir noticia** → escribir campos y revisar **Vista previa editorial**.
3. Pulsar **Cancelar** tras modificar el título: debe ofrecer descartar o continuar.
4. Guardar como borrador, editar, publicar, retirar y eliminar una noticia de ejemplo. Recargar para comprobar que la demostración no persiste.
5. En Noticias administrativas, filtrar por categoría, publicación y texto; limpiar filtros.
6. `/noticias` → cambiar categoría y página; abrir un detalle; comprobar formato de fecha.
7. `/contacto` → validar campos vacíos y mensaje largo, y comprobar el contador.
8. **Mensajes** → filtrar, expandir, avanzar estado y comprobar que el modo de demostración no toca Django.
9. Cuando exista entorno de integración autorizado: repetir CRUD y subida de imágenes con datos de prueba, revisar `401/403`, `400`, `404`, `429`, `204` y conexión con Storage.

## Pendientes por acuerdo del equipo (no incluidos)

- **Eliminar mensajes reales:** no existe `DELETE /api/v1/inquiries/{id}/`; se requiere decidir si se permitirá borrado, papelera o solo archivo, y quién puede hacerlo.
- **RBAC real:** el frontend actual todavía valida `role: 'admin'`, mientras que el backend vigente usa permisos efectivos como `admin.all` y roles como `Ingeniero`. Se necesita confirmar la política de acceso y aplicar la corrección aprobada antes de validar el inicio de sesión real.
- **Renovación de JWT / persistencia de sesión:** el token de acceso expira; confirmar el comportamiento de renovación, cierre y almacenamiento seguro antes de implementarlo. No almacenar tokens en `localStorage` por conveniencia.
- **Almacenamiento de imágenes:** confirmar proveedor, URL pública, CORS y política de limpieza de archivos subidos cuando falle el guardado de la noticia.
- **Búsqueda global:** Django actualmente permite filtrar Noticias por categoría y Solicitudes por tipo/estado; filtros textuales y de publicación globales requerirían un cambio de API.
- **Datos finales del cliente:** confirmar publicaciones, fotografías y contenido institucional antes de reemplazar ejemplos.
- **Prueba de integración y aceptación:** requiere backend en ejecución y una cuenta autorizada. Las pruebas unitarias simuladas no sustituyen esta validación.

## Seguridad y límites

- No se modifican `backend/`, `.env`, autenticación, permisos, tablas ni datos reales.
- No se guardan credenciales ni solicitudes reales en memoria persistente del navegador.
- Los datos de demostración se muestran solo en modo de desarrollo y no se envían a Django.
- Las validaciones del frontend complementan, pero no sustituyen, las validaciones y autorizaciones del backend.
- Las imágenes deben servir desde URLs permitidas y los archivos deben respetar los límites de Django.

## Entrega Git

Después de instalar el bloque y comprobar que las tres verificaciones pasan:

```powershell
git diff --stat
git status --short
git add frontend/src/features/admin/ frontend/src/features/news/ frontend/src/features/contact/components/ContactForm.jsx frontend/tests/ frontend/ADMIN-CIERRE-FRONTEND.md
git diff --cached --stat
git commit -m "feat: complete news editor and frontend management polish"
git push origin feature/news-admin-contact
```

**No usar `git push --force` ni `git reset --hard`.** Si el instalador detecta cambios previos, detenerse y revisar el estado antes de copiar archivos.
