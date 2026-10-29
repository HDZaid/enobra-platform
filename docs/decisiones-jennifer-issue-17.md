# Decisiones de Jennifer — issue #17

> Estado vigente, 29-oct: [P-02 y papelera de 90 días](P02-papelera-90-dias.md). P-01 cerrado; función SQL antigua retirada de Supabase y ausencia verificada. La nueva limpieza corre desde el backend después de más de 90 días en papelera. Código y pruebas listos; falta activar/verificar el Cron Job en Render (Juan, respaldo Pablo). Los bloqueos anteriores por decidir P-01/P-02 y las políticas de inactividad de 3/8 meses quedan sustituidos. Jenny puede validar la habilitación del frontend con la versión integrada; no requiere otro OK de Henry.

Registro de las decisiones aplicadas para la entrega, según las propuestas del
issue aportado por Jennifer. Fecha de adopción: la fecha ISO 8601 del commit que
incorpora este registro (`git log -1 --format=%aI -- docs/decisiones-jennifer-issue-17.md`).
El registro local no acredita que se hayan marcado las casillas remotas del issue.

- [x] **J-01 / CF-03:** mitigar para la demo volviendo a iniciar sesión antes de cada
  recorrido largo. La renovación automática queda después de la entrega. Se añade
  un aviso al panel real. Esta mitigación no alarga el token ni evita su vencimiento.
- [x] **J-02:** mantener `PROJECT_TRASH_ENABLED = false` en la entrega actual.
  No activar sobre Supabase hasta el cierre de P-01 (#16), la revisión de la función
  `limpiar_proyectos_inactivos()`. Solo se autoriza evaluar una activación para una
  demo aislada con datos desechables y backend verificado. Este cambio no la activa.
- [x] **J-03 / DEC-03:** cuando se implemente después de la entrega, usar
  sessionStorage únicamente para el refresh token. Hoy los tokens siguen en memoria;
  esta decisión no introduce persistencia ni localStorage. Revisar expiración,
  revocación y eliminación al salir antes de implementar.
- [x] **J-04 / CF-08/BE-22:** conservar filtro y búsqueda en cliente con aviso de que
  afectan a la página cargada. Pasar filtros al backend queda en backlog, con Pablo.

## Primera tarea ejecutada: mitigación de sesión (J-01)

El panel muestra una advertencia sobre los 15 minutos y el procedimiento de reingreso.
No hay renovación automática, cierre forzado ni navegación que borre el formulario.

Procedimiento para la demo:
1. Antes de un recorrido largo, guardar los cambios pendientes y confirmar respuesta
   exitosa de Django. Conservar aparte el texto no guardado si falla una solicitud.
2. Salir y volver a entrar desde el panel; no recargar una pestaña con cambios.
3. Usar recorridos de menos de 15 minutos y repetir el reingreso entre recorridos.
4. Ante un 401, no asumir que se guardó: conservar contenido antes de salir,
   reingresar y verificar el registro antes de volver a enviar.

El cierre de CF-03 como renovación automática sigue pendiente; solo su mitigación
para demo se considera realizada. P-01 pertenece al equipo backend y no se certifica
como cerrado con este documento. No se realizaron cambios sobre Supabase.
