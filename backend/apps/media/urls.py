from django.urls import path

from .views import MediaDetailView, MediaUploadView

urlpatterns = [
    path("admin/media/", MediaUploadView.as_view(), name="media-upload"),
    path("admin/media/<str:media_id>/", MediaDetailView.as_view(), name="media-detail"),
]
