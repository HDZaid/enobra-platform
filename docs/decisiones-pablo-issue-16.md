# Decisiones de Pablo — issue #16

> Estado final del 29-oct: [limpieza diaria activa](P02-limpieza-activa.md) en GitHub Actions, gratuita para este repo público. Simulación y ejecución real aprobadas (0 publicaciones vencidas). P-02 y su automatización están completas. El pendiente de activar un Cron Job en Render que aparezca abajo es histórico y queda sustituido; no crear un servicio duplicado. Mantenimiento: Pablo, respaldo Juan.

> Estado vigente, 29-oct: [P-02 y papelera de 90 días](P02-papelera-90-dias.md). P-01 cerrado; función SQL antigua retirada de Supabase y ausencia verificada. La nueva limpieza corre desde el backend después de más de 90 días en papelera. Código y pruebas listos; falta activar/verificar el Cron Job en Render (Juan, respaldo Pablo). Los bloqueos anteriores por decidir P-01/P-02 y las políticas de inactividad de 3/8 meses quedan sustituidos. Jenny puede validar la habilitación del frontend con la versión integrada; no requiere otro OK de Henry.

Fecha: 26 de octubre de 2026 (Guatemala). Rama: `backend-dev`.
Las cinco decisiones fueron confirmadas por el solicitante durante esta sesión.
Las casillas de la issue representan decisiones tomadas, no despliegue terminado.

| Punto | Decisión | Alcance y pendientes |
| --- | --- | --- |
| P-01 | Actualizar `fecha_ultima_actividad` al crear, editar y restaurar proyectos. Al restaurar, cambiar `estado_limpieza` a `ACTIVO` y limpiar `fecha_marcado_eliminacion`. | Implementado en el repositorio ORM, sin cambios de esquema. Editar actualiza actividad pero no borra marcas anteriores; enviar a papelera conserva los campos SQL. |
| P-02 | Retirar la función SQL y limpiar desde el backend publicaciones con más de 90 días en papelera. | Decisión confirmada por Geovanny el 29-oct; función retirada y código probado. Falta activar/verificar el Cron Job en Render (Juan, respaldo Pablo). Véase el informe vigente. |
| P-03 | Usar contenido de referencia en la entrega; implementar Servicios y Búsqueda en backlog (BE-17). | Sus endpoints conservan 501 `not_implemented`; no se conectan repositorios ficticios ni se presenta el contenido de referencia como datos de la API. |
| P-04 | Dejar la protección de imágenes en uso para backlog (ADM-01/BE-16), con aviso en la demo. | No se implementa aún `409 media_in_use`. Avisar que borrar un medio usado puede romper imágenes de publicaciones. |
| P-05 | Proyectos distingue propio/cualquiera como Propiedades (DEC-07). | Ya implementado: `projects.edit.own/any` y `projects.trash.own/any`; los permisos propios se limitan a borradores propios. Restaurar y eliminar permanentemente tienen permisos separados. No cambiar los roles existentes. |

## Entrega y comprobaciones

P-01 usa la misma transacción de negocio, metadatos e historial. Un fallo al
restaurar revierte también la actividad y las marcas SQL. Se conserva el estado
publicado/borrador previo a la papelera. Propiedades y Noticias conservan su ciclo.
El contrato HTTP no cambia; no se requiere regenerar OpenAPI por esta modificación.

Pruebas: creación y edición renuevan actividad; restauración de publicaciones y
borradores reinicia marcas; un fallo de auditoría revierte la restauración completa.
La suite existente verifica permisos propios/ajenos de Proyectos y respuestas 501.
Las pruebas usan SQLite aislado, no acreditan ejecución ni concurrencia de la
función PostgreSQL. No se ejecutan migraciones, seeds ni escrituras en Supabase.

Resultado de esta sesión: `python manage.py check` sin incidencias y
`python manage.py test tests --settings=config.test_settings`: **191 pruebas
aprobadas**. `git diff --check` sin errores. Decisiones publicadas con fecha en
[la issue #16](https://github.com/HDZaid/enobra-platform/issues/16#issuecomment-6430979702),
con las cinco casillas marcadas y la issue abierta para seguimiento. Al cierre del
26 de octubre los cambios permanecieron locales. El 28 de octubre el solicitante
autorizó su commit y publicación en `backend-dev`.

Antes de habilitar limpieza automática, revisar el cuerpo SQL real y todos sus
invocadores, decidir exclusión de papelera y tratamiento de borradores ya marcados,
auditoría, metadatos y relaciones; validar en un entorno de pruebas de Supabase
siguiendo #15. El plazo de ocho meses mencionado en `papelera.md` sigue pendiente.
