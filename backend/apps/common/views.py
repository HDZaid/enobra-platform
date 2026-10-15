from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import HealthSerializer


class HealthView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses=HealthSerializer, tags=["Sistema"], summary="Estado del servicio")
    def get(self, request):
        return Response({"status": "ok", "version": "1.0.0"})
