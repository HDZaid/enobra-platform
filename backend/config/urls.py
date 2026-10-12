from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

api_v1 = [
    path("", include("apps.common.urls")),
    path("auth/", include("apps.accounts.urls")),
    path("", include("apps.company.urls")),
    path("", include("apps.services.urls")),
    path("", include("apps.projects.urls")),
    path("", include("apps.properties.urls")),
    path("", include("apps.news.urls")),
    path("", include("apps.inquiries.urls")),
    path("", include("apps.search.urls")),
    path("", include("apps.media.urls")),
]

urlpatterns = [
    path("api/v1/", include(api_v1)),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
]
