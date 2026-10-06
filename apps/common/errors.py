"""
Contrato de error uniforme:

    { "error": { "code": "validation_error", "message": "...", "details": {...} } }
"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

from .registry import NotBoundError

CODES = {
    400: "validation_error",
    401: "not_authenticated",
    403: "permission_denied",
    404: "not_found",
    405: "method_not_allowed",
    415: "unsupported_media_type",
    429: "throttled",
}


def error_body(code: str, message: str, details=None) -> dict:
    body = {"error": {"code": code, "message": message}}
    if details is not None:
        body["error"]["details"] = details
    return body


def exception_handler(exc, context):
    if isinstance(exc, NotBoundError):
        return Response(
            error_body("not_implemented", "Este endpoint aún no tiene capa de datos acoplada.", str(exc)),
            status=status.HTTP_501_NOT_IMPLEMENTED,
        )
    response = drf_exception_handler(exc, context)
    if response is None:
        return None
    code = CODES.get(response.status_code, "error")
    data = response.data
    if isinstance(data, dict) and "detail" in data and len(data) == 1:
        message, details = str(data["detail"]), None
    else:
        message, details = "Los datos enviados no son válidos.", data
    response.data = error_body(code, message, details)
    return response
