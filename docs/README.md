# Documentación de EnObra

**Empieza por [Estado del proyecto](estado-proyecto.md):** ramas, cifras de pruebas,
pendientes con responsable y decisiones recientes. Si otro documento lo contradice, vale
ese hasta su próxima actualización.

## Referencia vigente

| Documento | Para qué |
|---|---|
| [openapi.yaml](openapi.yaml) | Contrato HTTP entre backend y frontend (generado; no se edita a mano). |
| [RBAC.md](RBAC.md) | Los 32 permisos, roles predeterminados, seed, matriz rol × endpoint, reglas de seguridad y decisiones. |
| [adr/0001-rbac-por-datos.md](adr/0001-rbac-por-datos.md) | Por qué los roles son datos y la fábrica solo se usa para publicaciones. |
| [arquitectura.md](arquitectura.md) | Interfaces, registro, `bindings.py`, fábrica de publicaciones; cómo agregar un tipo. |
| [admin-backend.md](admin-backend.md) | Cómo se guardan los datos del panel sobre las tablas existentes (sin migraciones) y las sesiones. |
| [papelera.md](papelera.md) | Rutas, restauración, permisos y conflicto con la limpieza SQL de Supabase. |
| [auditoria.md](auditoria.md) | Historial: eventos, filtros, paginación y exportación CSV. |
| [usuarios-api.md](usuarios-api.md) | Crear y editar cuentas, cambiar rol y sus reglas. |
| [despliegue.md](despliegue.md) | Cloudflare Pages, Render, Supabase, Cloudinary y Resend: variables y pasos. |

## Pruebas

| Documento | Para qué |
|---|---|
| [INT-04-matriz-roles.md](INT-04-matriz-roles.md) | Qué puede cada rol, probado en la API, Postman y el panel. |
| [postman/README.md](postman/README.md) | Colecciones de Postman y cómo correrlas con Newman. |
| [BE-10-validacion-supabase.md](BE-10-validacion-supabase.md) | Comprobación de solo lectura del esquema real de Supabase (23-oct). |

## Pendientes con Supabase

| Documento | Para qué |
|---|---|
| [BE-04-compatibilidad-limpieza-supabase.md](BE-04-compatibilidad-limpieza-supabase.md) | La función `limpiar_proyectos_inactivos()` frente a la papelera. Leer antes de usar la papelera en la base real. |
| [propuesta-tablas-imagenes.md](propuesta-tablas-imagenes.md) | Tablas de imágenes propuestas (no aplicadas) y su [SQL](sql/propuesta-tablas-imagenes.sql). |

## Equipo y plan

| Documento | Para qué |
|---|---|
| [TRABAJO-EN-EQUIPO.md](TRABAJO-EN-EQUIPO.md) | Ramas compartidas, sincronización, hooks y commits. **Regla vigente.** |
| [reglas-desarrollo.md](reglas-desarrollo.md) | Responsables por área, contratos y criterios de entrega. |
| [plan/](plan/) | Plan de entrega del 25-oct (maestro, backend y frontend) y backlog BE-14 a BE-22. |

Los informes por etapa y por rama de octubre se retiraron el 25-oct porque sus cifras y
pendientes quedaron consolidados en el estado del proyecto. Siguen en el historial de Git.
