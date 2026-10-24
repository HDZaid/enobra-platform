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
    from persistence.notifiers import EmailInquiryNotifier

    register(AuthService, DjangoAuthService())
    register(AccessControlRepository, DjangoAccessControlRepository())
    register(UserRepository, DjangoUserRepository())
    register(CompanyRepository, DjangoCompanyRepository())
    register(InstitutionRepository, DjangoInstitutionRepository())
    register(ProjectRepository, DjangoProjectRepository())
    register(PropertyRepository, DjangoPropertyRepository())
    register(NewsRepository, DjangoNewsRepository())
    register(InquiryRepository, DjangoInquiryRepository())
    register(MediaStorage, DjangoMediaStorage())
    register(AuditRepository, DjangoAuditRepository())
    register(InquiryNotifier, EmailInquiryNotifier())
