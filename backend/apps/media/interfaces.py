from __future__ import annotations

from abc import ABC, abstractmethod
from typing import IO, Optional


class MediaStorage(ABC):
    """
    Almacenamiento de imágenes subidas desde el panel (fotos, renders, portada de noticia, logo).
    Reemplaza las imágenes en base64 dentro de localStorage/data.js del mockup.
    Implementación esperada: disco local en desarrollo; S3/Cloud Storage/CDN en producción.
    Videos: NO se suben; únicamente se referencian mediante enlaces de YouTube.
    """

    @abstractmethod
    def save(self, file: IO[bytes], *, filename: str, content_type: str, size: int, kind: str, uploaded_by: str) -> dict:
        """-> {"id", "url", "kind", "content_type", "size", "created_at"}"""

    @abstractmethod
    def get(self, media_id: str) -> Optional[dict]: ...

    @abstractmethod
    def delete(self, media_id: str, *, deleted_by: str | None = None) -> bool: ...
