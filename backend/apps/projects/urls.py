from django.urls import path

from .views import ProjectDetailView, ProjectListCreateView, ProjectYearsView, ProjectTrashView, ProjectRestoreView, ProjectPermanentDeleteView

urlpatterns = [
    path("admin/projects/trash/", ProjectTrashView.as_view(), name="project-trash"),
    path("admin/projects/<slug:project_id>/restore/", ProjectRestoreView.as_view(), name="project-restore"),
    path("admin/projects/<slug:project_id>/permanent/", ProjectPermanentDeleteView.as_view(), name="project-permanent-delete"),
    path("projects/", ProjectListCreateView.as_view(), name="project-list"),
    path("projects/years/", ProjectYearsView.as_view(), name="project-years"),
    path("projects/<slug:project_id>/", ProjectDetailView.as_view(), name="project-detail"),
]
