# Infraestructura vigente

<!-- enobra-documentacion-vigente -->
> Guía vigente. Revisión documental: 17-nov-2026.
> [Base y límites técnicos](BASE-DOCUMENTACION-TECNICA.md). Las evidencias no se reinterpretan como nuevas ejecuciones.
<!-- /enobra-documentacion-vigente -->
Actualizado el 17-nov-2026 con evidencia pública de Pages y Render.
Ver [estado del proyecto](estado-proyecto.md) y [operación](operacion-produccion.md).

| Componente | Proveedor y estado |
| --- | --- |
| Frontend | Cloudflare Pages. Dominio enobra.com.gt, producción desde frontend-dev, copia estática del catálogo. |
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
Django controla la lectura de imágenes en R2. Las vistas previas firmadas vencen
a los quince minutos. Pages puede servir copias de fotos que eran públicas al
compilar. Su refresco se describe en [operación](operacion-produccion.md#copia-pública-del-catálogo-en-pages).

El backend valida archivo, tamaño y permiso, conserva metadatos en PostgreSQL y
protege el borrado de imágenes compartidas. Una imagen original migrada y leída
tras otro despliegue. La recuperación de cuatro originales de otras PC quedó
aplazada en el inventario del 3-nov. Ver [R2](R2-configuracion.md) y
[evidencia real](Render-validacion-2026-11-03.md).

## Operación y pendientes

- El ping de Inicio adelanta el arranque Free, sin garantizar servicio continuo.
  Actions reintenta health al publicar develop; no mantiene la API activa periódicamente.
- P-02 continúa en GitHub Actions; no duplicar Cron Job de Render ni restaurar la
  función SQL de limpieza retirada. [Evidencia P-02](P02-limpieza-activa.md).
- El proveedor de correo y el recorrido autenticado en el panel siguen sin
  evidencia de validación en producción. Ver [estado](estado-proyecto.md).
- Existe una [restauración aislada del esquema `public` de octubre](https://github.com/HDZaid/enobra-platform/issues/15#issuecomment-6430043884).
  Falta comprobar un respaldo vigente con alcance de recuperación definido.
- El dominio propio de la API queda como opción operativa.

Referencias: [Render Free](https://render.com/docs/free),
[Render monorepos](https://render.com/docs/monorepo-support),
[R2 privado y acceso público](https://developers.cloudflare.com/r2/buckets/public-buckets/).

## Cuentas definitivas

El usuario definirá los correos de Admin e Ingeniero. Revisar las relaciones
del historial y conservar el actor técnico de P-02 al planificar la depuración.
El filtro de cuentas internas del panel solo cambia la presentación.
