"""Versiones WebP reducidas de las imágenes subidas, para no servir originales pesados.

Cada imagen se procesa de una en una: Render Free tiene poca RAM y un render de 8K
decodificado ocupa más de 100 MB. La reducción se hace en el mismo objeto, sin copiar
el original a tamaño completo, y los JPEG se decodifican ya reducidos.
"""
import io
import logging
import threading

from PIL import Image, ImageOps

from apps.media.variants import VARIANT_SIZES

WEBP_QUALITY = 82

_processing = threading.BoundedSemaphore(1)
logger = logging.getLogger(__name__)


def build_variants(file):
    """Devuelve {lado: bytes WebP} para los tamaños menores que el original.

    Los GIF conservan su animación y no se convierten. Un fallo no impide la subida:
    la imagen sigue disponible en su tamaño original.
    """
    try:
        with _processing:
            file.seek(0)
            with Image.open(file) as img:
                if img.format == "GIF":
                    return {}
                img.draft("RGB", (VARIANT_SIZES[0], VARIANT_SIZES[0]))
                ImageOps.exif_transpose(img, in_place=True)
                image = img
                mode = "RGBA" if "A" in image.getbands() or "transparency" in image.info else "RGB"
                if image.mode != mode:
                    image = image.convert(mode)
                variants = {}
                for side in VARIANT_SIZES:
                    if max(image.size) <= side:
                        continue
                    image.thumbnail((side, side), Image.Resampling.LANCZOS, reducing_gap=2.0)
                    buffer = io.BytesIO()
                    image.save(buffer, "WEBP", quality=WEBP_QUALITY, method=4)
                    variants[side] = buffer.getvalue()
                return variants
    except Exception:  # noqa: BLE001 - la versión reducida es una optimización
        logger.warning("No se generaron versiones reducidas de una imagen.", exc_info=True)
        return {}
    finally:
        file.seek(0)

