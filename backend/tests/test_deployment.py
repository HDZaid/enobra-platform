"""Despliegue (Render + Cloudinary + Resend): sin red y sin credenciales reales."""
import io
import json
import os
import subprocess
import sys
import urllib.error
from pathlib import Path
from unittest.mock import MagicMock, patch

from PIL import Image
from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase, TestCase, override_settings

from config.bindings import build_media_storage, build_notifier
from persistence.media import DjangoMediaStorage
from persistence.media_cloudinary import CloudinaryMediaStorage
from persistence.models import ContenidoPagina, Usuario
from persistence.notifiers import EmailInquiryNotifier, ResendInquiryNotifier

BACKEND_DIR = Path(__file__).resolve().parent.parent
INQUIRY = {"id": 5, "kind": "contacto", "name": "Ana", "email": "ana@example.com", "phone": "5555", "subject": "Hola",
           "message": "Quiero informes"}


def png_bytes():
    buffer = io.BytesIO()
    Image.new("RGB", (4, 4), "white").save(buffer, "PNG")
    return buffer.getvalue()


CLOUD_ENV = {"CLOUDINARY_URL": "cloudinary://123456:secret-de-prueba@demo-cloud"}


def use_cloudinary_env(test):
    """Variables de entorno de prueba y configuración del SDK recargada (se lee al importar)."""
    import cloudinary
    patcher = patch.dict(os.environ, CLOUD_ENV)
    patcher.start()
    cloudinary.reset_config()
    test.addCleanup(cloudinary.reset_config)
    test.addCleanup(patcher.stop)


class CloudinaryStorageTests(TestCase):
    def setUp(self):
        use_cloudinary_env(self)
        self.user = Usuario.objects.create(nombre="Subida", correo="subida@example.com", password_hash="x")
        self.storage = CloudinaryMediaStorage()
        data = png_bytes()
        self.file, self.size = io.BytesIO(data), len(data)

    def save(self):
        return self.storage.save(self.file, filename="a.png", content_type="image/png", size=self.size,
                                 kind="photo", uploaded_by=str(self.user.pk))

    def test_saves_secure_url_and_provider_key(self):
        uploaded = {"secure_url": "https://res.cloudinary.com/demo-cloud/image/upload/enobra/abc.png", "public_id": "enobra/abc"}
        with patch("cloudinary.uploader.upload", return_value=uploaded) as upload:
            result = self.save()
        self.assertEqual(result["url"], uploaded["secure_url"])
        self.assertEqual(result["path"], "enobra/abc")
        self.assertEqual(result["provider"], "cloudinary")
        self.assertEqual(upload.call_args.kwargs["folder"], "enobra")
        self.assertEqual(upload.call_args.kwargs["resource_type"], "image")
        self.assertEqual(self.storage.get(result["id"])["url"], uploaded["secure_url"])

    def test_invalid_image_never_reaches_cloudinary(self):
        from rest_framework.exceptions import ValidationError
        self.file = io.BytesIO(b"no es una imagen")
        self.size = 16
        with patch("cloudinary.uploader.upload") as upload, self.assertRaises(ValidationError):
            self.save()
        upload.assert_not_called()

    def test_insecure_or_missing_url_is_rejected_and_cleaned(self):
        with patch("cloudinary.uploader.upload", return_value={"secure_url": "http://x/y.png", "public_id": "enobra/z"}), \
                patch("cloudinary.uploader.destroy") as destroy, self.assertRaises(RuntimeError):
            self.save()
        destroy.assert_called_once()
        self.assertFalse(ContenidoPagina.objects.filter(clave__startswith="admin.media.").exists())

    def test_database_failure_removes_the_remote_file(self):
        uploaded = {"secure_url": "https://res.cloudinary.com/demo-cloud/image/upload/enobra/q.png", "public_id": "enobra/q"}
        with patch("cloudinary.uploader.upload", return_value=uploaded), \
                patch("persistence.media_cloudinary.write_data", side_effect=RuntimeError("bd")), \
                patch("cloudinary.uploader.destroy") as destroy, self.assertRaises(RuntimeError):
            self.save()
        destroy.assert_called_once_with("enobra/q", resource_type="image", invalidate=True)

    def test_delete_removes_metadata_and_remote_file_after_commit(self):
        uploaded = {"secure_url": "https://res.cloudinary.com/demo-cloud/image/upload/enobra/d.png", "public_id": "enobra/d"}
        with patch("cloudinary.uploader.upload", return_value=uploaded):
            media_id = self.save()["id"]
        with patch("cloudinary.uploader.destroy") as destroy, self.captureOnCommitCallbacks(execute=True):
            self.assertTrue(self.storage.delete(media_id, deleted_by=str(self.user.pk)))
        destroy.assert_called_once_with("enobra/d", resource_type="image", invalidate=True)
        self.assertIsNone(self.storage.get(media_id))

    def test_remote_failure_on_delete_does_not_break_the_operation(self):
        uploaded = {"secure_url": "https://res.cloudinary.com/demo-cloud/image/upload/enobra/e.png", "public_id": "enobra/e"}
        with patch("cloudinary.uploader.upload", return_value=uploaded):
            media_id = self.save()["id"]
        with patch("cloudinary.uploader.destroy", side_effect=RuntimeError("red")), self.captureOnCommitCallbacks(execute=True):
            self.assertTrue(self.storage.delete(media_id))


