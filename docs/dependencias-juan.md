# Coordinación de backend, despliegue y datos

<!-- enobra-documentacion-vigente -->
> Guía vigente. Revisión documental: 3-nov-2026.
> [Base y límites técnicos](BASE-DOCUMENTACION-TECNICA.md). Las evidencias no se reinterpretan como nuevas ejecuciones.
<!-- /enobra-documentacion-vigente -->
Estado consolidado del 3-nov-2026. Responsables/respaldo según
[acuerdo vigente](responsables-y-cierres.md); las asignaciones no exigen aprobación
personal de Henry ni cambian autorizaciones de datos.

| Trabajo | Estado | Próximo paso |
| --- | --- | --- |
| API y frontend | Render y Pages activos y conectados. | Probar login/operación por rol con titulares en las URL publicadas. |
| R2 privado | Una imagen migrada y recuperada tras otro despliegue. | Subida/publicación desde el panel; cuatro originales aplazados. |
| Medios compartidos | Borrado protegido y probado aisladamente. | Incluir el rechazo en QA sobre objetos de prueba autorizados. |
| Correo | Backend dummy en validación. | Definir proveedor/remitente/destinatario y comprobar entrega/fallos. |
| Servicios y búsqueda | Contratos sin repositorios, responden 501. | Implementar/registrar, probar filtros y exclusión de borradores/papelera. |
| P-01/P-02 | Limpieza por backend y programación diaria verificadas. | Mantener actor/secretos y SHA revisado; no crear otro cron ni reactivar SQL. |
| Cuentas de Supabase | Activas consultadas, sin modificar. | Después de exposición, definir las dos identidades humanas y preparar depuración. |
| Respaldos | Evidencia previa de exportación no prueba recuperación integral. | Validar respaldo actual y restauración en entorno adecuado. |

La exposición está prevista el 4-nov-2026. Correos de Admin e Ingeniero quedan por
definir; no publicarlos en Markdown. La política actual equipara Ingeniero a
Administrador. La cuenta técnica no interactiva de P-02 y sus relaciones deben
revisarse por separado; no se ha autorizado aquí una lista concreta de borrado.

Fuentes: [estado](estado-proyecto.md), [operación](operacion-produccion.md),
[Render/R2 verificados](Render-validacion-2026-11-03.md), [P-02](P02-limpieza-activa.md).
Los roles ya existen en código. No ejecutar seeds, recrear tablas ni atribuir a
una consulta de cuentas una prueba de inicio de sesión o de permisos en pantalla.
