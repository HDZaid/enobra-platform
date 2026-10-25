# Documentación de EnObra

Esta carpeta reúne los acuerdos compartidos del equipo. Todo está sujeto a cambios:
las decisiones se revisan gradualmente y se actualizan junto con el código afectado.

- [Reglas de desarrollo y responsables](reglas-desarrollo.md): equipo, contratos,
  ramas, revisiones y criterios de entrega.
- [Infraestructura](infraestructura.md): PostgreSQL en Supabase como decisión y propuestas
  todavía pendientes para despliegue y almacenamiento de imágenes (entre ellas R2).
- [Contrato OpenAPI](openapi.yaml): referencia HTTP para backend y frontend.
- [Roles y permisos (RBAC)](RBAC.md): los 32 permisos, roles predeterminados, seed, matriz rol × endpoint y cómo agregar un permiso (BE-11).
- [Arquitectura del backend](arquitectura.md): interfaces, registro, `bindings.py` y la fábrica de publicaciones; cómo agregar un tipo (BE-11).
- [ADR 0001: roles en la base de datos](adr/0001-rbac-por-datos.md): por qué los roles son datos y la fábrica solo se usa para publicaciones (BE-11).
- [Auditoría administrativa](auditoria.md): API integrada, eventos, permisos, filtros, paginación y exportación CSV protegida (BE-12).
- [Papelera de publicaciones](papelera.md): rutas reales, restauración, permisos, imágenes en JSON y límites de limpieza SQL (BE-12).
- [Backend del administrador](admin-backend.md): implementación, mapeo sobre tablas existentes y pruebas aisladas.
- [Cómo probar el administrador](probar-admin.md): comandos, script HTTP y recorrido manual con Swagger.
- [Colección de Postman](postman/README.md): todos los endpoints, entorno local y prueba de imágenes.
- [Reporte de revisión administrativa](reporte-revision-admin.md): hallazgos, evidencia y pasos de reproducción.
- [Reporte de contratos frontend ↔ backend](reporte-contratos-frontend.md): diferencias entre lo que consume React y lo que implementa Django.
- [Backend](../backend/README.md) y [frontend](../frontend/README.md): instalación y desarrollo.

Los informes de implementación de una rama describen el estado de esa entrega;
no reemplazan el contrato ni implican que una funcionalidad ya esté integrada en `develop`.

- [Integración del frontend](frontend-integration.md): procedencia por rama, conflictos, validación y pendientes.

- [Integración parcial React–Django y pendientes](integracion-backend-frontend.md): flujos reales verificados, límites de catálogos y pruebas reproducibles.

- [Trabajo en equipo y ramas compartidas](TRABAJO-EN-EQUIPO.md): reparto, Administrador para Pablo, advertencias y Conventional Commits.
