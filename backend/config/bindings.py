"""
PUNTO ÚNICO DE ACOPLE de la capa de persistencia.

Cada app define una interfaz abstracta en `interfaces.py`. Las implementaciones del
panel usan Django ORM sobre las tablas existentes y se registran aquí. Las interfaces
de servicios y búsqueda continúan pendientes y responden 501 `not_implemented`.

Ejemplo (cuando existan las implementaciones):

    from apps.properties.interfaces import PropertyRepository
    from persistence.properties import DjangoPropertyRepository

    def register_repositories(register):
        register(PropertyRepository, DjangoPropertyRepository())
"""


def build_media_storage(local_class):
    """MEDIA_STORAGE_BACKEND: local (por defecto), cloudinary o r2."""
    from django.conf import settings
    from django.core.exceptions import ImproperlyConfigured

    backend = getattr(settings, "MEDIA_STORAGE_BACKEND", "local")
    if backend == "cloudinary":
        from persistence.media_cloudinary import CloudinaryMediaStorage
        return CloudinaryMediaStorage()
    if backend == "r2":
        from persistence.media_r2 import R2MediaStorage
        return R2MediaStorage()
    if backend != "local":
        raise ImproperlyConfigured(f"MEDIA_STORAGE_BACKEND desconocido: {backend!r} (local, cloudinary o r2).")
    return local_class()


def build_notifier(email_class, resend_class):
    """INQUIRY_NOTIFIER: email (por defecto) o resend."""
    from django.conf import settings
    from django.core.exceptions import ImproperlyConfigured

    backend = getattr(settings, "INQUIRY_NOTIFIER", "email")
    if backend == "resend":
        if not getattr(settings, "RESEND_API_KEY", ""):
            raise ImproperlyConfigured("INQUIRY_NOTIFIER=resend requiere RESEND_API_KEY.")
        return resend_class()
    if backend != "email":
        raise ImproperlyConfigured(f"INQUIRY_NOTIFIER desconocido: {backend!r} (email o resend).")
    return email_class()


def register_repositories(register) -> None:
    from apps.accounts.interfaces import AccessControlRepository, AuthService, UserRepository
    from apps.company.interfaces import CompanyRepository, InstitutionRepository
    from apps.projects.interfaces import ProjectRepository
    from apps.properties.interfaces import PropertyRepository
    from apps.news.interfaces import NewsRepository
    from apps.inquiries.interfaces import InquiryRepository
    from apps.media.interfaces import MediaStorage
    from apps.audit.interfaces import AuditRepository
    from apps.inquiries.notifiers import InquiryNotifier
    from persistence.accounts import DjangoAuthService
    from persistence.access_control import DjangoAccessControlRepository
    from persistence.users import DjangoUserRepository
    from persistence.company import DjangoCompanyRepository, DjangoInstitutionRepository
    from persistence.catalog import DjangoProjectRepository, DjangoPropertyRepository, DjangoNewsRepository
    from persistence.inquiries import DjangoInquiryRepository
    from persistence.media import DjangoMediaStorage
    from persistence.audit import DjangoAuditRepository
    from persistence.notifiers import EmailInquiryNotifier, ResendInquiryNotifier
    from apps.publications.factory import NewsFactory, ProjectFactory, PropertyFactory
    from apps.publications.registry import publication_registry

    register(AuthService, DjangoAuthService())
    register(AccessControlRepository, DjangoAccessControlRepository())
    register(UserRepository, DjangoUserRepository())
    register(CompanyRepository, DjangoCompanyRepository())
    register(InstitutionRepository, DjangoInstitutionRepository())
    projects, properties, news = DjangoProjectRepository(), DjangoPropertyRepository(), DjangoNewsRepository()
    register(ProjectRepository, projects)
    register(PropertyRepository, properties)
    register(NewsRepository, news)
    register(InquiryRepository, DjangoInquiryRepository())
    register(MediaStorage, build_media_storage(DjangoMediaStorage))
    register(AuditRepository, DjangoAuditRepository())
    register(InquiryNotifier, build_notifier(EmailInquiryNotifier, ResendInquiryNotifier))

    # Fábricas de publicaciones: fuente única del catálogo de permisos, de /admin/trash/ y de las
    # etiquetas del historial. Un tipo nuevo = una fábrica en apps/publications/factory.py + una línea.
    publication_registry.register(PropertyFactory(properties), replace=True)
    publication_registry.register(ProjectFactory(projects), replace=True)
    publication_registry.register(NewsFactory(news), replace=True)
