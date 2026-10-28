# Recorrido de demo — Jennifer

Usar el código integrado de frontend-dev/develop y una base aislada con medios
temporales. Las credenciales se configuran fuera del repositorio. No cargar datos
ficticios ni ejecutar pruebas de borrado sobre Supabase real.

## Preparación

- Confirmar con Henry la URL y el backend integrado que se usarán.
- Iniciar sesión como Ingeniero antes del recorrido; el acceso dura 15 minutos.
- Revisar el aviso de sesión. Guardar y confirmar cada operación antes de salir.
- Para un recorrido largo, terminar el bloque actual, conservar cualquier contenido
  no guardado, salir y reingresar. La sesión no se renueva automáticamente (J-01).
- La papelera de Proyectos permanece apagada: no cambiar la constante para la demo
  sobre Supabase. P-01 debe cerrarse primero. En entorno aislado puede prepararse una
  activación futura separada; no se activó en esta entrega.

## Recorrido

1. Resumen: comprobar totales según los permisos, diferenciando 0 de no disponible.
2. Proyectos: listar, filtrar por año y buscar. Explicar que la búsqueda solo afecta
   a la página recibida; no representa una búsqueda global (J-04).
3. Crear proyecto: título, categoría libre, país, año y descripción. Subir dos fotos,
   cambiar su orden, opcionalmente añadir renders y enlace YouTube.
4. Publicar y guardar; comprobar el registro en el catálogo público. Editar el título
   y verificar que el slug sigue igual. Pasar a borrador y comprobar que deja de verse
   públicamente, pero sigue accesible para edición administrativa.
5. Cambiar un campo y cancelar la salida del formulario cuando aparezca la
   confirmación; comprobar que el texto sigue presente.
6. Noticias: crear o editar con los permisos correspondientes. Comprobar que un error
   de guardado conserva el editor abierto; los errores 400 aparecen por campo.
7. Mensajes: consultar detalles. `inquiries.read` no permite cambiar estado;
   `inquiries.manage` permite marcar atendido o archivar. No enviar mensajes reales
   ni atribuir a esta demo la validación de SMTP.
8. Repetir los listados/formularios en móvil. Los casos completos de roles,
   propiedades, usuarios, historial y papelera corresponden a INT-04 (Geo y Leo).

## Si falla una operación

- No anunciar éxito si no hay confirmación del servidor.
- 400: revisar los mensajes por campo y corregir sin cerrar el formulario.
- 401: conservar el contenido no guardado antes de salir y reingresar; verificar el
  registro antes de volver a enviar. No prometer recuperación automática del texto.
- 403: revisar permisos con Henry; no cambiar roles para eludir el rechazo.
- Sin red, 501 o 503: conservar contenido, reintentar cuando esté disponible y anotar
  ruta/acción/código; no incluir tokens ni credenciales en capturas o reportes.
