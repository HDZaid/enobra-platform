from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

api_v1 = [
    path("", include("apps.common.urls")),
    path("auth/", include("apps.accounts.urls")),
    path("admin/", include("apps.accounts.admin_urls")),
    path("", include("apps.company.urls")),
    path("", include("apps.services.urls")),
    path("", include("apps.projects.urls")),
    path("", include("apps.properties.urls")),
    path("", include("apps.news.urls")),
    path("", include("apps.inquiries.urls")),
    path("", include("apps.search.urls")),
    path("", include("apps.media.urls")),
    path("", include("apps.audit.urls")),
]

urlpatterns = [
    path("api/v1/", include(api_v1)),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
]

# Solo desarrollo; en producción MEDIA_ROOT se sirve desde el servidor de archivos.
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
