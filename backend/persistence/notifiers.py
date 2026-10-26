"""BE-09: adaptador de correo; no registra dependencias automáticamente.

Se registra en config/bindings.py según INQUIRY_NOTIFIER (email | resend):
    register(InquiryNotifier, EmailInquiryNotifier())
Importar el puerto desde apps.inquiries.notifiers y el adaptador desde este módulo.
En settings.py debe leer las variables documentadas en .env.example, usando
env_list para INQUIRY_NOTIFY_EMAILS, int para puerto/timeout y bool para TLS.
EMAIL_BACKEND debe usar consola por defecto en desarrollo; locmem en pruebas.
No usar consola con datos reales en producción: el backend imprime el correo.
"""
import json
import logging
import urllib.error
import urllib.request

from django.conf import settings
from django.core.mail import EmailMessage

from apps.inquiries.notifiers import InquiryNotifier

logger = logging.getLogger(__name__)


def header(value):
    return str(value).replace("\r", "").replace("\n", "")


def build_notification(inquiry):
    """-> (asunto, cuerpo, destinatarios) o None si no hay destinatarios."""
    recipients = getattr(settings, "INQUIRY_NOTIFY_EMAILS", [])
    if isinstance(recipients, str):
        recipients = recipients.split(",")
    recipients = [header(value).strip() for value in recipients if str(value).strip()]
    recipients = [value for value in recipients if value]
    if not recipients:
        logger.info("Notificación omitida sin destinatarios; consulta=%s", inquiry["id"])
        return None
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
    return subject, body, recipients


class EmailInquiryNotifier(InquiryNotifier):
    """Correo por SMTP/consola de Django. En Render gratuito el SMTP está bloqueado."""

    def notify_created(self, inquiry):
        built = build_notification(inquiry)
        if built is None:
            return
        subject, body, recipients = built
        # Visitor data stays in the body; never use their address as sender/reply-to.
        EmailMessage(subject=subject, body=body,
                     from_email=header(settings.DEFAULT_FROM_EMAIL),
                     to=recipients).send(fail_silently=False)


class ResendInquiryNotifier(InquiryNotifier):
    """Correo por API HTTPS de Resend (sirve donde el SMTP está bloqueado).

    Requiere RESEND_API_KEY y que DEFAULT_FROM_EMAIL pertenezca a un dominio verificado.
    Nunca se registran la clave ni el cuerpo de la respuesta.
    """

    def notify_created(self, inquiry):
        built = build_notification(inquiry)
        if built is None:
            return
        subject, body, recipients = built
        api_key = getattr(settings, "RESEND_API_KEY", "")
        if not api_key:
            raise RuntimeError("RESEND_API_KEY no está configurada.")
        payload = json.dumps({"from": header(settings.DEFAULT_FROM_EMAIL), "to": recipients,
                              "subject": subject, "text": body}).encode("utf-8")
        request = urllib.request.Request(
            getattr(settings, "RESEND_API_URL", "https://api.resend.com/emails"), data=payload, method="POST",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json",
                     "User-Agent": "enobra-backend/1.0"})
        try:
            with urllib.request.urlopen(request, timeout=getattr(settings, "EMAIL_TIMEOUT", 5)) as response:
                if not 200 <= response.status < 300:
                    raise RuntimeError(f"Resend respondió {response.status}.")
        except urllib.error.HTTPError as error:
            raise RuntimeError(f"Resend rechazó el envío ({error.code}).") from None
