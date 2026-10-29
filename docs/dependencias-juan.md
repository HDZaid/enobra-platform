# Dependencias de las tareas de Juan

> Estado vigente, 29-oct: [P-02 y papelera de 90 días](P02-papelera-90-dias.md). P-01 cerrado; función SQL antigua retirada de Supabase y ausencia verificada. La nueva limpieza corre desde el backend después de más de 90 días en papelera. Código y pruebas listos; falta activar/verificar el Cron Job en Render (Juan, respaldo Pablo). Los bloqueos anteriores por decidir P-01/P-02 y las políticas de inactividad de 3/8 meses quedan sustituidos. Jenny puede validar la habilitación del frontend con la versión integrada; no requiere otro OK de Henry.

> Acuerdo vigente del 29-oct: [responsables y cierres](responsables-y-cierres.md) sustituye las exclusividades y dependencias personales de Henry de este documento. Pablo puede integrar backend, modificar configuración y generar OpenAPI; Jenny integra frontend y Juan verifica despliegue, con los respaldos indicados. P-01 está cerrado. P-02 pasa a limpieza desde el backend tras más de 90 días en papelera; consultar su informe antes de dar por activada la ejecución automática.

Corte: 28 de octubre de 2026, Guatemala. Fuentes: [issue #8](https://github.com/HDZaid/enobra-platform/issues/8), [issue #15](https://github.com/HDZaid/enobra-platform/issues/15), [issue #16](https://github.com/HDZaid/enobra-platform/issues/16), [issue #18](https://github.com/HDZaid/enobra-platform/issues/18), planes y evidencia de `develop` y `backend-dev`. Este documento registra coordinación; no acredita acciones no realizadas ni cambia decisiones del equipo.

La issue #8 está cerrada: BE-04, BE-07, BE-09, BE-10 y BE-12 tienen commits. La #18 continúa abierta para seguimiento de integración y validación. El plan original denomina BE-12 documentación de auditoría y papelera; la #18 usa BE-12 para imágenes: confirmar esa diferencia al actualizar el tablero.

## Acciones relacionadas con Geo y Henry

| Estado | Responsable | Acción y relación con Juan | Evidencia o condición de cierre |
| --- | --- | --- | --- |
| Completado 28-oct | Henry (ejecutado en esta sesión por solicitud de Geo) | Integrar el backend revisado en `develop`, incluido P-01, para que la validación de Juan use la versión integrada. | `f468e65` integrado y publicado en `develop` mediante `7c6488f`. Conflictos de documentación resueltos conservando ambas aportaciones. Django check y 191 pruebas SQLite aprobados. |
| Roles y cuentas ficticias probados; cuentas permanentes pendientes | Henry; Juan valida datos | Resolver con el equipo la configuración de roles y cuentas reales para BE-10 y #15. | 28-oct: creados y verificados en Supabase Ingeniero (32 permisos), Arquitecta (6) y Empleado (4), todos activos. Se ejecutó seed sin opciones, autorizado por Geo, con copia previa de roles/permisos. Se crearon cuatro cuentas ficticias y se comprobó el login, la matriz real y el guardado en pantalla. Se desactivan al terminar las pruebas; faltan las cuentas permanentes del equipo, por lo que DATOS no se declara completo. Véase el informe enlazado al final. |
| Completado 28-oct por el agente a solicitud de Geo | Geo y Leo | Repetir la matriz INT-04 con los tres roles en el entorno real de pruebas, incluyendo los recorridos de papelera e historial que corresponda. Juan puede usar los resultados para validar BE-04 y BE-07. | Supabase: 70/70 comprobaciones HTTP aprobadas, con cuatro cuentas ficticias y versión integrada. Chromium: menús, pantallas restringidas y formulario con foto de cada rol comprobados. Véase `INT-04-supabase-2026-10-28.md`; despliegue y persistencia de imágenes siguen pendientes. |
| Pendiente de acuerdo | Henry, Juan e Ingeniero; coordinar con Pablo | Acordar la convivencia de la función SQL con la papelera, restauración, auditoría, metadatos y relaciones; identificar invocadores externos y manuales. | P-01 actualiza actividad y marcas en `backend-dev`; P-02 mantiene la función sin ejecutar. La consulta del 28-oct encontró pg_cron no instalado, pero no descartó invocadores externos. No activar la papelera de proyectos sobre Supabase hasta verificar la seguridad de la solución. |
| Pendiente de confirmación | Henry y Juan; responsable de despliegue por identificar | Confirmar proveedor y despliegue de imágenes persistentes para la validación de Juan. | BE-18 está asignado a Henry + Juan en el plan; existe una rama de preparación Cloudinary, pero no consta URL ni prueba de persistencia real. Identificar entorno y proveedor, y verificar subida y recuperación tras reinicio/despliegue. |
| Pendiente condicionado | Geo o Henry | Dar el OK para los pasos destructivos identificados en #15, una vez cumplidos los requisitos y conocido el alcance concreto. | #15 exige aviso en la issue y OK de Henry o Geo para pasos marcados; la aprobación debe ser explícita y específica. La decisión de P-01 no sustituye esa autorización. |
| Completado 28-oct | Geo | Actualizar el documento de estado de INT-05 con evidencia de los resultados reales y pendientes una vez disponibles. | `docs/estado-proyecto.md` y `docs/INT-04-matriz-roles.md` incluyen el nuevo corte, la evidencia de Supabase y los límites del despliegue. |

## Referencias y límites

- La issue #7 de Henry está cerrada y declara BE-00, BE-01/02/03, BE-05, BE-11 e INT-02/03 terminados. Los informes anteriores de Juan que los enumeran como pendientes describen un corte histórico; no volver a marcarlos como abiertos sin evidencia nueva.
- BE-09 necesita comprobar el envío SMTP en el entorno integrado (#18); no se encontró una asignación específica a Geo o Henry para esa prueba. El responsable del despliegue debe confirmar configuración y entorno con Juan.
- El respaldo restaurado de `public` del 24-oct no demuestra un respaldo completo y actual de Supabase. La responsabilidad de respaldo figura en #15 y en el estado del proyecto para Juan.
- P-01 se verificó con 191 pruebas SQLite y `manage.py check` en `backend-dev`; no demuestra compatibilidad de la función SQL ni validación en Supabase.

Al completar una acción, la persona responsable o su agente debe actualizar su fila con fecha, versión o enlace a evidencia y resultado; conservar pendientes y limitaciones explícitos. No registrar secretos ni datos personales. Avisos por canales externos requieren autorización expresa.

## Avance del 28 de octubre

[Integración de P-01 y creación de roles en Supabase](integracion-p01-roles-2026-10-28.md): resultados comprobados, alcance y cuentas pendientes.

[Pruebas reales por rol del 28-oct](INT-04-supabase-2026-10-28.md): resultado y alcance de la nueva ejecución. Geo autorizó crear, publicar temporalmente y eliminar los datos ficticios de esta sesión; otros cambios reales requieren su alcance y autorización correspondientes.
