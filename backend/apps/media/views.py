from drf_spectacular.utils import extend_schema
from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import APIException, NotFound
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.http import FileResponse
from botocore.exceptions import BotoCoreError, ClientError
from drf_spectacular.types import OpenApiTypes

from apps.common.permissions import ResourcePermission
from apps.common.permissions import has_permission
from .references import private_r2_enabled, media_api_data, valid_preview
from apps.common.registry import resolve
from apps.common.serializers import ErrorSerializer

from .interfaces import MediaStorage
from .serializers import MediaSerializer, MediaUploadSerializer

TAG = ["Medios (admin)"]
ERR = {401: ErrorSerializer, 403: ErrorSerializer}


class MediaUploadsUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "La carga de imágenes estará disponible al configurar el almacenamiento persistente."


class MediaUploadView(APIView):
    permission_classes = [ResourcePermission]
    permission_map = {"POST": ("media.upload",)}
    read_public = False
    parser_classes = [MultiPartParser]

    @extend_schema(
        request={"multipart/form-data": MediaUploadSerializer},
        responses={201: MediaSerializer, 400: ErrorSerializer, 503: ErrorSerializer, **ERR},
        tags=TAG,
        summary="Subir imagen (JPEG/PNG/WebP/GIF)",
    )
    def post(self, request):
        if not getattr(settings, "MEDIA_UPLOADS_ENABLED", True):
            raise MediaUploadsUnavailable()
        s = MediaUploadSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        f = s.validated_data["file"]
        saved = resolve(MediaStorage).save(
            f, filename=f.name, content_type=f.content_type, size=f.size,
            kind=s.validated_data["kind"], uploaded_by=request.user.id,
        )
        return Response(MediaSerializer(saved).data, status=status.HTTP_201_CREATED)


class MediaDetailView(APIView):
    permission_classes = [ResourcePermission]
    permission_map = {"GET": ("media.upload",), "DELETE": ("media.delete",)}
    read_public = False

    @extend_schema(responses={200: MediaSerializer, 404: ErrorSerializer, **ERR}, tags=TAG, summary="Metadatos de una imagen")
    def get(self, request, media_id: str):
        item = resolve(MediaStorage).get(media_id)
        if item is None:
            raise NotFound("Archivo no encontrado.")
        return Response(MediaSerializer(media_api_data(item)).data)

    @extend_schema(responses={204: None, 400: ErrorSerializer, 404: ErrorSerializer, **ERR}, tags=TAG, summary="Eliminar imagen")
    def delete(self, request, media_id: str):
        if not resolve(MediaStorage).delete(media_id, deleted_by=request.user.id):
            raise NotFound("Archivo no encontrado.")
        return Response(status=status.HTTP_204_NO_CONTENT)


class MediaContentView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses={(200, content_type): OpenApiTypes.BINARY for content_type in
                             ("image/jpeg", "image/png", "image/webp", "image/gif")} | {
                             404: ErrorSerializer, 503: ErrorSerializer},
                   tags=["Medios"], summary="Imagen desde R2 privado; pública solo si está publicada")
    def get(self, request, media_id):
        if not private_r2_enabled():
            raise NotFound("Imagen no encontrada.")
        storage = resolve(MediaStorage)
        item = storage.get(media_id)
        if not item or item.get("provider") != "r2-private":
            raise NotFound("Imagen no encontrada.")
        public = storage.is_public(item)
        if not (public or has_permission(request.user, "media.upload")
                or valid_preview(request.query_params.get("preview"), media_id)):
            raise NotFound("Imagen no encontrada.")
        try:
            file = storage.open(item)
            response = FileResponse(file, content_type=item["content_type"])
        except FileNotFoundError:
            raise NotFound("Imagen no encontrada.") from None
        except (BotoCoreError, ClientError, OSError):
            raise MediaUploadsUnavailable("La imagen no está disponible temporalmente.") from None
        response["Cache-Control"] = "public, max-age=300" if public else "private, no-store"
        response["Referrer-Policy"] = "no-referrer"
        response["X-Content-Type-Options"] = "nosniff"
        return response
