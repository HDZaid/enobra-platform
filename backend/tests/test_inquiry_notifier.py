"""BE-09: binding y correo aislados, sin SMTP ni escrituras en Supabase."""
from datetime import date, timedelta
import io
from unittest.mock import Mock, patch

from django.core import mail
from django.core.cache import cache
from django.db import transaction
from django.test import TestCase, TransactionTestCase, override_settings
from rest_framework.test import APIClient

from apps.common import registry
from apps.inquiries.notifiers import InquiryNotifier
from persistence.inquiries import DjangoInquiryRepository
from persistence.models import MensajeContacto, Propiedad, TipoOperacion, TipoPropiedad
from persistence.notifiers import EmailInquiryNotifier

CONTACT = "/api/v1/inquiries/contact/"
VISIT = "/api/v1/inquiries/visits/"
MAIL_SETTINGS = dict(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    DEFAULT_FROM_EMAIL="no-reply@example.com", EMAIL_TIMEOUT=5,
    INQUIRY_NOTIFY_EMAILS=["company@example.com"], FRONTEND_BASE_URL="http://localhost:5173/")


def contact_data(**changes):
    data = dict(name="Persona de prueba", email="visitor@example.com", phone="55551234",
                subject="Construcción", message="Quiero información")
    data.update(changes)
    return data


