# Ajustes puntuales de Inicio, Servicios y Nosotros

Se conserva la identidad visual de frontend-dev `ab68283`: paleta, fuentes,
ornamentos y estructura de secciones. Los cambios se limitan a los puntos solicitados.

- Inicio: ParallaxImage admite `adaptive` opcional. Usa las dimensiones naturales y
  ResizeObserver para adaptar object-fit/object-position al contenedor. Conserva
  cover en proporciones cercanas; usa contain si cubrir dejaría visible menos del
  60% de una dimensión. Las verticales con cover se alinean arriba. No deforma ni
  detecta sujetos. Conserva el overlay existente del hero y desactiva su ampliación
  parallax al usar contain para evitar recortes. El ajuste solo se activó en Inicio.
- Servicios: el índice conserva sus cuatro columnas y desplazamiento móvil; solo
  Administración de proyectos gana peso relativo y muestra su título completo.
- Viñetas de Servicios: Lucide según significado, con tamaño/espaciado uniformes y
  el acento existente. Los iconos decorativos se ocultan a lectores de pantalla.
- Nosotros: iframe responsive 16:9 con dominio youtube-nocookie, con reproducción
  automática silenciada y carga inmediata. Se utiliza el video de referencia proporcionado por Jennifer:
  https://youtu.be/AJFkU1bC3C0. Cambiar `aboutVideo` en
  `frontend/src/features/about/data/reference.js` cuando exista el institucional.
  El texto visible identifica que es de referencia.

Verificación: lint, 184 pruebas y build aprobados. Chromium con API de referencia
simulada: Inicio/Servicios/Nosotros a 1440 y 390 px, sin desbordamiento de documento;
icono por viñeta, ancho de Administración y src del iframe correctos. Fotografía
vertical simulada en hero: contain aplicado. Capturas revisadas localmente.
La reproducción de YouTube no se acreditó: se bloqueó la carga externa del iframe
para validar la maquetación de forma aislada. Depende de disponibilidad y permisos
de inserción del video en YouTube. Advertencia de bundle >500 kB aún presente.
Sin cambios de backend, permisos, base de datos ni almacenamiento.

## Corrección posterior de historia y autoplay

La validación de institution/ aceptaba presentation vacío o compuesto solo por
espacios. Ahora lo rechaza para conservar el contenido de referencia con su aviso,
en lugar de mostrar Nuestra historia sin párrafos. El contenido válido de la API
se mantiene; no se modificaron registros de la base. Las líneas vacías se omiten.

El iframe solicita autoplay=1, mute=1 y playsinline=1, permite autoplay y usa eager.
El navegador/YouTube pueden bloquear la reproducción; no se promete autoplay con
sonido. Regresión: frontend/tests/browser/about-history.cjs, con respuesta vacía,
espacios y contenido real a 1440/390 px; se verifica configuración del iframe, no
reproducción externa. Lint, 185 pruebas, build y Chromium aprobados.

## Presentación pública de la historia

Se retiró ContentStatus de Nosotros: el visitante ve la historia disponible sin
mensajes técnicos de API, referencia o reintento. Se conserva el mecanismo de
contenido alternativo y su validación; no se alteraron respuestas ni datos del
backend. La regresión de Chromium verifica texto visible y ausencia de aviso/botón
en el bloque institucional, con historias vacías, en blanco y válidas.

## Revisión del resto del sitio público

Retirado ContentStatus de Footer, SearchDialog, Servicios, Contacto y NewsPreview.
Se mantiene el contenido alternativo existente; no se cambian contratos ni datos.
Los formularios conservan errores de envío y los catálogos estados de carga,
contenido ausente o consulta fallida, expresados para el visitante. No se convierte
una operación fallida en éxito ni se borran las etiquetas de contenido de muestra.

Prueba Chromium reproducible: frontend/tests/browser/public-content.cjs. Siete rutas
públicas y buscador, a 1440/390 px, con API 501 y sin red: sin avisos técnicos ni
desbordamiento, y con contenido alternativo. Lint, 185 pruebas y build aprobados.
