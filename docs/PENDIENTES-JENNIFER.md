# Jennifer: cierre de tareas disponibles y pendientes

> Estado final del 29-oct: [limpieza diaria activa](P02-limpieza-activa.md) en GitHub Actions, gratuita para este repo público. Simulación y ejecución real aprobadas (0 publicaciones vencidas). P-02 y su automatización están completas. El pendiente de activar un Cron Job en Render que aparezca abajo es histórico y queda sustituido; no crear un servicio duplicado. Mantenimiento: Pablo, respaldo Juan.

> Estado vigente, 29-oct: [P-02 y papelera de 90 días](P02-papelera-90-dias.md). P-01 cerrado; función SQL antigua retirada de Supabase y ausencia verificada. La nueva limpieza corre desde el backend después de más de 90 días en papelera. Código y pruebas listos; falta activar/verificar el Cron Job en Render (Juan, respaldo Pablo). Los bloqueos anteriores por decidir P-01/P-02 y las políticas de inactividad de 3/8 meses quedan sustituidos. Jenny puede validar la habilitación del frontend con la versión integrada; no requiere otro OK de Henry.

> Acuerdo vigente del 29-oct: [responsables y cierres](responsables-y-cierres.md) sustituye las exclusividades y dependencias personales de Henry de este documento. Pablo puede integrar backend, modificar configuración y generar OpenAPI; Jenny integra frontend y Juan verifica despliegue, con los respaldos indicados. P-01 está cerrado. P-02 pasa a limpieza desde el backend tras más de 90 días en papelera; consultar su informe antes de dar por activada la ejecución automática.

Evidencia histórica de Jennifer tras sincronizar frontend-dev con develop `8dc4016`.
En ese corte P-01 estaba integrado y P-02 seguía pendiente; el informe del 29-oct lo sustituye. Evidencia del equipo sobre Supabase en
[INT-04 Supabase](INT-04-supabase-2026-10-28.md). Las pruebas nuevas de Jennifer
son locales; no se ejecutaron operaciones adicionales sobre Supabase ni se acredita
con este documento el estado remoto de los issues.

## Cierre actual de J-02

Papelera de Proyectos habilitada con el backend integrado de P-01/P-02. Cancelar,
enviar y restaurar se probaron desde la interfaz con proyectos publicados y
borradores, conservando imágenes/slug y estado previo. Lint, 182 pruebas frontend,
build, 27 pruebas backend de papelera/retención y Chromium aprobados. Todo en
SQLite/archivos temporales, sin tocar Supabase. No acredita despliegue web nuevo.
El bloqueo de J-02 descrito en informes históricos queda cerrado.

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

Para Juan y Pablo: «P-01/P-02 están cerrados y ya habilité la papelera de Proyectos
en frontend con pruebas locales de envío/restauración y conservación de datos.
Para cerrar el recorrido desplegado necesito confirmar URL, versión y cuentas
permanentes autorizadas; coordinaré la comprobación de interfaz con Geovanny y Leo».

Es texto preparado: este documento no implica que se haya enviado por GitHub, correo
o mensajería.
