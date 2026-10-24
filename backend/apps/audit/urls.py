from django.urls import path

from .views import AuditExportView, AuditListView

urlpatterns = [
    path("admin/audit/", AuditListView.as_view(), name="audit-list"),
    path("admin/audit/export/", AuditExportView.as_view(), name="audit-export"),
]
