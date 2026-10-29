# Jennifer: cierre de tareas disponibles y pendientes

> Estado vigente, 29-oct: [P-02 y papelera de 90 días](P02-papelera-90-dias.md). P-01 cerrado; función SQL antigua retirada de Supabase y ausencia verificada. La nueva limpieza corre desde el backend después de más de 90 días en papelera. Código y pruebas listos; falta activar/verificar el Cron Job en Render (Juan, respaldo Pablo). Los bloqueos anteriores por decidir P-01/P-02 y las políticas de inactividad de 3/8 meses quedan sustituidos. Jenny puede validar la habilitación del frontend con la versión integrada; no requiere otro OK de Henry.

> Acuerdo vigente del 29-oct: [responsables y cierres](responsables-y-cierres.md) sustituye las exclusividades y dependencias personales de Henry de este documento. Pablo puede integrar backend, modificar configuración y generar OpenAPI; Jenny integra frontend y Juan verifica despliegue, con los respaldos indicados. P-01 está cerrado. P-02 pasa a limpieza desde el backend tras más de 90 días en papelera; consultar su informe antes de dar por activada la ejecución automática.

Revisión basada en los remotos develop `da28d5a` y frontend-dev `9c6f0a0`, y las
condiciones J-01 a J-04 del issue #17 aportadas por Jennifer. No se acredita aquí el
estado actual de los issues: la API de GitHub rechazó su lectura/escritura.

## Completado en esta entrega

- Sincronización de las imágenes/textos nuevos y el aviso de sesión de frontend-dev
  con los ajustes de búsqueda/encabezado de develop, conservando ambas contribuciones.
- Validación de frontend: lint, 181 pruebas y build aprobados; aviso de bundle >500 kB
  sin impedir la compilación. Referencias estáticas /assets/ comprobadas sin faltantes.
- Validación local del backend integrado: check correcto y 189 pruebas aprobadas
  usando config.test_settings (SQLite aislada).
- Proyectos: Chromium con Django real/SQLite y medios temporales. Crear con dos
  fotos, reordenar, publicar, verificar detalle público, editar, mantener slug,
  despublicar, editar borrador, confirmación de salida y formulario móvil.
- Noticias/Mensajes/Resumen: Chromium con API simulada y ocho perfiles de permisos.
  Se verificaron botones, conteos y guardado. Formularios de Noticias conservados
  ante 400/401/403/501/503/sin red, sin aviso de éxito falso. Corregida la presentación
  de errores 400 por campo en Noticias.
- Preparado [recorrido de demo](demo/recorrido-jennifer.md), incluidos reingreso de
  sesión, errores y restricciones sobre datos reales.

Esto acredita pruebas locales; no una demo en producción, SMTP ni validación nueva
sobre Supabase. No se modificó la función SQL, la retención ni el almacenamiento.

## Lo que sigue bloqueado y a quién avisar

| Pendiente | Por qué no se completa ahora | A quién avisar y qué solicitar |
| --- | --- | --- |
| J-02: papelera de Proyectos sobre Supabase | PROJECT_TRASH_ENABLED sigue false; falta acreditar P-01 (#16). Un plazo de 8 meses no demuestra que la limpieza respete la papelera. | **Henry y Juan**: acordar responsable de P-01, documentar la función/configuración realmente activa, sus invocadores y evidencia de conservación/restauración de proyectos en papelera. Después Jennifer habilita y prueba la pantalla. |
| Pruebas de tus módulos con datos y roles reales | Las pruebas locales no acreditan roles, permisos o asignaciones de Supabase. | **Henry**: confirmar entorno y cuentas por rol; **Geo y Leo**: repetir INT-04 en ese entorno. Jennifer acompaña la comprobación de Noticias, Mensajes y Proyectos. |
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

Para Henry y Juan: «Mi frontend y sus pruebas locales están completos. Para habilitar
la papelera de Proyectos en Supabase necesito que definan responsable y cierre de
P-01 (#16), con configuración SQL activa y prueba de limpieza/restauración. Mientras
no esté acreditado, mantendré el botón desactivado. También necesito confirmar con
Henry las cuentas/URL para repetir las pruebas reales con Geo y Leo».

Es texto preparado: este documento no implica que se haya enviado por GitHub, correo
o mensajería.