class ProviderSelectionTests(SimpleTestCase):
    def test_media_defaults_to_local(self):
        self.assertIsInstance(build_media_storage(DjangoMediaStorage), DjangoMediaStorage)
        self.assertNotIsInstance(build_media_storage(DjangoMediaStorage), CloudinaryMediaStorage)

    @override_settings(MEDIA_STORAGE_BACKEND="cloudinary")
    def test_cloudinary_requires_credentials(self):
        import cloudinary
        with patch.dict(os.environ):
            os.environ.pop("CLOUDINARY_URL", None)
            cloudinary.reset_config()
            self.addCleanup(cloudinary.reset_config)
            with self.assertRaises(ImproperlyConfigured):
                build_media_storage(DjangoMediaStorage)

    @override_settings(MEDIA_STORAGE_BACKEND="cloudinary")
    def test_cloudinary_with_credentials(self):
        use_cloudinary_env(self)
        self.assertIsInstance(build_media_storage(DjangoMediaStorage), CloudinaryMediaStorage)

    @override_settings(MEDIA_STORAGE_BACKEND="s3")
    def test_unknown_media_backend_fails_fast(self):
        with self.assertRaises(ImproperlyConfigured):
            build_media_storage(DjangoMediaStorage)

    def test_notifier_defaults_to_email(self):
        self.assertIsInstance(build_notifier(EmailInquiryNotifier, ResendInquiryNotifier), EmailInquiryNotifier)

    @override_settings(INQUIRY_NOTIFIER="resend", RESEND_API_KEY="")
    def test_resend_requires_key(self):
        with self.assertRaises(ImproperlyConfigured):
            build_notifier(EmailInquiryNotifier, ResendInquiryNotifier)

    @override_settings(INQUIRY_NOTIFIER="resend", RESEND_API_KEY="re_prueba")
    def test_resend_selected(self):
        self.assertIsInstance(build_notifier(EmailInquiryNotifier, ResendInquiryNotifier), ResendInquiryNotifier)

    @override_settings(INQUIRY_NOTIFIER="correo")
    def test_unknown_notifier_fails_fast(self):
        with self.assertRaises(ImproperlyConfigured):
            build_notifier(EmailInquiryNotifier, ResendInquiryNotifier)


@override_settings(RESEND_API_KEY="re_prueba", INQUIRY_NOTIFY_EMAILS=["empresa@example.com"],
                   DEFAULT_FROM_EMAIL="avisos@enobra.example", FRONTEND_BASE_URL="https://enobra.example/")
