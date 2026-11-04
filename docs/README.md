# Documentación de EnObra

<!-- enobra-documentacion-vigente -->
> Índice vigente, revisado el 3-nov-2026. Las guías describen código/operación;
> los informes fechados conservan únicamente su evidencia original.
<!-- /enobra-documentacion-vigente -->

## Para iniciar el manual técnico

1. [Base técnica y alcance](BASE-DOCUMENTACION-TECNICA.md).
2. [Inventario y sustituciones](INVENTARIO-DOCUMENTACION.md).
3. [Diccionario de los veinte modelos/tablas](DICCIONARIO-DATOS.md).
4. [Plantilla de elaboración del manual](PROMPT-MANUAL-TECNICO-ENOBRA.md).

## Sistema y contratos

- [Estado del proyecto](estado-proyecto.md), [arquitectura](arquitectura.md), [OpenAPI](openapi.yaml).
- [Backend](../backend/README.md), [frontend](../frontend/README.md), [panel/API](admin-backend.md).
- [Roles y permisos](RBAC.md), [política fija](politica-roles-fijos.md), [visibilidad](visibilidad-panel.md).
- [Usuarios API](usuarios-api.md), [Usuarios frontend](usuarios-frontend.md), [sesión por actividad](FE-08-renovacion-por-actividad.md).
- [Auditoría](auditoria.md), [papelera](papelera.md), [R2 privado](R2-configuracion.md).

## Configuración, trabajo y pruebas

- [Infraestructura](infraestructura.md), [Render](Render-backend.md), [operación](operacion-produccion.md).
- [P-02 y su programación existente](P02-limpieza-activa.md).
- [Pruebas aisladas y recorrido](probar-admin.md), [Postman y compatibilidad](postman/README.md), [exposición](demo/recorrido-jennifer.md).
- [Trabajo compartido](TRABAJO-EN-EQUIPO.md), [reglas](reglas-desarrollo.md), [responsables](responsables-y-cierres.md), [coordinación](dependencias-juan.md).

## Evidencia fechada conservada

- [Validación de esquema Supabase, BE-10](BE-10-validacion-supabase.md).
- [P-01 y roles, 28-oct](integracion-p01-roles-2026-10-28.md).
- [Matriz Supabase, 28-oct](INT-04-supabase-2026-10-28.md).
- [Render y R2, 3-nov](Render-validacion-2026-11-03.md).

Las etapas/planes/reportes sustituidos se retiraron del árbol actual y pueden
recuperarse por Git. El inventario enumera reemplazos; no enlazar documentos
retirados como si fueran instrucciones de operación. No se eliminaron datos,
cuentas, secretos ni archivos de aplicación al depurar Markdown.
