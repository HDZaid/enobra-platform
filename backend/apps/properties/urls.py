from django.urls import path

from .views import (
    PropertyDetailView,
    PropertyFacetsView,
    PropertyListCreateView,
    PropertyPermanentDeleteView,
    PropertyRestoreView,
    PropertyTrashView,
)

urlpatterns = [
    path("properties/", PropertyListCreateView.as_view(), name="property-list"),
    path("properties/facets/", PropertyFacetsView.as_view(), name="property-facets"),
    path("admin/properties/trash/", PropertyTrashView.as_view(), name="property-trash"),
    path("admin/properties/<int:property_id>/restore/", PropertyRestoreView.as_view(), name="property-restore"),
    path("admin/properties/<int:property_id>/permanent/", PropertyPermanentDeleteView.as_view(), name="property-permanent-delete"),
    path("properties/<int:property_id>/", PropertyDetailView.as_view(), name="property-detail"),
]
