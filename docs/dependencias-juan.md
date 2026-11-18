# Coordinación de backend, despliegue y datos

<!-- enobra-documentacion-vigente -->
> Guía vigente. Revisión documental: 17-nov-2026.
> [Base y límites técnicos](BASE-DOCUMENTACION-TECNICA.md). Las evidencias no se reinterpretan como nuevas ejecuciones.
<!-- /enobra-documentacion-vigente -->
Estado consolidado del 17-nov-2026. Responsables/respaldo según
[acuerdo vigente](responsables-y-cierres.md); las asignaciones no exigen aprobación
personal de Henry ni cambian autorizaciones de datos.

| Trabajo | Estado | Próximo paso |
| --- | --- | --- |
| API y frontend | Render y Pages respondieron el 17-nov. La copia del catálogo está publicada. | Registrar recorrido autenticado por rol con titulares. |
| R2 privado | Una imagen migrada y recuperada tras otro despliegue. | Registrar subida y publicación desde el panel. La recuperación de cuatro originales quedó aplazada. |
| Medios compartidos | Borrado protegido y probado en la suite aislada. | Conservar la cobertura y las referencias al publicar. |
| Correo | Notificador implementado. Configuración documentada con `dummy`. | Confirmar proveedor, remitente y destinatario y acreditar entrega. |
| Servicios y búsqueda | La API devolvió 501 el 17-nov. | Registrar repositorios y verificar resultados públicos. |
| P-01/P-02 | Limpieza por backend y programación diaria verificadas. | Mantener el actor, los secretos y el SHA revisado. |
| Cuentas de Supabase | El panel separa activas de inactivas y filtra cuentas internas. | El usuario definirá Admin e Ingeniero. Revisar historial, relaciones y actor técnico antes de depurar. |
| Respaldos | [Restauración aislada de `public` del 24-oct](https://github.com/HDZaid/enobra-platform/issues/15#issuecomment-6430043884). | Comprobar un respaldo vigente y el alcance de recuperación, incluidos los objetos de R2. |

Fuentes: [estado](estado-proyecto.md), [operación](operacion-produccion.md),
[Render/R2 verificados](Render-validacion-2026-11-03.md), [P-02](P02-limpieza-activa.md).
Los roles ya existen en código. No ejecutar seeds, recrear tablas ni atribuir a
una consulta de cuentas una prueba de inicio de sesión o de permisos en pantalla.
