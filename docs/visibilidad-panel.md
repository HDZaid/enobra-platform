# Visibilidad del panel por permisos

El panel muestra únicamente secciones y acciones autorizadas por los permisos
que Django devuelve para la cuenta. El nombre del rol no concede acceso por sí
solo: roles personalizados conservan sus permisos asignados y admin.all permite
todas las acciones conocidas.

- Añadir/editar usuarios requiere users.manage; users.read conserva lectura sin
  esos botones. Crear roles requiere roles.manage; roles.read permite consultarlos.
- Noticias, Mensajes, Proyectos y Propiedades muestran sus acciones según permisos.
  Una acción no autorizada se oculta; los estados temporales (guardando, cargando)
  pueden deshabilitar botones que sí están autorizados.
- La papelera de Propiedades ahora se oculta cuando no puede usarse para la fila,
  en lugar de mostrar un botón deshabilitado por falta de permiso.
- Entrar por URL o enlace antiguo a una sección sin permiso redirige al Resumen,
  reemplazando la entrada del historial. La vista rechazada no se monta ni consulta
  sus datos. Las rutas de alta/edición comprueban además el permiso de acción.
- La propiedad del registro y la autorización final siguen siendo responsabilidad
  de Django. No se elimina ni debilita la protección de la API.

PROJECT_TRASH_ENABLED sigue false por el bloqueo P-02; un botón autorizado puede
estar deshabilitado por esa condición operativa. La vista previa de desarrollo
continúa siendo una demostración sin identidad real.

Verificación: lint, 182 pruebas y build aprobados. Chromium con API simulada:
Arquitecta, Empleado, lectura de usuarios/roles, editor sin papelera e Ingeniero.
Se comprueba menú filtrado, Añadir usuario solo autorizado, acción de papelera
oculta y redirección de rutas sin peticiones a módulos no autorizados.
Script: frontend/tests/browser/admin-visibility.cjs. Las pruebas históricas de
navegación se actualizaron al comportamiento de redirección. No se usó Supabase.
