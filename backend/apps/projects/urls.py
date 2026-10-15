from django.urls import path

from .views import ProjectDetailView, ProjectListCreateView, ProjectYearsView

urlpatterns = [
    path("projects/", ProjectListCreateView.as_view(), name="project-list"),
    path("projects/years/", ProjectYearsView.as_view(), name="project-years"),
    path("projects/<slug:project_id>/", ProjectDetailView.as_view(), name="project-detail"),
]
