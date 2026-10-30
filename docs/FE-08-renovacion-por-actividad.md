# Renovación de sesión por actividad y notificación de vencimiento

Implementado el 29-oct-2026 por solicitud de Geovanny. Sustituye el aviso permanente
de J-01/CF-03. Abarca la renovación mientras se usa el panel; no implementa la
persistencia de credenciales tras recargar la pestaña (J-03 sigue aplazada).

## Comportamiento

- El acceso del backend conserva su duración de 15 minutos. El panel mantiene un
  límite adicional de **15 minutos sin interacción** en esta pestaña.
- Pulsaciones, escritura, movimiento del puntero y desplazamiento cuentan cuando
  la página está visible. Se ignoran eventos sintéticos, peticiones, respuestas,
  el temporizador y los cambios de visibilidad como fuentes de actividad.
- Al acercarse el vencimiento del acceso (último minuto), se llama a auth/refresh/
  solo si hubo interacción desde su última emisión y la pestaña está visible.
  La renovación no reinicia por sí sola el plazo de inactividad.
- El límite efectivo es el primero entre expiración del acceso e inactividad.
  Una pestaña oculta no renueva: al volver se comprueba el reloj y puede haber
  vencido antes de quince minutos de inactividad si expiró su acceso.
- En el último minuto aparece una tarjeta con contador y botón «Seguir trabajando».
  Si la sesión está activa y hay tiempo válido, el botón registra actividad;
  renovar se hace cuando corresponde por la vida del acceso.
- Al vencer se bloquea el panel con una tarjeta de reingreso. Se solicita revocar
  el refresh del backend. La actividad posterior no reactiva una sesión vencida.
  Si no hay red, la revocación no puede garantizarse hasta llegar al servidor;
  el panel permanece bloqueado. No cambia la política de validez del backend.
- El formulario permanece montado. Reingresar con la misma cuenta conserva su
  contenido; no se afirma que esté guardado. Recargar, cerrar o abandonar la pestaña
  puede perder los cambios. Un cambio de permisos al volver puede impedir el acceso
  al módulo, conforme al RBAC; no se reanuda bajo otra identidad.
- Una respuesta 401 del token vigente bloquea la sesión, sin repetir escrituras
  automáticamente. Un error de red al renovar mantiene el contador y permite
  reintentos espaciados mientras exista tiempo válido.

## Integración

SessionNotification reemplaza el banner de AdminLayout. SessionLifecycle mantiene
reloj, una sola renovación concurrente y versiones para descartar respuestas de
sesiones anteriores. apiClient y uploadClient resuelven el token actual al enviar.
El identificador de sesión que usan los formularios permanece estable al renovar
para evitar remontajes, recargas de editores y pérdida de borradores.

No hay localStorage ni sessionStorage de credenciales. No se modificó la base de
datos, roles, duración de JWT ni contrato HTTP. El backend existente ya proporciona
login/refresh/logout; su autorización y revocación siguen siendo definitivas.

## Verificación

- 10 pruebas nuevas de lógica y transporte: inactividad, aviso, actividad durante
  aviso, renovación única, reloj al volver, respuestas tardías, revocación, fallos
  de red, token actual y ausencia de repetición de escrituras.
- Suite frontend: **198 pruebas aprobadas** (incluye los cambios públicos del equipo),
  lint y build correctos. Se mantiene el aviso de bundle mayor de 500 kB.
- Chromium con API ficticia y reloj acelerado: contador de un minuto, vencimiento
  sin renovar, solicitud de logout, reingreso conservando un proyecto sin guardar,
  petición posterior con token renovado y bloqueo por 401. Sin errores de página.
- Capturas: tarjeta en escritorio, móvil y vencimiento. La prueba reproducible es
  frontend/tests/browser/session-activity.cjs; no usar cuentas reales.

Esto acredita frontend y su contrato con una API simulada. El recorrido con Django
desplegado se incluye en el QA final (#10/#15), cuando existan las URL. No se
realizaron escrituras en Supabase ni pruebas de carga o varios dispositivos.

Responsable del área: Jenny; Geovanny autorizó y encargó esta implementación.
J-01/CF-03 queda resuelto en cuanto a renovación en el panel. Persistencia J-03,
filtros backend y las demás mejoras conservan su alcance propio.
