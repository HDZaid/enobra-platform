from django.urls import path

from .views import CompanyView, InstitutionView

urlpatterns = [
    path("company/", CompanyView.as_view(), name="company"),
    path("institution/", InstitutionView.as_view(), name="institution"),
]
