from drf_spectacular.utils import extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import ResourcePermission
from apps.common.registry import resolve
from apps.common.serializers import ErrorSerializer

from .interfaces import CompanyRepository, InstitutionRepository
from .serializers import CompanySerializer, InstitutionSerializer

ERR = {400: ErrorSerializer, 401: ErrorSerializer, 403: ErrorSerializer}


class CompanyView(APIView):
    permission_classes = [ResourcePermission]
    permission_map = {"PUT": ("company.edit",)}

    @extend_schema(responses=CompanySerializer, tags=["Empresa"], summary="Datos de contacto y marca", auth=[])
    def get(self, request):
        return Response(CompanySerializer(resolve(CompanyRepository).get()).data)

    @extend_schema(request=CompanySerializer, responses={200: CompanySerializer, **ERR}, tags=["Empresa"], summary="Actualizar contacto y marca (admin)")
    def put(self, request):
        s = CompanySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        saved = resolve(CompanyRepository).update(s.validated_data, updated_by=request.user.id)
        return Response(CompanySerializer(saved).data)


class InstitutionView(APIView):
    permission_classes = [ResourcePermission]
    permission_map = {"PUT": ("company.edit",)}

    @extend_schema(responses=InstitutionSerializer, tags=["Empresa"], summary="Textos de Nosotros", auth=[])
    def get(self, request):
        return Response(InstitutionSerializer(resolve(InstitutionRepository).get()).data)

    @extend_schema(request=InstitutionSerializer, responses={200: InstitutionSerializer, **ERR}, tags=["Empresa"], summary="Actualizar textos de Nosotros (admin)")
    def put(self, request):
        s = InstitutionSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        saved = resolve(InstitutionRepository).update(s.validated_data, updated_by=request.user.id)
        return Response(InstitutionSerializer(saved).data)
