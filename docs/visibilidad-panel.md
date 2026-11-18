# Visibilidad y autorización del panel

<!-- enobra-documentacion-vigente -->
> Guía vigente. Revisión documental: 17-nov-2026.
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
- Los botones y los accesos rápidos de Resumen aparecen según los permisos.
  Los estados de carga pueden deshabilitar temporalmente operaciones autorizadas.

Sesión en memoria y renovación por actividad: [FE-08](FE-08-renovacion-por-actividad.md).
Entrar a Inicio dispara un health adicional por carga; entrar directamente a otras
rutas no dispara ese ping. Las consultas propias de cada pantalla se conservan.

Pruebas de permisos, navegación y sesión están en frontend/tests y el runner de
integración aislado. El 17-nov pasaron 203 pruebas frontend y lint en `aa96acd`.
El [recorrido autenticado en producción](estado-proyecto.md) se sigue por separado.
