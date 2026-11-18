"""Versiones WebP reducidas de las imágenes; archivos locales desechables, sin R2 real."""
import io
import os
import tempfile
from unittest.mock import patch
from urllib.parse import urlsplit

from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.interfaces import Principal
from persistence.models import Usuario
from persistence.support import read_data

API = "/api/v1/"


def image_bytes(size, image_format="JPEG", mode="RGB", color="teal"):
    buffer = io.BytesIO()
    Image.new(mode, size, color).save(buffer, image_format)
    return buffer.getvalue()


class MediaVariantTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = Usuario.objects.create(nombre="Prueba de renders", correo="renders@example.test", password_hash="unused")

    def setUp(self):
        self.directory = self.enterContext(tempfile.TemporaryDirectory())
        self.enterContext(override_settings(R2_ENABLED=True, R2_ACCESS_MODE="private",
            MEDIA_ROOT=self.directory, MEDIA_URL="/media/", MEDIA_UPLOADS_ENABLED=True,
            MEDIA_API_ORIGIN="https://testserver"))
        self.client = APIClient()
        self.client.force_authenticate(Principal(id=str(self.user.pk), name=self.user.nombre,
            email=self.user.correo, role="Administrador", permissions=frozenset({"admin.all"})))

    def upload(self, data, name="render.jpg", content_type="image/jpeg"):
        return self.client.post(API + "admin/media/", {
            "file": SimpleUploadedFile(name, data, content_type=content_type), "kind": "render"}, format="multipart")

    def fetch(self, item, query=""):
        response = self.client.get(urlsplit(item["url"]).path + query)
        self.assertEqual(response.status_code, 200)
        body = b"".join(response.streaming_content)
        response.close()
        return response, body

    def test_large_render_gets_reduced_webp_versions(self):
        original = image_bytes((3000, 2000))
        item = self.upload(original).json()
        stored = read_data("admin.media." + item["id"])
        self.assertEqual(set(stored["variants"]), {"1920", "800"})
        self.assertNotIn("variants", item)

        for side in (1920, 800):
            response, body = self.fetch(item, f"?w={side}")
            self.assertEqual(response["Content-Type"], "image/webp")
            with Image.open(io.BytesIO(body)) as variant:
                self.assertEqual(variant.format, "WEBP")
                self.assertEqual(max(variant.size), side)
                self.assertLessEqual(abs(variant.size[0] * 2 - variant.size[1] * 3), 3)

        response, body = self.fetch(item)
        self.assertEqual(response["Content-Type"], "image/jpeg")
        self.assertEqual(body, original)
        response, body = self.fetch(item, "?w=999")
        self.assertEqual(body, original)

    def test_small_image_and_gif_keep_only_the_original(self):
        small = image_bytes((600, 400), "PNG")
        item = self.upload(small, "plano.png", "image/png").json()
        self.assertNotIn("variants", read_data("admin.media." + item["id"]))
        response, body = self.fetch(item, "?w=800")
        self.assertEqual((response["Content-Type"], body), ("image/png", small))

        gif = image_bytes((2400, 1600), "GIF", "P")
        item = self.upload(gif, "animacion.gif", "image/gif").json()
        self.assertNotIn("variants", read_data("admin.media." + item["id"]))

    def test_transparent_png_keeps_its_alpha_channel(self):
        item = self.upload(image_bytes((2400, 1600), "PNG", "RGBA", (0, 128, 128, 120)), "render.png", "image/png").json()
        _, body = self.fetch(item, "?w=800")
        with Image.open(io.BytesIO(body)) as variant:
            self.assertIn("A", variant.getbands())

    def test_resolution_over_the_limit_is_rejected_with_guidance(self):
        with override_settings(MEDIA_MAX_IMAGE_PIXELS=1_000_000):
            response = self.upload(image_bytes((1200, 1000)))
        self.assertEqual(response.status_code, 400)
        self.assertIn("megapíxeles", response.content.decode())
        uploads = os.path.join(self.directory, "uploads")
        self.assertFalse(os.path.isdir(uploads) and os.listdir(uploads))

    def test_failed_reduction_does_not_block_the_upload(self):
        render = image_bytes((3000, 2000))
        with patch("persistence.media_variants.Image.Image.save", side_effect=OSError("sin espacio")):
            response = self.upload(render)
        self.assertEqual(response.status_code, 201, response.content)
        self.assertNotIn("variants", read_data("admin.media." + response.json()["id"]))

    def test_deleting_the_image_removes_its_versions(self):
        item = self.upload(image_bytes((3000, 2000))).json()
        uploads = os.path.join(self.directory, "uploads")
        self.assertEqual(len(os.listdir(uploads)), 3)
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.delete(API + f"admin/media/{item['id']}/")
        self.assertEqual(response.status_code, 204)
        self.assertEqual(os.listdir(uploads), [])

