# Jennifer: tareas completas y pendientes externos

Corte de código: integración `3c1cf9d`, implementación frontend `2a69c3e`.
Este documento sustituye sus listas previas: J-02 ya no está bloqueado.

## Tareas de entrega terminadas

| Tarea | Resultado y evidencia |
| --- | --- |
| FE-06: rutas, menú y permisos | Rutas y menús por permisos, `refreshUser()` y protección de formularios. Las vistas no autorizadas redirigen al Resumen sin montarse; sus botones no se muestran. Ver `docs/visibilidad-panel.md`. |
| FE-10: Noticias, Mensajes y Resumen | Acciones por permiso, Mensajes de lectura sin gestión, conteos reales y fallos parciales; errores de Noticias por campo y contenido conservado al rechazar el guardado. |
| FE-07: administración de Proyectos | Crear/editar, fotos/renders, orden y portada, YouTube, validación, slug estable, publicación explícita y aviso de cambios. |
| INT-01: integración frontend | Cambios publicados e incorporados a develop conservando los avances del equipo. |
| J-01/CF-03: renovación por actividad | Implementada por solicitud de Geovanny: renovación mientras se usa el panel, límite de 15 minutos sin actividad, tarjeta con contador y reingreso sin desmontar borradores. Ver FE-08-renovacion-por-actividad.md. |
| J-02: papelera de Proyectos | `PROJECT_TRASH_ENABLED=true` con P-01/P-02 integrados. Envío y restauración comprobados desde UI; cancelar no envía, conserva imágenes/slug y estado anterior. |
| Preparación de demo | Recorrido en `docs/demo/recorrido-jennifer.md`, incluidos errores y restricciones sobre datos reales. |

## Evidencia ya ejecutada

- Frontend integrado: lint, **182 pruebas** y build aprobados (advertencia conocida
  de bundle mayor de 500 kB; no bloqueó el build).
- Chromium con Django/SQLite/archivos temporales: crear con dos fotos, reordenar,
  publicar y verificar detalle público, editar, despublicar, editar borrador y móvil.
  Enviar a papelera y restaurar desde UI tanto publicado como borrador; cancelar
  no borra. Permisos propios/ajenos, retención y restauración: **27 pruebas backend**.
- Chromium con API simulada: visibilidad de secciones/acciones según cinco perfiles;
  además ocho perfiles de acciones/conteos y fallos 400/401/403/501/503/sin red en
  Noticias, sin falso éxito ni pérdida del contenido del editor.
- P-01/P-02 y automatización de limpieza cerrados por el equipo: referencia
  `docs/P02-limpieza-activa.md`. No hay que solicitar otro OK de Henry ni configurar
  un Cron Job duplicado. Mantenimiento de limpieza: Pablo, respaldo Juan.
- Pruebas del equipo contra Supabase: `docs/INT-04-supabase-2026-10-28.md` registra
  70/70 comprobaciones y panel contra API local/Supabase. No equivale a desplegar.

No se repitieron estas suites para esta actualización documental. Las pruebas nuevas
de Jennifer anteriores fueron locales; no se hicieron escrituras adicionales sobre
Supabase, ni cambios a los secretos, limpieza programada o servicios de despliegue.

## Únicos pendientes externos para cerrar el recorrido real

| Pendiente | Información o acceso que falta | A quién avisar |
| --- | --- | --- |
| Recorrido en la URL desplegada | URL del frontend/API, revisión desplegada que incluya la papelera y cuentas de prueba autorizadas. No se encontró una URL operativa registrada en el checkout revisado. Las cuentas temporales del ensayo Supabase se desactivaron. | **Juan**, respaldo **Pablo**, confirman despliegue; **Pablo**, respaldo Juan, prepara cuentas identificadas por Geovanny. **Geovanny y Leo** llevan QA; Jenny acompaña interfaz. |
| Verificar imágenes persistentes | Proveedor/entorno realmente desplegados y evidencia de imagen recuperable tras reinicio o nuevo despliegue. El runner local no lo acredita. | **Juan**, respaldo **Pablo**. Jenny verifica el resultado visible cuando exista ese entorno. |
| Publicar comentario/casillas del issue #17 | La API REST sigue devolviendo Forbidden al leer el issue. No se modificó su cuerpo sin poder conocer la versión actual. | **Jenny** puede publicar manualmente; **Geovanny** es respaldo. Para el acceso de la integración, **HDZaid/administrador de GitHub**. Texto listo en `docs/comentario-issue-17-jennifer.md`. |

## Aplazado por decisiones vigentes, no bloqueo técnico

- J-01/CF-03: renovación por actividad resuelta; falta incluir su recorrido con Django desplegado en el QA final. FE-08 no implica persistencia tras recarga: esa parte sigue aplazada en J-03.
- J-03: persistencia posterior; sessionStorage solo para el refresh token. Los tokens
  actuales permanecen en memoria, sin localStorage.
- J-04/BE-22: conservar filtros en cliente con aviso de página cargada; filtros de
  backend en backlog con Pablo.
- FE-09: editor de Empresa/Nosotros en backlog posterior a la entrega. Cambiar textos
  estáticos no equivale a implementar el editor. No se adelantó este alcance.

## Mensaje preparado de coordinación

«Mis tareas de entrega y J-02 ya están implementadas, probadas localmente e integradas.
Para acompañar el recorrido real necesito URL, revisión desplegada y cuentas de prueba
por rol. Juan/Pablo: confirmen también imágenes persistentes. Geovanny/Leo: coordinemos
el recorrido sobre ese entorno. P-01/P-02 ya no son bloqueos para mi frontend».

Texto preparado, no enviado por correo, mensajería ni comentario remoto.
