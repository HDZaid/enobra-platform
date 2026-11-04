"""API de R2 privado con archivos locales desechables; nunca conecta con R2 real."""
import io
import tempfile
import time
from unittest.mock import patch
from urllib.parse import urlsplit, parse_qs

from PIL import Image
from botocore.exceptions import ClientError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.interfaces import Principal
from persistence.models import Usuario
from persistence.support import read_data

API = "/api/v1/"


class PrivateMediaAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = Usuario.objects.create(nombre="Prueba de medios", correo="media@example.test", password_hash="unused")

    def setUp(self):
        directory = self.enterContext(tempfile.TemporaryDirectory())
        self.enterContext(override_settings(R2_ENABLED=True, R2_ACCESS_MODE="private",
            MEDIA_ROOT=directory, MEDIA_URL="/media/", MEDIA_UPLOADS_ENABLED=True,
            MEDIA_API_ORIGIN="https://testserver"))
        self.client, self.public = APIClient(), APIClient()
        self.client.force_authenticate(Principal(id=str(self.user.pk), name=self.user.nombre,
            email=self.user.correo, role="Administrador", permissions=frozenset({"admin.all"})))

    def upload(self):
        image = io.BytesIO()
        Image.new("RGB", (4, 4), "blue").save(image, "PNG")
        self.image_bytes = image.getvalue()
        response = self.client.post(API + "admin/media/", {
            "file": SimpleUploadedFile("photo.png", self.image_bytes, content_type="image/png")}, format="multipart")
        self.assertEqual(response.status_code, 201, response.content)
        self.item = response.json()
        self.canonical = urlsplit(self.item["url"]).path
        return self.item

    def create_news(self, *, published=True, image=None):
        response = self.client.post(API + "news/", {"title": "Noticia de prueba", "category": "Eventos",
            "date": "2026-11-03", "description": "Contenido de prueba", "demo": False,
            "published": published, "image": image or self.item["url"]}, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def test_uploaded_preview_is_temporary_and_is_not_persisted(self):
        with patch("persistence.media.default_storage.url", side_effect=AssertionError("No emitir URLs S3")):
            item = self.upload()
        stored = read_data("admin.media." + item["id"])
        self.assertEqual(stored["url"], self.canonical)
        self.assertNotIn("?", stored["url"])
        self.assertEqual(stored["provider"], "r2-private")
        self.assertIn("preview=", item["url"])
        self.assertEqual(self.public.get(self.canonical).status_code, 404)
        response = self.public.get(item["url"])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(b"".join(response.streaming_content), self.image_bytes)
        self.assertEqual(response["Cache-Control"], "private, no-store")
        self.assertEqual(response["Content-Type"], "image/png")
        response.close()

    def test_only_published_content_opens_anonymous_reading(self):
        self.upload()
        news = self.create_news()
        self.assertEqual(news["image"], "https://testserver" + self.canonical)
        self.assertEqual(read_data("admin.news.1")["image"], self.canonical)
        response = self.public.get(self.canonical)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(b"".join(response.streaming_content), self.image_bytes)
        self.assertEqual(response["Cache-Control"], "public, max-age=300")
        response.close()
        changed = self.client.patch(API + f"news/{news['id']}/", {"published": False}, format="json")
        self.assertEqual(changed.status_code, 200)
        self.assertIn("preview=", changed.json()["image"])
        self.assertEqual(self.public.get(self.canonical).status_code, 404)
        private = self.client.get(self.canonical)
        self.assertEqual(private.status_code, 200)
        private.close()

    def test_preview_expiration_tampering_and_other_object_are_rejected_before_storage(self):
        first = self.upload()
        first_token = parse_qs(urlsplit(first["url"]).query)["preview"][0]
        second = self.upload()
        second_path = urlsplit(second["url"]).path
        with patch("persistence.media.default_storage.open") as open_file:
            self.assertEqual(self.public.get(second_path, {"preview": first_token}).status_code, 404)
            self.assertEqual(self.public.get(second_path, {"preview": first_token + "x"}).status_code, 404)
            with patch("django.core.signing.time.time", return_value=time.time() + 901):
                self.assertEqual(self.public.get(first["url"]).status_code, 404)
            open_file.assert_not_called()

    def test_signed_absolute_reference_is_canonicalized_before_saving(self):
        self.upload()
        news = self.create_news(published=False, image=self.item["url"])
        self.assertIn("preview=", news["image"])
        self.assertEqual(read_data("admin.news.1")["image"], self.canonical)

    def test_trash_keeps_the_file_private_and_blocks_deletion(self):
        self.upload()
        response = self.client.post(API + "projects/", {"title": "Proyecto de prueba", "category": "Vivienda",
            "year": 2026, "country": "Guatemala", "description": "Descripción", "published": True,
            "demo": False, "images": [self.item["url"]], "renders": [], "video": ""}, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        item = response.json()
        self.assertEqual(self.client.delete(API + f"projects/{item['id']}/").status_code, 204)
        self.assertEqual(self.public.get(self.canonical).status_code, 404)
        self.assertEqual(self.client.delete(API + f"admin/media/{self.item['id']}/").status_code, 400)

    def test_remote_failure_does_not_expose_credentials(self):
        self.upload()
        failure = ClientError({"Error": {"Code": "AccessDenied", "Message": "fake-secret-key"}}, "GetObject")
        with patch("persistence.media.default_storage.open", side_effect=failure):
            response = self.client.get(self.canonical)
        self.assertEqual(response.status_code, 503)
        self.assertNotIn(b"fake-secret-key", response.content)

    def test_company_logo_is_public_through_api_without_opening_r2(self):
        self.upload()
        response = self.client.put(API + "company/", {"name": "EnObra", "person": "Prueba",
            "address": "Ciudad", "phones": ["12345678"], "whatsapp": "", "email": "",
            "instagram": "", "facebook": "", "domain": "https://example.test",
            "logo": self.item["url"]}, format="json")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(read_data("admin.company")["logo"], self.canonical)
        self.assertEqual(response.json()["logo"], "https://testserver" + self.canonical)
        image = self.public.get(self.canonical)
        self.assertEqual(image.status_code, 200)
        image.close()
