# P-01 y roles de Supabase

Fecha: 28 de octubre de 2026, Guatemala. Acciones solicitadas por Geovanny en esta sesión.

## Arreglo incorporado

El cambio de Pablo `f468e65` se integró y publicó en `develop` con el merge `7c6488f`. Se resolvieron los conflictos de los documentos de planificación conservando el estado completado de las tareas y las aportaciones de ambos equipos. `manage.py check` sin incidencias y 191 pruebas aprobadas con SQLite aislado después de resolver los conflictos. No cambió el contrato HTTP.

## Roles creados en Supabase

Se usó la conexión PostgreSQL del backend. `manage.py check_database` confirmó conexión y columnas de las 20 tablas requeridas, en modo de solo lectura. Antes del alta había un rol ADMIN y 31 permisos. Se guardó una copia local de roles, permisos y sus relaciones en el directorio temporal del equipo; esta copia no constituye un respaldo completo de Supabase.

Se ejecutó `manage.py seed_access_control` sin opciones, con autorización de Geovanny. Resultado: 12 permisos creados, 10 descripciones actualizadas, 3 roles creados, 42 relaciones de permisos agregadas y ninguna quitada. Se conservó el rol ADMIN existente. No se crearon usuarios ni se ejecutaron migraciones.

Comprobación posterior contra Supabase, con consultas de solo lectura:

| Rol | Estado | Permisos | Coincide exactamente con la configuración del proyecto |
| --- | --- | --- | --- |
| Ingeniero | Activo | 32 | Sí |
| Arquitecta | Activo | 6 | Sí |
| Empleado | Activo | 4 | Sí |

La base conserva permisos antiguos adicionales al catálogo vigente de 32 permisos. No se eliminaron ni se asignaron a los tres roles nuevos.

## Lo que falta para Juan

Los roles ya están disponibles para asignarlos desde el panel. Faltan cuentas de prueba autorizadas con esos roles y verificar que cada una puede entrar y ve lo que le corresponde. No se certifican todavía las pruebas por rol, el despliegue ni el cierre completo de #15. Geo/Leo realizan la matriz real una vez preparadas esas cuentas; Henry coordina su preparación con Juan.

P-02 continúa pendiente: esta sesión no ejecutó ni modificó `limpiar_proyectos_inactivos()` y no comprobó invocadores externos. Incorporar P-01 y crear roles no habilita la papelera de proyectos sobre Supabase.
