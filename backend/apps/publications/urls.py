from django.urls import path

from .views import UnifiedTrashView

urlpatterns = [
    path("admin/trash/", UnifiedTrashView.as_view(), name="publication-trash"),
]