@override_settings(**MAIL_SETTINGS)
class InquiryNotifierTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.repo = DjangoInquiryRepository()
        binding = patch.dict(registry._registry, {InquiryNotifier: EmailInquiryNotifier()})
        binding.start()
        self.addCleanup(binding.stop)
        # Opening locmem initializes the per-test outbox without sending anything.
        mail.get_connection()
        mail.outbox.clear()
        kind = TipoPropiedad.objects.create(nombre="Casa notificador")
        operation = TipoOperacion.objects.create(nombre="Venta notificador")
        self.property = Propiedad.objects.create(tipo_propiedad=kind, tipo_operacion=operation,
            titulo="Casa para visita", slug="casa-notificador", publicado=True)

    def visit_data(self, **changes):
        data = dict(property_id=self.property.pk, name="Visitante", phone="55551234",
                    preferred_date=(date.today() + timedelta(days=1)).isoformat())
        data.update(changes)
        return data

    def test_contact_sends_once_after_commit_callback(self):
        with self.captureOnCommitCallbacks(execute=True) as callbacks:
            response = self.client.post(CONTACT, contact_data(), format="json")
            self.assertEqual(response.status_code, 201)
            self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(len(callbacks), 1)
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        for text in ("contacto", "Persona de prueba", "visitor@example.com", "55551234",
                     "Construcción", "Quiero información", "http://localhost:5173/admin/mensajes"):
            self.assertIn(text, message.body)
        self.assertEqual(message.to, ["company@example.com"])
        self.assertEqual(message.from_email, "no-reply@example.com")

    def test_visit_sends_property_and_preferred_date(self):
        data = self.visit_data()
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(VISIT, data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(mail.outbox), 1)
        for text in ("visita", "Visitante", "Casa para visita", data["preferred_date"],
                     "Solicitud de visita", "/admin/mensajes"):
            self.assertIn(text, mail.outbox[0].body)

    def test_no_recipients_does_not_open_mail_connection(self):
        for recipients in ([], "", " , ", ["\r\n"]):
            with self.subTest(recipients=recipients), override_settings(INQUIRY_NOTIFY_EMAILS=recipients):
                with patch("persistence.notifiers.EmailMessage") as message:
                    with self.assertLogs("persistence.notifiers", level="INFO") as logs:
                        with self.captureOnCommitCallbacks(execute=True):
                            response = self.client.post(CONTACT, contact_data(), format="json")
                    self.assertEqual(response.status_code, 201)
                    message.assert_not_called()
                    self.assertNotIn("visitor@example.com", str(logs.output))
        self.assertEqual(len(mail.outbox), 0)

    def test_comma_separated_recipients(self):
        with override_settings(INQUIRY_NOTIFY_EMAILS="one@example.com, two@example.com, "):
            with self.captureOnCommitCallbacks(execute=True):
                self.repo.create_contact(contact_data())
        self.assertEqual(mail.outbox[0].to, ["one@example.com", "two@example.com"])

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.console.EmailBackend")
    def test_console_backend_for_development_uses_no_smtp(self):
        output = io.StringIO()
        with patch("sys.stdout", output):
            with self.captureOnCommitCallbacks(execute=True):
                self.repo.create_contact(contact_data())
        self.assertIn("http://localhost:5173/admin/mensajes", output.getvalue())

    def test_headers_cannot_be_injected_by_visitor(self):
        data = contact_data(name="Persona\r\nBcc: x@y.z", subject="Asunto\r\nBcc: x@y.z")
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(CONTACT, data, format="json")
        self.assertEqual(response.status_code, 201)
        message = mail.outbox[0]
        self.assertNotIn("\r", message.subject)
        self.assertNotIn("\n", message.subject)
        self.assertEqual(message.bcc, [])
        self.assertEqual(message.reply_to, [])
        self.assertIsNone(message.message().get("Bcc"))
        self.assertEqual(message.recipients(), ["company@example.com"])

    def test_smtp_failure_does_not_expose_personal_data(self):
        with patch("django.core.mail.backends.locmem.EmailBackend.send_messages",
                   side_effect=RuntimeError("visitor@example.com secret password message")):
            with self.assertLogs("persistence.inquiries", level="ERROR") as logs:
                with self.captureOnCommitCallbacks(execute=True):
                    response = self.client.post(CONTACT, contact_data(), format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(MensajeContacto.objects.filter(pk=response.json()["id"]).exists())
        self.assertIn("consulta=" + response.json()["id"], str(logs.output))
        for sensitive in ("visitor@example.com", "secret", "Persona de prueba", "55551234"):
            self.assertNotIn(sensitive, str(logs.output))
        self.assertIsNone(logs.records[0].exc_info)

    def test_missing_binding_preserves_creation(self):
        registry._registry.pop(InquiryNotifier)
        with self.assertLogs("persistence.inquiries", level="WARNING"):
            with self.captureOnCommitCallbacks(execute=True):
                response = self.client.post(CONTACT, contact_data(), format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(mail.outbox), 0)

    def test_outer_rollback_discards_notification_and_inquiry(self):
        for kind in ("contact", "visit"):
            with self.subTest(kind=kind):
                with self.captureOnCommitCallbacks(execute=True) as callbacks:
                    with self.assertRaises(RuntimeError):
                        with transaction.atomic():
                            if kind == "contact":
                                self.repo.create_contact(contact_data())
                            else:
                                data = self.visit_data()
                                data["preferred_date"] = date.fromisoformat(data["preferred_date"])
                                self.repo.create_visit(data)
                            raise RuntimeError("rollback")
                self.assertEqual(callbacks, [])
                self.assertFalse(MensajeContacto.objects.exists())
                self.assertEqual(len(mail.outbox), 0)

    def test_invalid_and_unavailable_requests_never_notify(self):
        for url, payload, expected in (
            (CONTACT, contact_data(email="bad"), 400),
            (CONTACT, contact_data(website="spam"), 400),
            (VISIT, self.visit_data(property_id=self.property.pk + 100), 404),
        ):
            with self.captureOnCommitCallbacks(execute=True) as callbacks:
                response = self.client.post(url, payload, format="json")
            self.assertEqual(response.status_code, expected)
            self.assertEqual(callbacks, [])
        self.property.publicado = False
        self.property.save(update_fields=["publicado"])
        with self.captureOnCommitCallbacks(execute=True) as callbacks:
            self.assertEqual(self.client.post(VISIT, self.visit_data(), format="json").status_code, 404)
        self.assertEqual(callbacks, [])
        self.assertFalse(MensajeContacto.objects.exists())

    def test_shared_ten_per_hour_ip_limit_is_preserved(self):
        with self.captureOnCommitCallbacks(execute=True):
            for index in range(10):
                url, data = (CONTACT, contact_data()) if index % 2 == 0 else (VISIT, self.visit_data())
                self.assertEqual(self.client.post(url, data, format="json").status_code, 201)
            self.assertEqual(self.client.post(CONTACT, contact_data(), format="json").status_code, 429)
            self.assertEqual(self.client.post(VISIT, self.visit_data(), format="json").status_code, 429)
        self.assertEqual(len(mail.outbox), 10)
        self.assertEqual(MensajeContacto.objects.count(), 10)
        with self.captureOnCommitCallbacks(execute=True):
            self.assertEqual(self.client.post(CONTACT, contact_data(), format="json",
                REMOTE_ADDR="192.0.2.10").status_code, 201)


@override_settings(**MAIL_SETTINGS)
class InquiryRealCommitTests(TransactionTestCase):
    def test_real_commit_sends_only_after_outer_transaction(self):
        mail.get_connection()
        mail.outbox.clear()
        try:
            with patch.dict(registry._registry, {InquiryNotifier: EmailInquiryNotifier()}):
                with transaction.atomic():
                    inquiry = DjangoInquiryRepository().create_contact(contact_data())
                    self.assertEqual(len(mail.outbox), 0)
                    self.assertTrue(MensajeContacto.objects.filter(pk=inquiry["id"]).exists())
                self.assertEqual(len(mail.outbox), 1)
                self.assertFalse(transaction.get_connection().in_atomic_block)
        finally:
            MensajeContacto.objects.all().delete()

    def test_real_commit_failure_still_returns_201(self):
        cache.clear()
        notifier = Mock(spec=InquiryNotifier)
        notifier.notify_created.side_effect = RuntimeError("private@example.com")
        try:
            with patch.dict(registry._registry, {InquiryNotifier: notifier}):
                with self.assertLogs("persistence.inquiries", level="ERROR"):
                    response = APIClient().post(CONTACT, contact_data(), format="json")
            self.assertEqual(response.status_code, 201)
            self.assertTrue(MensajeContacto.objects.filter(pk=response.json()["id"]).exists())
            notifier.notify_created.assert_called_once()
            self.assertFalse(transaction.get_connection().in_atomic_block)
        finally:
            # Unmanaged tables are not flushed automatically by TransactionTestCase.
            MensajeContacto.objects.all().delete()
            cache.clear()
