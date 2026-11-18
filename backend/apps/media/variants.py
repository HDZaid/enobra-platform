"""Tamaños de las versiones reducidas que la API puede entregar con `?w=`."""

# Lado mayor de cada versión WebP, de mayor a menor: pantalla completa y tarjetas.
VARIANT_SIZES = (1920, 800)


def variant_path(item, side):
    """Ruta guardada de la versión pedida, o None si la imagen no la tiene."""
    try:
        return (item.get("variants") or {}).get(str(int(side)))
    except (TypeError, ValueError):
        return None
