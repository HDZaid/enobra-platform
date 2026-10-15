from django.urls import path

from .views import ServiceDetailView, ServiceListView

urlpatterns = [
    path("services/", ServiceListView.as_view(), name="service-list"),
    path("services/<slug:service_id>/", ServiceDetailView.as_view(), name="service-detail"),
]
