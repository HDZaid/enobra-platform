# Guía para subir renders a EnObra

<!-- enobra-documentacion-vigente -->
> Guía vigente. Revisión documental: 17-nov-2026.
> Para el equipo de arquitectura que publica renders desde el panel.
<!-- /enobra-documentacion-vigente -->

Esta guía explica cómo preparar los renders para que se vean nítidos y carguen
rápido en el sitio, incluso desde el celular de un cliente.

## Lo que el sitio acepta

| Requisito | Valor |
| --- | --- |
| Formatos | JPEG o WebP (PNG solo si el render necesita fondo transparente) |
| Peso máximo | 15 MB por archivo |
| Resolución máxima | 40 megapíxeles (un render 8K de 7680 × 4320 sí cabe) |
| Cantidad | Hasta 40 renders por proyecto o propiedad, además de las fotografías |

## Cómo exportarlos

Para la mejor relación entre calidad y velocidad:

- **Tamaño:** entre 2560 y 3840 píxeles en el lado más largo.
- **Formato y calidad:** JPEG con calidad 80 a 85, o WebP con calidad 80.
- **Color:** perfil sRGB, para que los colores se vean igual en todas las pantallas.
- **Peso esperado:** de 1 a 4 MB por render.
- **Orientación:** horizontal (16:9 o 3:2) para la portada. Mantener la misma
  proporción en los renders de un mismo proyecto hace que el álbum se vea ordenado.

Exportar más grande que 3840 px no mejora lo que ve el cliente: el sitio
reduce cada imagen automáticamente a 1920 px para la galería y a 800 px para
las tarjetas. Solo hace que la subida tarde más.

Si el programa de render solo exporta PNG pesados, se pueden convertir gratis en
[squoosh.app](https://squoosh.app): arrastrar la imagen, elegir WebP o MozJPEG,
calidad 80, ajustar el ancho a 3840 px y descargar. La imagen no sale del equipo.

## Cómo subirlos

1. Entrar al panel en enobra.com.gt/admin con su cuenta.
2. Abrir **Proyectos** o **Bienes raíces** y editar la publicación (o crear una).
3. En la sección **Renders**, seleccionar los archivos. Se pueden elegir varios a
   la vez; el panel sube hasta tres simultáneamente y muestra el avance de cada uno.
4. Ordenarlos con las flechas: el orden del panel es el orden del álbum.
5. Guardar. Si la publicación está publicada, los renders aparecen en el sitio
   dentro del álbum, marcados como «Render».

Si el servidor estaba inactivo, la primera acción puede tardar hasta un minuto
mientras despierta. Es normal; no hace falta repetir la subida.

## Si aparece un mensaje

| Mensaje | Qué hacer |
| --- | --- |
| «La imagen debe pesar … hasta 15 MB» | Exportar de nuevo en JPEG o WebP con calidad 80, o reducir a 3840 px. |
| «La imagen supera 40 megapíxeles» | Reducir la resolución; 3840 px en el lado largo es suficiente. |
| «Selecciona una imagen JPEG, PNG, WebP o GIF» | Convertir el archivo (por ejemplo, TIFF o HEIC) a JPEG o WebP. |
| Un render queda con error en la lista | Pulsar reintentar; el panel conserva el archivo sin volver a elegirlo. |

Las imágenes de borradores solo son visibles en el panel. Al publicar, quedan
visibles en el sitio; al despublicar, el sitio deja de mostrarlas.
