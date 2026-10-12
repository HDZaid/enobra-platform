from drf_spectacular.utils import extend_schema
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.registry import resolve
from apps.common.serializers import ErrorSerializer

from .interfaces import ServiceRepository
from .serializers import ServiceSerializer


class ServiceListView(APIView):
    @extend_schema(responses=ServiceSerializer(many=True), tags=["Servicios"], summary="Listar servicios", auth=[])
    def get(self, request):
        return Response(ServiceSerializer(resolve(ServiceRepository).list(), many=True).data)


class ServiceDetailView(APIView):
    @extend_schema(responses={200: ServiceSerializer, 404: ErrorSerializer}, tags=["Servicios"], summary="Detalle de servicio", auth=[])
    def get(self, request, service_id: str):
        item = resolve(ServiceRepository).get(service_id)
        if item is None:
            raise NotFound("Servicio no encontrado.")
        return Response(ServiceSerializer(item).data)
