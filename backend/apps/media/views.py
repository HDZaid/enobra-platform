from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import ResourcePermission
from apps.common.registry import resolve
from apps.common.serializers import ErrorSerializer

from .interfaces import MediaStorage
from .serializers import MediaSerializer, MediaUploadSerializer

TAG = ["Medios (admin)"]
ERR = {401: ErrorSerializer, 403: ErrorSerializer}


class MediaUploadView(APIView):
    permission_classes = [ResourcePermission]
    permission_map = {"POST": ("media.upload",)}
    read_public = False
    parser_classes = [MultiPartParser]

    @extend_schema(
        request={"multipart/form-data": MediaUploadSerializer},
        responses={201: MediaSerializer, 400: ErrorSerializer, **ERR},
        tags=TAG,
        summary="Subir imagen (JPEG/PNG/WebP/GIF)",
    )
    def post(self, request):
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
        return Response(MediaSerializer(item).data)

    @extend_schema(responses={204: None, 404: ErrorSerializer, **ERR}, tags=TAG, summary="Eliminar imagen")
    def delete(self, request, media_id: str):
        if not resolve(MediaStorage).delete(media_id, deleted_by=request.user.id):
            raise NotFound("Archivo no encontrado.")
        return Response(status=status.HTTP_204_NO_CONTENT)
