Decisiones y ejecución de Jennifer — issue #17

> Actualización del 29-oct: renovación por actividad implementada; tarjeta con contador y reingreso que conserva el formulario. Sustituye la mitigación antigua de J-01/CF-03. [Comportamiento y pruebas](FE-08-renovacion-por-actividad.md). Persistencia tras recarga (J-03) sigue aplazada.

- [x] J-01: para la entrega se mitiga reingresando antes de cada recorrido largo. El
  panel avisa del vencimiento de 15 minutos. La renovación automática queda para
  después de la entrega; no se declara implementada.
- [x] J-02: P-01/P-02 ya están integrados y acreditados por el equipo. La papelera de
  Proyectos fue habilitada en frontend y probada con Django/SQLite desechables:
  cancelar, enviar y restaurar publicados/borradores, conservando imágenes y slug.
- [x] J-03: decisión de sessionStorage solo para refresh token cuando se implemente
  después de la entrega. Actualmente los tokens permanecen en memoria.
- [x] J-04: se mantienen búsqueda/filtro locales con aviso de página cargada; pasar
  filtros al backend queda en backlog con Pablo.

Implementación: frontend `2a69c3e`, integración `3c1cf9d`.
Fecha de ejecución consultable en los commits citados; no fechar retroactivamente
este comentario ni confundir la fecha de publicación con la de implementación.
Verificación: lint, 182 pruebas frontend, build, 27 pruebas backend de papelera y
Chromium contra Django local con SQLite/medios temporales. Sin escrituras nuevas
en Supabase ni despliegue web desde esas pruebas.

Falta el recorrido en URL desplegada y verificar imágenes persistentes; coordinar
Juan/Pablo (entorno/cuentas) y Geovanny/Leo (QA). Jenny acompaña la interfaz.

Este archivo es el texto listo para publicar. No prueba que las casillas ni el
comentario remoto se hayan actualizado; la API de GitHub respondió Forbidden.
