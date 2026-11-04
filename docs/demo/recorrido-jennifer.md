# Recorrido de exposición y validación del panel

<!-- enobra-documentacion-vigente -->
> Guía vigente. Revisión documental: 3-nov-2026.
> [Base y límites técnicos](../BASE-DOCUMENTACION-TECNICA.md). Las evidencias no se reinterpretan como nuevas ejecuciones.
<!-- /enobra-documentacion-vigente -->
Exposición prevista: 4-nov-2026, Guatemala. Este recorrido no registra una prueba
ya realizada. Estado y alcance: [proyecto](../estado-proyecto.md) y
[operación](../operacion-produccion.md). No eliminar cuentas antes de la exposición.

## Preparación

- Sitio/panel en enobra.com.gt, API Render ya conectada y R2 privado activo.
- Inicio dispara health una vez; el primer acceso todavía puede esperar el arranque.
- Usar una cuenta autorizada existente; sus contraseñas no se documentan ni se
  deducen de las cuentas ficticias de tests. Correos definitivos se decidirán después.
- Para escrituras/borrados usar objetos de demostración y un alcance previamente
  autorizado; no ejecutar una colección destructiva sobre contenido real.
- Política fija Administrador/Arquitecto/Empleado. Ingeniero es alias Administrador.
  No mostrar un editor de Roles ni cambiar permisos para eludir una restricción.

## Recorrido propuesto

1. Inicio y páginas públicas: diferenciar contenido real, demostración y endpoints
   pendientes de Servicios/búsqueda. No presentar una respuesta 501 como éxito.
2. Login, auth/me y Resumen: menú/acciones según permisos; distinguir cero de dato
   no disponible. El 405 del alojamiento estático se corrigió con la URL de API.
3. Proyecto: listado, filtro de año y búsqueda sobre la página recibida; crear
   borrador con imagen y verificar respuesta antes de anunciar guardado.
4. Publicar si el rol lo permite; comprobar catálogo y foto mediante API. Cambiar
   a borrador y verificar acceso privado. El slug debe conservarse al editar.
5. Papelera: en entorno apropiado, enviar/restaurar un objeto de demostración;
   conservar imágenes y estado previo. No demostrar eliminación de datos reales.
6. Noticias y Mensajes: comprobar errores por campo y facultades de lectura/gestión.
   Guardar una consulta no acredita entrega de correo; proveedor aún pendiente.
7. Sesión: actividad permite renovación; inactividad muestra contador y bloquea.
   Reingresar con la misma cuenta conserva el formulario montado, no prueba guardado.
8. Comprobar una pantalla móvil y cerrar sesión. Registrar revisión/URL/resultado
   para convertir este recorrido en evidencia; no atribuirle pruebas no ejecutadas.

## Tratamiento de errores

400: corregir campos. 401: seguir el reingreso y comprobar el registro antes de
reenviar. 403: revisar permisos, no cambiarlos para forzar acceso. 501/503/sin red:
conservar contenido y registrar el fallo sin exponer tokens ni credenciales.
No prometer que un borrador persiste después de recargar/cerrar la pestaña.

La futura depuración de cuentas requiere identificar qué conservar y revisar
historial/FK/cuenta técnica de P-02. No se realiza dentro de la exposición ni de
esta actualización documental.
