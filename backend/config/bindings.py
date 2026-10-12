"""
PUNTO ÚNICO DE ACOPLE de la capa de persistencia.

Cada app define una interfaz abstracta en `interfaces.py`. Cuando la base de datos
esté lista, implementa esas interfaces (con Django ORM, SQLAlchemy, etc.) y regístralas
aquí. Mientras una interfaz no esté registrada, su endpoint responde 501 `not_implemented`.

Ejemplo (cuando existan las implementaciones):

    from apps.properties.interfaces import PropertyRepository
    from persistence.properties import DjangoPropertyRepository

    def register_repositories(register):
        register(PropertyRepository, DjangoPropertyRepository())
"""


def register_repositories(register) -> None:
    # TODO: registrar aquí las implementaciones concretas.
    #   AuthService, CompanyRepository, InstitutionRepository, ServiceRepository,
    #   ProjectRepository, PropertyRepository, NewsRepository, InquiryRepository,
    #   SearchRepository, MediaStorage
    pass
