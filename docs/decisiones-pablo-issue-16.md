# Decisiones de Pablo — issue #16

Fecha: 26 de octubre de 2026 (Guatemala). Rama: `backend-dev`.
Las cinco decisiones fueron confirmadas por el solicitante durante esta sesión.
Las casillas de la issue representan decisiones tomadas, no despliegue terminado.

| Punto | Decisión | Alcance y pendientes |
| --- | --- | --- |
| P-01 | Actualizar `fecha_ultima_actividad` al crear, editar y restaurar proyectos. Al restaurar, cambiar `estado_limpieza` a `ACTIVO` y limpiar `fecha_marcado_eliminacion`. | Implementado en el repositorio ORM, sin cambios de esquema. Editar actualiza actividad pero no borra marcas anteriores; enviar a papelera conserva los campos SQL. |
| P-02 | Mantener `limpiar_proyectos_inactivos()` sin ejecutar durante la entrega, hasta resolver su compatibilidad con papelera, auditoría y metadatos. | Restricción operativa pendiente de verificar por el responsable de Supabase (#15). Esta sesión no desactiva ni inspecciona invocadores reales. No habilitarla solo porque P-01 esté implementado. |
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
