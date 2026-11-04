# Administración de Proyectos

<!-- enobra-documentacion-vigente -->
> Guía vigente, revisión documental del 3-nov-2026.
> [Base técnica](../../../../docs/BASE-DOCUMENTACION-TECNICA.md) y [estado](../../../../docs/estado-proyecto.md).
<!-- /enobra-documentacion-vigente -->

## Rutas, servicio y formulario

Rutas /admin/proyectos, /admin/proyectos/nuevo y /admin/proyectos/:slug/editar.
El servicio administrativo permite consultar borradores sin usar el listado
público como fuente del editor. La lista es paginada, con año y búsqueda sobre la
página cargada; no describir ese filtro como búsqueda global del servidor.
Categoría libre con sugerencias; no hay endpoint específico de categorías.

El formulario permite fotos/renders, orden, portada y enlace YouTube; valida antes
de enviar, conserva el slug al editar y envía demo:false y published explícito.
Bloquea guardado durante subidas y confirma salida con cambios sin guardar.
Solo anuncia éxito tras confirmación del backend. Los errores por campo conservan
el editor. Las imágenes se cargan por API, sin credenciales R2 en React.

## Permisos, papelera y medios

La autorización final está en Django. Los permisos recibidos controlan acciones;
Empleado puede editar/publicar proyectos ajenos, pero no tiene papelera.
Arquitecto puede enviar/restaurar; Administrador además elimina permanentemente.
No usar matrices antiguas donde Empleado solo guardaba borradores propios.

PROJECT_TRASH_ENABLED está habilitado. DELETE envía a papelera, conserva datos e
imágenes y permite restaurar el estado anterior. La limpieza diaria P-02 actúa
tras más de noventa días y no mediante el SQL antiguo ni un segundo cron Render.
[Reglas de papelera](../../../../docs/papelera.md) y
[limpieza activa](../../../../docs/P02-limpieza-activa.md).

R2 permanece privado. Fotos públicas mediante API y borradores con autorización/
vista previa temporal; no guardar el token en las referencias permanentes. Retirar
una imagen del formulario no implica borrar su archivo; la limpieza de huérfanos
sigue separada. [Medios](../../../../docs/R2-configuracion.md).

## Sesión y pruebas

La [renovación por actividad](../../../../docs/FE-08-renovacion-por-actividad.md)
no acredita guardado ni persistencia después de cerrar/recargar la pestaña.

Pruebas de lógica en frontend/tests y runner browser/admin-projects.cjs con entorno
desechable. Requiere INTEGRATION_BASE_URL, INTEGRATION_EMAIL, INTEGRATION_PASSWORD e
INTEGRATION_IMAGE válidos, suministrados en privado. No usar el runner que crea/
borra objetos sobre datos reales por seguir esta guía. Evidencia general: 191
pruebas frontend; revisión actual solo documental. QA con titulares y subida desde
el panel desplegado sigue pendiente.
