# Infraestructura vigente

Actualizado el 3-nov-2026. Esta página sustituye la propuesta inicial del 12-oct.
Ver [estado del proyecto](estado-proyecto.md) y [operación](operacion-produccion.md).

| Componente | Proveedor y estado |
| --- | --- |
| Frontend | Cloudflare Pages; dominio enobra.com.gt, producción frontend-dev. |
| Backend | Render Free; API HTTPS con Gunicorn y config.production; despliegue manual de develop. |
| Base de datos | PostgreSQL en Supabase; tablas existentes con modelos managed=False. |
| Fotos y renders | Cloudflare R2 privado; Django escribe y entrega bytes mediante la API. |
| Limpieza de papelera | GitHub Actions diario existente, backend fijado a revisión probada. |
| Health de API | Al visitar Inicio y al publicar develop; sin programación periódica. |

## Base y secretos

`DATABASE_URL` apunta al PostgreSQL existente de Supabase, con pooler de sesión
5432 y TLS en Render. No crear una base paralela ni ejecutar migraciones/seeds
para recrear tablas existentes. Mantener respaldos y comprobar restauración.
Las pruebas unitarias utilizan SQLite desechable; no acreditan Supabase por sí solas.

Credenciales y clave Django persistente se guardan como secretos del proveedor.
No llevar DSN, claves de R2 ni contraseñas a variables públicas VITE, docs o commits.

## Sitio y API

- Sitio: [enobra.com.gt](https://enobra.com.gt).
- API: [enobra-api.onrender.com](https://enobra-api.onrender.com/api/v1/health/).
- Pages incorpora VITE_API_BASE_URL durante el build; el proxy Vite solo existe
  en desarrollo. Ver [configuración de producción](operacion-produccion.md).
- CORS permite los orígenes HTTPS explícitos enobra.com.gt y www.enobra.com.gt.
- Render usa Gunicorn, dependencias con hashes y comprobaciones de producción.
  No usar runserver ni el disco efímero para imágenes reales.

## Imágenes privadas

Bucket `enobra-media-prod`, sin dominio público ni r2.dev, por decisión de Geovanny.
No conectar media.enobra.com.gt. El navegador consulta la API, no el endpoint S3.
Las publicaciones públicas habilitan lectura de sus fotos; borradores y papelera
conservan protección. Las vistas previas firmadas vencen a los quince minutos.

El backend valida archivo, tamaño y permiso, conserva metadatos en PostgreSQL y
protege el borrado de imágenes compartidas. Una imagen original migrada y leída
tras otro despliegue; cuatro originales de otras PC pendientes. No se borraron
registros para resolver esa diferencia. Ver [R2](R2-configuracion.md) y
[evidencia real](Render-validacion-2026-11-03.md).

## Operación y pendientes

- El ping de Inicio adelanta el arranque Free, sin garantizar servicio continuo.
  Actions reintenta health al publicar develop; no mantiene la API activa periódicamente.
- P-02 continúa en GitHub Actions; no duplicar Cron Job de Render ni restaurar la
  función SQL de limpieza retirada. [Evidencia P-02](P02-limpieza-activa.md).
- Configurar correo, verificar cuentas y recorridos reales por rol, recuperar
  originales, revisar límites/costos y probar restauración de Supabase.
- El dominio propio de API es opcional y sigue sin conectarse.

Referencias: [Render Free](https://render.com/docs/free),
[Render monorepos](https://render.com/docs/monorepo-support),
[R2 privado y acceso público](https://developers.cloudflare.com/r2/buckets/public-buckets/).
