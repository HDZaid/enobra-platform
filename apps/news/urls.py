from django.urls import path

from .views import NewsDetailView, NewsListCreateView

urlpatterns = [
    path("news/", NewsListCreateView.as_view(), name="news-list"),
    path("news/<slug:news_id>/", NewsDetailView.as_view(), name="news-detail"),
]
