# Documentación de EnObra

Empezar por [Estado del proyecto](estado-proyecto.md), actualizado al 3-nov-2026.
Los informes fechados y las entregas de origen son evidencia histórica; no sustituyen
el estado actual ni el contrato HTTP. No publicar secretos ni cuentas personales.

## Operación actual

- [Operación, ping de Inicio y diagnóstico](operacion-produccion.md).
- [Infraestructura vigente](infraestructura.md).
- [Backend en Render](Render-backend.md) y [evidencia del despliegue/R2](Render-validacion-2026-11-03.md).
- [R2 privado y fotos mediante API](R2-configuracion.md).
- [Limpieza diaria P-02 activa](P02-limpieza-activa.md).
- [Backend](../backend/README.md) y [frontend](../frontend/README.md): instalación y comprobaciones.

## Contratos y reglas

- [OpenAPI](openapi.yaml), [arquitectura](arquitectura.md), [backend administrativo](admin-backend.md).
- [Política de roles fijos](politica-roles-fijos.md); [RBAC](RBAC.md) conserva el origen del catálogo.
- [Sesión por actividad](FE-08-renovacion-por-actividad.md), [Usuarios API](usuarios-api.md), [Usuarios frontend](usuarios-frontend.md).
- [Auditoría](auditoria.md), [Papelera](papelera.md), [Postman](postman/README.md), [pruebas del administrador](probar-admin.md).
- [Trabajo compartido](TRABAJO-EN-EQUIPO.md), [responsables](responsables-y-cierres.md), [reglas](reglas-desarrollo.md).
- [Dependencias de Juan](dependencias-juan.md), [pendientes de Jennifer](PENDIENTES-JENNIFER.md).

## Historial y entrega

- [Estado archivado del 25-oct](estado-proyecto-2026-10-25.md), [historial de ramas](estado-ramas.md).
- [Matriz INT-04](INT-04-matriz-roles.md), [Supabase 28-oct](INT-04-supabase-2026-10-28.md).
- [Integración del frontend](frontend-integration.md), [integración React/Django](integracion-backend-frontend.md).
- [Contratos revisados](reporte-contratos-frontend.md), [revisión administrativa](reporte-revision-admin.md).
- [Prompt del manual técnico aportado por el equipo](PROMPT-MANUAL-TECNICO-ENOBRA.md).

Las cifras de pruebas de informes anteriores corresponden a sus revisiones. Los
informes ADMIN/NEWS y planes describen su fase de trabajo; no acreditan por sí solos
un despliegue ni autorizan cambios a datos, permisos o infraestructura.
