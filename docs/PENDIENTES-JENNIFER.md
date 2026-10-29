# Jennifer: cierre de tareas disponibles y pendientes

Revisión actualizada tras sincronizar frontend-dev con develop `8dc4016`.
P-01 está integrado; P-02 sigue pendiente. Evidencia del equipo sobre Supabase en
[INT-04 Supabase](INT-04-supabase-2026-10-28.md). Las pruebas nuevas de Jennifer
son locales; no se ejecutaron operaciones adicionales sobre Supabase ni se acredita
con este documento el estado remoto de los issues.

## Completado en esta entrega

- Sincronización de las imágenes/textos nuevos y el aviso de sesión de frontend-dev
  con los ajustes de búsqueda/encabezado de develop, conservando ambas contribuciones.
- Validación de frontend: lint, 181 pruebas y build aprobados; aviso de bundle >500 kB
  sin impedir la compilación. Referencias estáticas /assets/ comprobadas sin faltantes.
- Validación local del backend integrado: check correcto y 191 pruebas aprobadas
  usando config.test_settings (SQLite aislada).
- Proyectos: Chromium con Django real/SQLite y medios temporales. Crear con dos
  fotos, reordenar, publicar, verificar detalle público, editar, mantener slug,
  despublicar, editar borrador, confirmación de salida y formulario móvil.
- Noticias/Mensajes/Resumen: Chromium con API simulada y ocho perfiles de permisos.
  Se verificaron botones, conteos y guardado. Formularios de Noticias conservados
  ante 400/401/403/501/503/sin red, sin aviso de éxito falso. Corregida la presentación
  de errores 400 por campo en Noticias.
- P-01 revalidado: crear/editar renuevan actividad; restaurar conserva publicación
  previa y deja ACTIVO/sin fecha de eliminación; rollback restaura marcas anteriores.
  Chromium comprobó restauración desde Papelera de un proyecto enviado por API
  aislada, conservando imágenes, slug y borrador. El botón de Proyectos sigue apagado.
- Preparado [recorrido de demo](demo/recorrido-jennifer.md), incluidos reingreso de
  sesión, errores y restricciones sobre datos reales.

Esto acredita pruebas locales; no una demo en producción, SMTP ni validación nueva
sobre Supabase. No se modificó la función SQL, la retención ni el almacenamiento.

## Lo que sigue bloqueado y a quién avisar

| Pendiente | Por qué no se completa ahora | A quién avisar y qué solicitar |
| --- | --- | --- |
| J-02: papelera de Proyectos sobre Supabase | PROJECT_TRASH_ENABLED sigue false. P-01 está integrado y probado; falta P-02: verificar la función SQL real y todos sus invocadores antes de uso general. | **Henry y Juan, con el responsable de Supabase (#15)**: acreditar que la limpieza no puede ejecutarse durante la entrega de manera incompatible y documentar cómo se controlan sus invocadores. Después Jennifer habilita y prueba la pantalla en el entorno aprobado. |
| Recorrido de tus módulos en la URL desplegada | Geo/Leo ya documentaron 70/70 comprobaciones y panel por rol contra Supabase mediante API local; eso no acredita el despliegue público. Las cuentas del ensayo quedaron desactivadas. | **Henry**: confirmar URL y cuentas autorizadas; **Geo y Leo**: acompañar validación en el despliegue. No pedir repetir sin motivo la matriz local/Supabase ya documentada. |
| Demo en URL real con imágenes persistentes | Los medios locales temporales no acreditan persistencia tras despliegue. | **Responsable de despliegue y Henry**: confirmar proveedor/dominio, backend desplegado y persistencia de medios; luego ensayar el recorrido de demo. |
| Comentarios/casillas de issues #17/#18 | La API devuelve Forbidden; los intentos previos no publicaron nada. | **Jennifer o administrador del repositorio**: publicar manualmente las decisiones del documento y la respuesta a Juan, o restablecer el acceso de la integración a issues. No se enviaron mensajes nuevos al equipo. |

## Aplazado por acuerdo, no bloqueado por código

- **J-01/FE-08:** renovación automática después de la entrega; para la demo se usa
  reingreso con aviso. CF-03 no se declara corregido como renovación automática.
- **J-03:** persistencia posterior: sessionStorage solo para el refresh token,
  manteniendo el access token en memoria. No se implementó persistencia ahora.
- **J-04/BE-22:** filtros de Proyectos en backend al backlog, con **Pablo**; se mantiene
  el filtro local con su aviso.
- **FE-09:** editor de Empresa/Nosotros continúa en el backlog posterior a la entrega;
  ajustar textos/imagenes estáticos no equivale a implementar ese editor.

Estos aplazamientos no se sustituyen por nuevas funcionalidades bajo el título de
cerrar tareas disponibles. Se mantienen las ramas compartidas, sin ramas alternas.

## Mensaje preparado para coordinación

Para Henry y Juan: «P-01 ya está integrado y revalidado en mis pruebas locales.
Para habilitar la papelera de Proyectos sobre Supabase queda acreditar P-02: control
de la función SQL y sus invocadores durante la entrega. Confirmemos quién aporta
evidencia de #15 y la URL/cuentas autorizadas para el recorrido desplegado con Geo
y Leo. Las pruebas de Supabase del equipo ya están documentadas; mi botón permanece
desactivado hasta cerrar este bloqueo operativo».

Es texto preparado: este documento no implica que se haya enviado por GitHub, correo
o mensajería.
