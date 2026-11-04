# Visibilidad y autorización del panel

<!-- enobra-documentacion-vigente -->
> Guía vigente. Revisión documental: 3-nov-2026.
> [Base y límites técnicos](BASE-DOCUMENTACION-TECNICA.md). Las evidencias no se reinterpretan como nuevas ejecuciones.
<!-- /enobra-documentacion-vigente -->
El frontend usa permisos devueltos por Django para filtrar menú, rutas y acciones.
La validación definitiva ocurre en el servidor. Consultar [RBAC](RBAC.md),
[roles fijos](politica-roles-fijos.md) y [Usuarios](usuarios-frontend.md).

- Administrador tiene acceso a las funciones disponibles y crea/reasigna usuarios.
- Arquitecto gestiona contenido, papelera e historial y puede editar cuentas no
  administradoras; no crea usuarios, reasigna roles ni elimina definitivamente.
- Empleado crea/edita/publica noticias, proyectos y propiedades de otros usuarios,
  y sube imágenes; no tiene papelera ni administración de cuentas.
- El módulo de Roles y sus rutas/menu están retirados. No hay personalización.
- PROJECT_TRASH_ENABLED está habilitado; las acciones exigen permisos de papelera.
- Una ruta sin autorización redirige al Resumen sin montar ni consultar la vista.
  Los formularios de alta/edición comprueban también la acción correspondiente.
- Los botones se ocultan si falta permiso; estados de carga pueden deshabilitar
  operaciones autorizadas. Esta presentación no concede permisos adicionales.

Sesión en memoria y renovación por actividad: [FE-08](FE-08-renovacion-por-actividad.md).
Entrar a Inicio dispara un health adicional por carga; entrar directamente a otras
rutas no dispara ese ping. Las consultas propias de cada pantalla se conservan.

Pruebas de permisos, navegación y sesión están en frontend/tests y el runner de
integración aislado. La evidencia general es 191 pruebas frontend, lint/build y
238 backend. No equivale a certificar los recorridos de cada titular en Render.
