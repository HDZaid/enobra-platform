# Backend del panel administrativo

<!-- enobra-documentacion-vigente -->
> Guía vigente. Revisión documental: 3-nov-2026.
> [Base y límites técnicos](BASE-DOCUMENTACION-TECNICA.md). Las evidencias no se reinterpretan como nuevas ejecuciones.
<!-- /enobra-documentacion-vigente -->
Los adaptadores ORM están registrados en config/bindings.py sobre tablas
existentes de Supabase. No se crean tablas nuevas para poner en marcha el panel.
[Arquitectura](arquitectura.md), [diccionario](DICCIONARIO-DATOS.md) y
[contrato HTTP](openapi.yaml) son las fuentes técnicas complementarias.

## Módulos y persistencia

| Módulo | Implementación y datos |
| --- | --- |
| Sesión | DjangoAuthService; usuario/roles activos y auth.session.* en contenido_pagina. |
| Usuarios | DjangoUserRepository; usuario, usuario_rol, rol e historial_actividad. |
| Proyectos/propiedades/noticias | Adaptadores de CatalogRepository; tablas de negocio y JSON auxiliar en contenido_pagina. |
| Empresa/institución | Configuración, red_social y JSON de textos/logo; filas existentes. |
| Contacto/visitas | mensaje_contacto y metadatos de tipo/estado; no se crea un buzón externo. |
| Imágenes | DjangoMediaStorage; metadatos JSON y bytes en R2 privado. |
| Papelera | Kits de proyectos/propiedades, metadatos trash y fecha de envío. |
| Historial | DjangoAuditRepository, lectura/exportación de historial_actividad. |

Servicios y búsqueda global conservan interfaces sin repositorio registrado y
responden 501 not_implemented; no se incluyen como funcionalidad terminada.

## Sesión, permisos y usuarios

Access JWT de quince minutos y refresh revocable de siete días. Sesiones humanas
usan roles fijos calculados por código, con alias compatibles. Ingeniero equivale
a Administrador. Los cambios de RolPermiso no conceden facultades adicionales.
Rutas para personalizar roles/permisos retiradas; selector de usuarios limitado a
roles predeterminados activos ya existentes. [RBAC](RBAC.md).

Crear usuarios y reemplazar roles requiere Administrador; Arquitecto puede editar
nombre/estado de cuentas no administradoras con restricciones. Se protegen el
último Administrador activo, la propia cuenta y la cuenta técnica. No hay cambio
de contraseña ni auto-registro implementado en estos endpoints.
[Contrato de Usuarios](usuarios-api.md).

## Publicaciones, consultas e imágenes

Los adaptadores conservan los slug al editar. Lecturas públicas excluyen borradores
y papelera; la lectura administrativa depende de permisos. Los metadatos auxiliares
no reemplazan las filas de negocio. Proyectos/propiedades tienen restauración;
Noticias mantiene eliminación directa. [Papelera](papelera.md).

Los estados HTTP de consultas son nuevo, atendido y archivado; el repositorio los
adapta a las restricciones existentes y sus metadatos. Recibir/guardar una consulta
no prueba entrega de correo: en validación se utiliza backend dummy.

El logo y las fotos públicas se entregan por API desde R2 privado; borradores
requieren autorización o vista previa. No se permiten nuevas subidas en producción
con disco local. Se bloquea borrar una imagen referenciada. [Medios](R2-configuracion.md).

## Comprobaciones y límites

- SQLite aislado: 238 pruebas backend aprobadas, incluidas reglas de autorización,
  archivos, referencias, papelera, auditoría y producción.
- Supabase: evidencia fechada en BE-10 e INT-04; no confundir con pruebas de Render.
- Render: lecturas, HTTPS/CORS y persistencia de un objeto comprobadas.
- Pendiente: login/recorrido por rol y subida/publicación desde el panel desplegado,
  correo y respaldo/restauración. [Estado actual](estado-proyecto.md).

No ejecutar migraciones, seeds, pruebas de borrado o scripts que creen usuarios
sobre la base compartida por seguir una guía de desarrollo. Ver
[pruebas aisladas](probar-admin.md) y [operación](operacion-produccion.md).
