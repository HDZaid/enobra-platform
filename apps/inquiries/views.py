from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.pagination import paginated, paginated_response
from apps.common.permissions import IsAdmin
from apps.common.registry import resolve
from apps.common.serializers import ErrorSerializer

from .interfaces import InquiryRepository
from .serializers import (
    ContactInquiryCreateSerializer,
    InquiryListQuerySerializer,
    InquiryReceiptSerializer,
    InquirySerializer,
    InquiryStatusUpdateSerializer,
    VisitInquiryCreateSerializer,
)

PUBLIC = ["Solicitudes (público)"]
ADMIN = ["Solicitudes (admin)"]
ERR = {401: ErrorSerializer, 403: ErrorSerializer}


class ContactInquiryCreateView(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_scope = "inquiries"

    @extend_schema(
        request=ContactInquiryCreateSerializer,
        responses={201: InquiryReceiptSerializer, 400: ErrorSerializer, 429: ErrorSerializer},
        tags=PUBLIC,
        summary="Enviar formulario de contacto",
    )
    def post(self, request):
        s = ContactInquiryCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = {k: v for k, v in s.validated_data.items() if k != "website"}
        receipt = resolve(InquiryRepository).create_contact(data)
        return Response(InquiryReceiptSerializer(receipt).data, status=status.HTTP_201_CREATED)


class VisitInquiryCreateView(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_scope = "inquiries"

    @extend_schema(
        request=VisitInquiryCreateSerializer,
        responses={201: InquiryReceiptSerializer, 400: ErrorSerializer, 404: ErrorSerializer, 429: ErrorSerializer},
        tags=PUBLIC,
        summary="Solicitar visita a una propiedad",
    )
    def post(self, request):
        s = VisitInquiryCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        receipt = resolve(InquiryRepository).create_visit(s.validated_data)
        if receipt is None:
            raise NotFound("La propiedad no existe o ya no está disponible.")
        return Response(InquiryReceiptSerializer(receipt).data, status=status.HTTP_201_CREATED)


class InquiryListView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(
        parameters=[InquiryListQuerySerializer],
        responses={200: paginated(InquirySerializer), **ERR},
        tags=ADMIN,
        summary="Bandeja de solicitudes (admin)", operation_id="inquiries_list",
    )
    def get(self, request):
        q = InquiryListQuerySerializer(data=request.query_params)
        q.is_valid(raise_exception=True)
        p = q.validated_data
        p.setdefault("page", 1)
        p.setdefault("page_size", 12)
        page = resolve(InquiryRepository).list(
            kind=p.get("kind"), status=p.get("status"), page=p["page"], page_size=p["page_size"]
        )
        return paginated_response(page, p, InquirySerializer)


class InquiryDetailView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(responses={200: InquirySerializer, 404: ErrorSerializer, **ERR}, tags=ADMIN, summary="Detalle de solicitud (admin)", operation_id="inquiries_retrieve")
    def get(self, request, inquiry_id: str):
        item = resolve(InquiryRepository).get(inquiry_id)
        if item is None:
            raise NotFound("Solicitud no encontrada.")
        return Response(InquirySerializer(item).data)

    @extend_schema(
        request=InquiryStatusUpdateSerializer,
        responses={200: InquirySerializer, 404: ErrorSerializer, **ERR},
        tags=ADMIN,
        summary="Cambiar estado: nuevo → atendido → archivado (admin)",
    )
    def patch(self, request, inquiry_id: str):
        s = InquiryStatusUpdateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        item = resolve(InquiryRepository).update_status(inquiry_id, s.validated_data["status"], updated_by=request.user.id)
        if item is None:
            raise NotFound("Solicitud no encontrada.")
        return Response(InquirySerializer(item).data)