class ResendNotifierTests(SimpleTestCase):
    def test_posts_json_over_https_with_bearer_token(self):
        response = MagicMock(status=200)
        response.__enter__.return_value = response
        with patch("urllib.request.urlopen", return_value=response) as urlopen:
            ResendInquiryNotifier().notify_created(INQUIRY)
        request = urlopen.call_args.args[0]
        self.assertTrue(request.full_url.startswith("https://"))
        self.assertEqual(request.get_header("Authorization"), "Bearer re_prueba")
        self.assertIn("enobra-backend", request.get_header("User-agent"))
        body = json.loads(request.data)
        self.assertEqual(body["to"], ["empresa@example.com"])
        self.assertEqual(body["from"], "avisos@enobra.example")
        self.assertIn("Quiero informes", body["text"])
        self.assertIn("https://enobra.example/admin/mensajes", body["text"])
        self.assertEqual(urlopen.call_args.kwargs["timeout"], 5)

    @override_settings(INQUIRY_NOTIFY_EMAILS=[])
    def test_no_recipients_sends_nothing(self):
        with patch("urllib.request.urlopen") as urlopen:
            ResendInquiryNotifier().notify_created(INQUIRY)
        urlopen.assert_not_called()

    def test_api_error_does_not_leak_the_key(self):
        error = urllib.error.HTTPError("https://api.resend.com/emails", 403, "Forbidden", {}, None)
        with patch("urllib.request.urlopen", side_effect=error), self.assertRaises(RuntimeError) as caught:
            ResendInquiryNotifier().notify_created(INQUIRY)
        self.assertIn("403", str(caught.exception))
        self.assertNotIn("re_prueba", str(caught.exception))

    def test_header_injection_is_neutralized(self):
        response = MagicMock(status=200)
        response.__enter__.return_value = response
        with patch("urllib.request.urlopen", return_value=response) as urlopen:
            ResendInquiryNotifier().notify_created({**INQUIRY, "subject": "Hola\r\nBcc: x@evil.test"})
        subject = json.loads(urlopen.call_args.args[0].data)["subject"]
        self.assertNotIn("\n", subject)
        self.assertNotIn("\r", subject)


class ProductionSettingsTests(SimpleTestCase):
    """Se importa config.settings en un proceso aparte con DJANGO_DEBUG=false."""

    def run_settings(self, code=None, **env):
        base = {k: v for k, v in os.environ.items() if not k.startswith(("DJANGO_", "DATABASE_"))}
        base.update(env)
        code = code or "import config.settings as s; print(s.SECURE_SSL_REDIRECT, s.SECURE_PROXY_SSL_HEADER[1], s.SECURE_REDIRECT_EXEMPT[0])"
        return subprocess.run([sys.executable, "-I", "-c", f"import sys; sys.path.insert(0, {str(BACKEND_DIR)!r}); {code}"],
                              cwd=BACKEND_DIR, env=base, capture_output=True, text=True)

    def test_debug_false_rejects_the_default_secret_key(self):
        result = self.run_settings(DJANGO_DEBUG="false")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("DJANGO_SECRET_KEY", result.stderr)

    def test_debug_false_rejects_a_short_secret_key(self):
        self.assertNotEqual(self.run_settings(DJANGO_DEBUG="false", DJANGO_SECRET_KEY="corta").returncode, 0)

    def test_debug_false_with_a_real_key_enables_https_hardening(self):
        result = self.run_settings(DJANGO_DEBUG="false", DJANGO_SECRET_KEY="k" * 50)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.split()[:2], ["True", "https"])
        self.assertIn("health", result.stdout)

    def test_development_default_is_unaffected(self):
        result = self.run_settings("import config.settings as s; print(s.DEBUG, hasattr(s, 'SECURE_SSL_REDIRECT'))")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.split(), ["True", "False"])
