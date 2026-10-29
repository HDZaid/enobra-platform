# Dependencias de las tareas de Juan

Corte: 28 de octubre de 2026, Guatemala. Fuentes: [issue #8](https://github.com/HDZaid/enobra-platform/issues/8), [issue #15](https://github.com/HDZaid/enobra-platform/issues/15), [issue #16](https://github.com/HDZaid/enobra-platform/issues/16), [issue #18](https://github.com/HDZaid/enobra-platform/issues/18), planes y evidencia de `develop` y `backend-dev`. Este documento registra coordinación; no acredita acciones no realizadas ni cambia decisiones del equipo.

La issue #8 está cerrada: BE-04, BE-07, BE-09, BE-10 y BE-12 tienen commits. La #18 continúa abierta para seguimiento de integración y validación. El plan original denomina BE-12 documentación de auditoría y papelera; la #18 usa BE-12 para imágenes: confirmar esa diferencia al actualizar el tablero.

## Acciones relacionadas con Geo y Henry

| Estado | Responsable | Acción y relación con Juan | Evidencia o condición de cierre |
| --- | --- | --- | --- |
| Pendiente | Henry | Integrar el backend revisado en `develop`, incluido P-01, para que la validación de Juan use la versión integrada. | `f468e65` está en `backend-dev`, no en `develop` al corte. La comprobación de merge detectó conflicto en `docs/plan/PLAN-MAESTRO.md`; conservar los cambios de ambos equipos y verificar el resultado. INT-02 original está cerrado; esta es una integración posterior. |
| Pendiente | Henry; Juan valida datos | Resolver con el equipo la configuración de roles y cuentas reales para BE-10 y #15. | El estado de `develop` asigna DATOS a Henry. En #15 se observó solo el rol ADMIN, 31 permisos y ninguna relación rol-permiso; confirmar estado actual, respaldo y entorno antes del seed acordado. No usar `--sync` sin decisión expresa. |
| Pendiente | Geo y Leo | Repetir la matriz INT-04 con los tres roles en el entorno real de pruebas, incluyendo los recorridos de papelera e historial que corresponda. Juan puede usar los resultados para validar BE-04 y BE-07. | La matriz anterior utilizó SQLite. Depende de cuentas, entorno y versión integrada; registrar fecha, versión, resultados y hallazgos sin credenciales ni datos personales. Respetar el orden y las autorizaciones de #15. |
| Pendiente de acuerdo | Henry, Juan e Ingeniero; coordinar con Pablo | Acordar la convivencia de la función SQL con la papelera, restauración, auditoría, metadatos y relaciones; identificar invocadores externos y manuales. | P-01 actualiza actividad y marcas en `backend-dev`; P-02 mantiene la función sin ejecutar. La consulta del 28-oct encontró pg_cron no instalado, pero no descartó invocadores externos. No activar la papelera de proyectos sobre Supabase hasta verificar la seguridad de la solución. |
| Pendiente de confirmación | Henry y Juan; responsable de despliegue por identificar | Confirmar proveedor y despliegue de imágenes persistentes para la validación de Juan. | BE-18 está asignado a Henry + Juan en el plan; existe una rama de preparación Cloudinary, pero no consta URL ni prueba de persistencia real. Identificar entorno y proveedor, y verificar subida y recuperación tras reinicio/despliegue. |
| Pendiente condicionado | Geo o Henry | Dar el OK para los pasos destructivos identificados en #15, una vez cumplidos los requisitos y conocido el alcance concreto. | #15 exige aviso en la issue y OK de Henry o Geo para pasos marcados; la aprobación debe ser explícita y específica. La decisión de P-01 no sustituye esa autorización. |
| Pendiente | Geo | Actualizar el documento de estado de INT-05 con evidencia de los resultados reales y pendientes una vez disponibles. | `docs/estado-proyecto.md` está en `develop`; registrar rama, versión, fecha y límites. No presentar pruebas SQLite como validación de Supabase. |

## Referencias y límites

- La issue #7 de Henry está cerrada y declara BE-00, BE-01/02/03, BE-05, BE-11 e INT-02/03 terminados. Los informes anteriores de Juan que los enumeran como pendientes describen un corte histórico; no volver a marcarlos como abiertos sin evidencia nueva.
- BE-09 necesita comprobar el envío SMTP en el entorno integrado (#18); no se encontró una asignación específica a Geo o Henry para esa prueba. El responsable del despliegue debe confirmar configuración y entorno con Juan.
- El respaldo restaurado de `public` del 24-oct no demuestra un respaldo completo y actual de Supabase. La responsabilidad de respaldo figura en #15 y en el estado del proyecto para Juan.
- P-01 se verificó con 191 pruebas SQLite y `manage.py check` en `backend-dev`; no demuestra compatibilidad de la función SQL ni validación en Supabase.

Al completar una acción, la persona responsable o su agente debe actualizar su fila con fecha, versión o enlace a evidencia y resultado; conservar pendientes y limitaciones explícitos. No registrar secretos ni datos personales. Avisos por canales externos requieren autorización expresa.
