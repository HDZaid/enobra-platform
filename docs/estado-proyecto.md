# Estado del proyecto EnObra

<!-- enobra-documentacion-vigente -->
> Guía vigente. Revisión documental: 17-nov-2026.
> [Base y límites técnicos](BASE-DOCUMENTACION-TECNICA.md). Las evidencias no se reinterpretan como nuevas ejecuciones.
<!-- /enobra-documentacion-vigente -->
Revisado el 17 de noviembre de 2026 (Guatemala). Las guías del 3 de noviembre
se contrastaron con GitHub, el código y las URL públicas. El
[inventario](INVENTARIO-DOCUMENTACION.md) y la
[base técnica](BASE-DOCUMENTACION-TECNICA.md) reúnen las fuentes para el manual.

## Servicios y ramas

| Componente | Estado comprobado |
| --- | --- |
| Frontend | Cloudflare Pages, [enobra.com.gt](https://enobra.com.gt); producción desde `frontend-dev`. |
| API | [Render health](https://enobra-api.onrender.com/api/v1/health/), Gunicorn, Python 3.12.16, plan Free y despliegues manuales desde `develop`. |
| Datos | PostgreSQL existente de Supabase, pooler de sesión y TLS; sin recreación de tablas. |
| Imágenes | R2 privado; fotos públicas mediante la API, borradores protegidos y vistas previas temporales. |
| Limpieza | P-02 completo: GitHub Actions diario; no crear Cron Job adicional en Render. |

| Rama | Revisión comprobada en GitHub al 17-nov |
| --- | --- |
| `frontend-dev` | `aa96acd`, [18 commits por delante de `develop`](https://github.com/HDZaid/enobra-platform/compare/eb80cea...aa96acd). Los cambios funcionales son de frontend. |
| `develop` y `backend-dev` | Ambas en `eb80cea`. Comparten backend y contrato. |
| `main` | `f41e968`, rama estable y fuente del workflow diario de limpieza. |

Cloudflare Pages toma su frontend de `frontend-dev` y Render toma su API de
`develop` mediante despliegue manual.

## Cambios completados

- Arranque de producción con Gunicorn, dependencias fijadas con hashes, clave
  persistente válida y validación obligatoria de PostgreSQL, hosts y orígenes.
- HTTPS, proxy, cabeceras, CORS y lecturas de Supabase comprobados desde Render.
- Frontend conectado a Render mediante `VITE_API_BASE_URL` de producción en Pages;
  reconstrucción publicada. El 405 del login se debía a enviar POST al sitio estático.
- Un original migrado a R2 y recuperado por la API tras otro despliegue con igual
  SHA-256; se conservaron los cinco metadatos y la copia local. Protección contra
  eliminar imágenes usadas por publicaciones, borradores o papelera.
- Inicio (`/`) dispara una petición adicional a health por carga de aplicación,
  sin credenciales y sin bloquear el contenido. Otras rutas no disparan ese ping.
- GitHub Actions verifica health al publicar en `develop`, con hasta cinco intentos,
  pausas de 15 segundos y 75 segundos por solicitud. **Sin ping periódico** por
  decisión final de Geovanny. Se puede repetir desde Re-run all jobs.
- Renovación de sesión por actividad y límite de inactividad implementados:
  [FE-08](FE-08-renovacion-por-actividad.md). J-01/CF-03 ya no está pendiente de código.
- Política fija Administrador/Arquitecto/Empleado integrada; no hay editor de roles
  personalizables. La autorización efectiva la aplica el backend:
  [política vigente](politica-roles-fijos.md).

## Avances de frontend desde el 3 de noviembre

- Pages genera una copia del catálogo de Proyectos y Bienes raíces durante el
  build. Las vistas usan caché local de hasta siete días o la copia estática
  mientras responde Render. El [runbook](operacion-produccion.md#copia-pública-del-catálogo-en-pages)
  explica el refresco y las imágenes que pueden seguir en un build anterior.
- Con datos guardados, la etiqueta de cada tarjeta y ficha (Venta/Alquiler en
  Bienes raíces; categoría y año en Proyectos) muestra un indicador de carga hasta
  que la API confirma. Si la API falla, indica «Sin confirmar» y permite reintentar.
- Las imágenes admiten hasta 15 MB y 40 megapíxeles. El backend guarda versiones
  WebP de 1920 y 800 px y el sitio pide la adecuada a cada vista; la copia de
  Pages usa la de 1920. [Guía para subir renders](guia-renders-arquitecto.md).
- Inicio muestra proyectos publicados y consulta noticias publicadas. Los
  catálogos incorporan álbumes y selección de Venta/Alquiler en Bienes raíces.
- Las fichas generan mensajes de WhatsApp con el enlace a la publicación.
  Pages Functions prepara metadatos de vista previa para los enlaces compartidos.
- Resumen muestra accesos rápidos según permisos y avisa si falta la copia del
  catálogo, falló su generación o difiere de la API. Usuarios distingue cuentas
  activas e inactivas y oculta las de prueba o internas en el listado.

## Validación y alcance

| Evidencia | Resultado |
| --- | --- |
| Sitio público, 17-nov | Inicio y `/admin/login` devolvieron HTTP 200 y sirvieron el mismo bundle de Pages. El preflight CORS del login devolvió HTTP 200 para el origen público. |
| Copia estática, 17-nov | `/data/catalog-snapshot.json` devolvió HTTP 200 y `status: ok` en el dominio y en Pages. Fue generada el 12-nov a las 19:47 (Guatemala) y contenía cero proyectos, propiedades e imágenes. |
| API de Render, 17-nov | Health, Empresa, Proyectos y Bienes raíces devolvieron HTTP 200. Ambos listados tuvieron `count: 0`. Servicios y búsqueda devolvieron HTTP 501. |
| Frontend local `aa96acd`, 17-nov | 203 pruebas aprobadas y lint correcto. |
| Versiones reducidas de imágenes, 17-nov | Backend: 244 pruebas y `check` correctos; OpenAPI regenerado con validación (solo añade `w`). Frontend: 211 pruebas, lint y build. Render desplegó `develop` en `1e2ae02` (Live, 17-nov 23:57, health 200) y Pages sirve el frontend nuevo. Las imágenes subidas antes no tienen versiones y se entregan en su tamaño original. |
| Etiquetas pendientes de confirmar, 17-nov | 208 pruebas, lint y build correctos. En navegador local, con caché sembrada y una API simulada lenta y fallida, se vieron los estados de carga y «Sin confirmar» en listado, ficha e Inicio. |
| Backend de producción `912d916`, 3-nov | [238 pruebas aprobadas en CI](https://github.com/HDZaid/enobra-platform/actions/runs/41770108190). [Despliegue y persistencia de una imagen en R2](Render-validacion-2026-11-03.md). |
| Panel con Supabase, 28-oct | 70/70 comprobaciones de roles, imágenes y publicación con API local y cuentas ficticias. [Informe de QA](INT-04-supabase-2026-10-28.md). |
| Restauración aislada | PostgreSQL 17.11 restauró el esquema `public` del respaldo del 24-oct con 22 tablas y 76 registros. [Evidencia de Juan](https://github.com/HDZaid/enobra-platform/issues/15#issuecomment-6430043884). |

## Pendientes y verificaciones abiertas

- **Implementación.** Servicios y búsqueda global de la API siguen sin
  repositorios registrados. La página pública de Servicios tiene contenido de
  referencia. Empresa responde por API y alimenta el sitio público. Su edición
  desde el panel sigue sin pantalla.
- **Validación en producción.** Falta evidencia de un recorrido autenticado por
  rol y de subir y publicar una imagen desde el panel desplegado. Está acreditada
  la prueba local contra Supabase y la recuperación por Render de una imagen
  migrada a R2. Los catálogos públicos vacíos no permiten comprobar hoy un
  álbum con imágenes reales.
- **Correo.** El notificador existe. La última configuración documentada usó
  `dummy` y no hay evidencia de entrega en producción. El enlace de WhatsApp
  prepara otro canal de contacto.
- **Datos.** La recuperación de cuatro originales del inventario del 3-nov quedó
  aplazada. La depuración de cuentas espera los correos que el usuario indique
  para Admin e Ingeniero. El filtro de Usuarios es visual. Preservar el actor
  técnico de P-02 y revisar sus relaciones de auditoría. Ingeniero es alias de
  Administrador en la política vigente.
- **Respaldos.** La restauración histórica de `public` está comprobada. Falta
  evidencia de recuperación aislada de un respaldo vigente con el alcance
  completo de producción, incluidos los objetos de R2.
- **Documentación.** El repositorio contiene la base, el diccionario y la
  plantilla del manual técnico. La entrega final no figura en Git. La colección
  RBAC de Postman conserva rutas retiradas y requiere alinearse con OpenAPI.

## Documentación de referencia

- [Operación y solución de problemas](operacion-produccion.md).
- [Infraestructura vigente](infraestructura.md), [Render](Render-backend.md), [R2](R2-configuracion.md).
- [Coordinación de backend y datos](dependencias-juan.md), [pruebas del panel](probar-admin.md).
- [Trabajo en equipo](TRABAJO-EN-EQUIPO.md), [OpenAPI](openapi.yaml).

Los informes fechados conservados acreditan su entorno y fecha, sin sustituir el
código o contratos vigentes. Las etapas ADMIN/NEWS, planes de entrega de octubre y
reportes de integración sustituidos se eliminaron del árbol actual; el historial
Git permite recuperarlos. No se alteraron aplicación, infraestructura ni datos
para realizar esta revisión documental.
