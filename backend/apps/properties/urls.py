from django.urls import path

from .views import PropertyDetailView, PropertyFacetsView, PropertyListCreateView

urlpatterns = [
    path("properties/", PropertyListCreateView.as_view(), name="property-list"),
    path("properties/facets/", PropertyFacetsView.as_view(), name="property-facets"),
    path("properties/<int:property_id>/", PropertyDetailView.as_view(), name="property-detail"),
]
