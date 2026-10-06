"""Envoltura de paginación: { count, page, page_size, results: [...] }"""
from dataclasses import dataclass, field
from typing import Any

from rest_framework import serializers
from rest_framework.response import Response


class PageQuerySerializer(serializers.Serializer):
    page = serializers.IntegerField(min_value=1, default=1, required=False)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=12, required=False)


@dataclass
class Page:
    """Lo que devuelve un repositorio al listar."""

    items: list[Any] = field(default_factory=list)
    total: int = 0


def paginated_response(page: Page, params: dict, serializer_cls) -> Response:
    return Response(
        {
            "count": page.total,
            "page": params["page"],
            "page_size": params["page_size"],
            "results": serializer_cls(page.items, many=True).data,
        }
    )


_cache: dict = {}


def paginated(item_serializer):
    """Fábrica de serializer de respuesta paginada (solo para documentar OpenAPI)."""
    if item_serializer not in _cache:
        name = f"Paginated{item_serializer.__name__.removesuffix('Serializer')}List"
        _cache[item_serializer] = type(
            name,
            (serializers.Serializer,),
            {
                "count": serializers.IntegerField(),
                "page": serializers.IntegerField(),
                "page_size": serializers.IntegerField(),
                "results": item_serializer(many=True),
            },
        )
    return _cache[item_serializer]
