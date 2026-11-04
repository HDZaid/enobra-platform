# Estado del proyecto EnObra

<!-- enobra-documentacion-vigente -->
> Guía vigente. Revisión documental: 3-nov-2026.
> [Base y límites técnicos](BASE-DOCUMENTACION-TECNICA.md). Las evidencias no se reinterpretan como nuevas ejecuciones.
<!-- /enobra-documentacion-vigente -->
Actualizado el 3 de noviembre de 2026, Guatemala. Este documento resume el estado
actual; los informes fechados conservan su evidencia y sus límites. Los documentos sustituidos se retiran del árbol actual y siguen recuperables en
Git. La [base técnica](BASE-DOCUMENTACION-TECNICA.md) e
[inventario](INVENTARIO-DOCUMENTACION.md) preparan el manual técnico.

## Servicios y ramas

| Componente | Estado comprobado |
| --- | --- |
| Frontend | Cloudflare Pages, [enobra.com.gt](https://enobra.com.gt); producción desde `frontend-dev`. |
| API | [Render health](https://enobra-api.onrender.com/api/v1/health/), Gunicorn, Python 3.12.16, plan Free y despliegues manuales desde `develop`. |
| Datos | PostgreSQL existente de Supabase, pooler de sesión y TLS; sin recreación de tablas. |
| Imágenes | R2 privado; fotos públicas mediante la API, borradores protegidos y vistas previas temporales. |
| Limpieza | P-02 completo: GitHub Actions diario; no crear Cron Job adicional en Render. |

`backend-dev` y `frontend-dev` son las ramas compartidas de trabajo. `develop`
integra ambas y sus documentos mediante merge. `main` conserva la versión estable
y la automatización de limpieza existente. Los SHA de despliegue se registran en
la evidencia correspondiente; sincronizar ramas no despliega la API automáticamente.
El nuevo prompt del manual técnico aportado por el equipo se conserva en
[PROMPT-MANUAL-TECNICO-ENOBRA.md](PROMPT-MANUAL-TECNICO-ENOBRA.md).

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

## Validación y alcance

| Evidencia | Resultado |
| --- | --- |
| Backend de producción `912d916` | 238 pruebas aprobadas en Linux; [ejecución](https://github.com/HDZaid/enobra-platform/actions/runs/41770108190). |
| Integración `6a53f23` | [Health de Render](https://github.com/HDZaid/enobra-platform/actions/runs/41776192253) y [CI de producción](https://github.com/HDZaid/enobra-platform/actions/runs/41776192150) aprobados. Build de Pages publicado y comprobado en el dominio. |
| Frontend con ping de Inicio | Lint y build correctos; 191 pruebas, incluidas deduplicación, fallo de red y arranque de 45 segundos. |
| Render y R2 reales | [Informe de despliegue y persistencia](Render-validacion-2026-11-03.md). |
| Roles contra Supabase, 28-oct | 70/70 con cuentas ficticias, después desactivadas; API/panel locales. No equivale a validar usuarios reales en la URL desplegada. |

El aviso de bundle frontend superior a 500 kB sigue siendo no bloqueante.
Las pruebas aisladas no sustituyen recorridos con titulares reales en producción.

## Pendientes reales

- Login y recorrido autorizado por rol desde el frontend desplegado; subida y
  publicación desde el panel usando la API de Render. Cuentas activas/asignaciones
  consultadas en Supabase, sin recuperar contraseñas ni modificar usuarios.
- Cuatro originales de imágenes en otras computadoras, aplazados por el usuario.
  No se autorizó ni ejecutó una limpieza de la base por esta diferencia.
- Correo y destinatario: backend dummy en validación; no acredita entrega real.
- Servicios y buscador global conservan endpoints `501`; no darlos por implementados.
- El editor administrativo de Empresa/Nosotros sigue pendiente en frontend; la API
  correspondiente ya existe.
- Depurar las cuentas de Supabase después de la exposición del 4-nov-2026: objetivo
  de dos identidades humanas, Admin e Ingeniero, con correos aún por definir.
  No se han eliminado cuentas; revisar la cuenta técnica de P-02 y sus relaciones
  antes de preparar ese trabajo. Ingeniero equivale actualmente a Administrador.
- Revisar colecciones Postman frente a OpenAPI/política fija antes de usarlas como
  una matriz vigente; esta actualización documental no cambia sus JSON.
- Datos y contenido definitivo, respaldos y restauración de Supabase, dominio
  propio de API si se decide usarlo, y revisión de límites del plan gratuito.
- Render puede dormir por inactividad. El ping de Inicio adelanta el arranque;
  no garantiza disponibilidad continua ni elimina toda espera del primer visitante.

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
