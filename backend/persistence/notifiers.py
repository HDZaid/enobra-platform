"""BE-09: adaptador de correo; no registra dependencias automáticamente.

Integración pendiente de Henry en config/bindings.py:
    register(InquiryNotifier, EmailInquiryNotifier())
Importar el puerto desde apps.inquiries.notifiers y el adaptador desde este módulo.
En settings.py debe leer las variables documentadas en .env.example, usando
env_list para INQUIRY_NOTIFY_EMAILS, int para puerto/timeout y bool para TLS.
EMAIL_BACKEND debe usar consola por defecto en desarrollo; locmem en pruebas.
No usar consola con datos reales en producción: el backend imprime el correo.
"""
import logging

from django.conf import settings
from django.core.mail import EmailMessage

from apps.inquiries.notifiers import InquiryNotifier

logger = logging.getLogger(__name__)


def header(value):
    return str(value).replace("\r", "").replace("\n", "")


class EmailInquiryNotifier(InquiryNotifier):
    def notify_created(self, inquiry):
        recipients = getattr(settings, "INQUIRY_NOTIFY_EMAILS", [])
        if isinstance(recipients, str):
            recipients = recipients.split(",")
        recipients = [header(value).strip() for value in recipients if str(value).strip()]
        recipients = [value for value in recipients if value]
        if not recipients:
            logger.info("Notificación omitida sin destinatarios; consulta=%s", inquiry["id"])
            return
        kind = "visita" if inquiry.get("kind") == "visita" else "contacto"
        subject = header(f"EnObra: nueva consulta de {kind} - {inquiry.get('subject', '')}")
        base_url = getattr(settings, "FRONTEND_BASE_URL", "").rstrip("/")
        fields = (("Tipo", kind), ("Consulta", inquiry["id"]), ("Nombre", inquiry.get("name")),
                  ("Teléfono", inquiry.get("phone")), ("Correo", inquiry.get("email")),
                  ("Asunto", inquiry.get("subject")), ("Mensaje", inquiry.get("message")),
                  ("Propiedad", inquiry.get("property_title")),
                  ("ID propiedad", inquiry.get("property_id")),
                  ("Fecha preferida", inquiry.get("preferred_date")))
        body = "\n".join(f"{label}: {value if value is not None else ''}" for label, value in fields)
        body += f"\n\nVer mensajes: {base_url}/admin/mensajes\n"
        # Visitor data stays in the body; never use their address as sender/reply-to.
        EmailMessage(subject=subject, body=body,
                     from_email=header(settings.DEFAULT_FROM_EMAIL),
                     to=recipients).send(fail_silently=False)
