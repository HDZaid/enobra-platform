"""
Generación del catálogo de permisos (RBAC por datos).

Los permisos de una publicación (bienes raíces, proyectos, ...) siguen el mismo
patrón, así que se generan con `publication_permissions` en lugar de repetir
literales. Los permisos de la plataforma, que no siguen ese patrón, viven en
`PLATFORM_PERMISSIONS`. `apps.accounts.access_policy` ensambla el catálogo final.

Los nombres son contrato público (JWT, base de datos, frontend): no se renombran.
"""
from __future__ import annotations


def publication_permissions(key: str, label: str, *, ownership: bool = True) -> dict[str, str]:
    """
    Permisos de una publicación con papelera, `{nombre: descripción en español}`.

    `key` es el prefijo (`properties`) y `label` el nombre legible en minúsculas
    (`bienes raíces`). Con `ownership=True` separa lo propio de lo ajeno
    (`edit.any`/`edit.own`, `trash.any`/`trash.own`); con `False` usa `edit` y `trash`.
    """
    permissions = {f"{key}.create": f"Crear publicaciones de {label}."}
    if ownership:
        permissions[f"{key}.edit.any"] = f"Editar cualquier publicación de {label}."
        permissions[f"{key}.edit.own"] = f"Editar borradores propios de {label}."
    else:
        permissions[f"{key}.edit"] = f"Editar publicaciones de {label}."
    permissions[f"{key}.publish"] = f"Publicar o retirar publicaciones de {label}."
    if ownership:
        permissions[f"{key}.trash.any"] = f"Enviar cualquier publicación de {label} a papelera."
        permissions[f"{key}.trash.own"] = f"Enviar borradores propios de {label} a papelera."
    else:
        permissions[f"{key}.trash"] = f"Enviar publicaciones de {label} a papelera."
    permissions[f"{key}.restore"] = f"Restaurar publicaciones de {label} desde papelera."
    permissions[f"{key}.delete_permanently"] = f"Eliminar publicaciones de {label} permanentemente."
    return permissions


PLATFORM_PERMISSIONS: dict[str, str] = {
    # Plataforma
    "admin.all": "Acceso completo a las operaciones administrativas.",
    "users.manage": "Crear y administrar cuentas de usuario.",
    "users.read": "Consultar las cuentas de usuario del panel.",
    "roles.manage": "Consultar, crear y configurar roles y permisos.",
    "roles.read": "Consultar roles y permisos sin poder modificarlos.",
    "audit.read": "Consultar el historial de actividad administrativa.",
    "audit.export": "Exportar el historial de actividad a CSV.",
    # Noticias (sin papelera: el borrado es definitivo)
    "news.create": "Crear noticias del sitio.",
    "news.edit": "Editar noticias existentes.",
    "news.publish": "Publicar o retirar noticias.",
    "news.delete": "Eliminar noticias definitivamente.",
    # Mensajes de contacto y solicitudes de visita
    "inquiries.read": "Consultar los mensajes de contacto y solicitudes de visita.",
    "inquiries.manage": "Cambiar el estado de los mensajes de contacto y solicitudes de visita.",
    # Medios
    "media.upload": "Subir imágenes y consultar su información.",
    "media.delete": "Eliminar imágenes subidas.",
    # Empresa
    "company.edit": "Editar los datos de la empresa y la información institucional.",
}
