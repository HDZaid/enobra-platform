"""Cloudflare R2: almacenamiento falso, sin red ni credenciales reales."""
import io
from unittest.mock import patch

from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.exceptions import ValidationError

from config.bindings import build_media_storage
from persistence.media import DjangoMediaStorage
from persistence.media_r2 import R2MediaStorage, build_s3_storage, ensure_configured
from persistence.models import Usuario
from persistence.support import write_data
from tests.test_deployment import png_bytes

R2_SETTINGS = dict(R2_ACCOUNT_ID="cuenta-de-prueba", R2_ACCESS_KEY_ID="clave-de-prueba",
                   R2_SECRET_ACCESS_KEY="secreto-de-prueba", R2_BUCKET="enobra-pruebas",
                   R2_PUBLIC_BASE_URL="https://media.example.com")


class FakeR2:
    def __init__(self, fail_delete=False):
        self.saved, self.deleted, self.content_types = {}, [], {}
        self.fail_delete = fail_delete

    def save(self, name, content):
        self.saved[name] = content.read()
        self.content_types[name] = getattr(content, "content_type", None)
        return name

    def delete(self, name):
        if self.fail_delete:
            raise RuntimeError("fallo remoto simulado")
        self.deleted.append(name)


@override_settings(**R2_SETTINGS)
class R2StorageTests(TestCase):
    def setUp(self):
        self.user = Usuario.objects.create(nombre="Subida", correo="subida@example.com", password_hash="x")
        self.remote = FakeR2()
        self.storage = R2MediaStorage(self.remote)
        data = png_bytes()
        self.file, self.size = io.BytesIO(data), len(data)
        self.network = patch("socket.socket.connect", side_effect=AssertionError("Red prohibida en pruebas"))
        self.network.start()
        self.addCleanup(self.network.stop)

    def save(self):
        return self.storage.save(self.file, filename="a.png", content_type="image/png", size=self.size,
                                 kind="photo", uploaded_by=str(self.user.pk))

    def test_guarda_url_publica_proveedor_y_mime(self):
        result = self.save()
        self.assertEqual(result["url"], f'https://media.example.com/uploads/{result["id"]}.png')
        self.assertTrue(result["path"].startswith("uploads/"))
        self.assertEqual(result["provider"], "r2")
        self.assertEqual(self.storage.get(result["id"]), result)
        self.assertEqual(self.remote.content_types[result["path"]], "image/png")

    def test_imagen_invalida_no_llega_a_r2(self):
        self.file = io.BytesIO(b"no es una imagen")
        with self.assertRaises(ValidationError):
            self.save()
        self.assertEqual(self.remote.saved, {})

    def test_fallo_de_base_limpia_objeto_y_propaga_error(self):
        with patch("persistence.media_r2.write_data", side_effect=RuntimeError("bd")), \
                self.assertRaisesRegex(RuntimeError, "bd"):
            self.save()
        self.assertEqual(self.remote.deleted, list(self.remote.saved))
        self.assertEqual(len(self.remote.deleted), 1)

    def test_elimina_objeto_solo_despues_del_commit(self):
        item = self.save()
        with self.captureOnCommitCallbacks(execute=True):
            self.assertTrue(self.storage.delete(item["id"], deleted_by=str(self.user.pk)))
            self.assertEqual(self.remote.deleted, [])
        self.assertIsNone(self.storage.get(item["id"]))
        self.assertEqual(self.remote.deleted, [item["path"]])

    def test_fallo_remoto_no_interrumpe_eliminacion(self):
        self.remote.fail_delete = True
        item = self.save()
        with self.assertLogs("persistence.media_r2", level="ERROR") as logs, \
                self.captureOnCommitCallbacks(execute=True):
            self.assertTrue(self.storage.delete(item["id"]))
        self.assertIsNone(self.storage.get(item["id"]))
        self.assertIn(item["path"], logs.output[0])
        self.assertNotIn("secreto-de-prueba", logs.output[0])

    def test_registros_antiguos_solo_pierden_metadatos(self):
        for provider in (None, "cloudinary"):
            with self.subTest(provider=provider):
                item = self.save()
                item.pop("provider")
                if provider:
                    item["provider"] = provider
                write_data("admin.media." + item["id"], item, str(self.user.pk))
                with self.captureOnCommitCallbacks(execute=True):
                    self.assertTrue(self.storage.delete(item["id"]))
                self.assertIsNone(self.storage.get(item["id"]))
        self.assertEqual(self.remote.deleted, [])

    def test_respeta_nombre_devuelto_por_almacenamiento(self):
        with patch.object(self.remote, "save", return_value="uploads/renombrada.png"):
            item = self.save()
        self.assertEqual(item["path"], "uploads/renombrada.png")
        self.assertEqual(item["url"], "https://media.example.com/uploads/renombrada.png")

    def test_url_insegura_limpia_objeto(self):
        with override_settings(R2_PUBLIC_BASE_URL="http://media.example.com"), \
                self.assertRaisesRegex(RuntimeError, "R2 no devolvió una URL segura"):
            self.save()
        self.assertEqual(self.remote.deleted, list(self.remote.saved))


@override_settings(**R2_SETTINGS)
class R2ConfigurationTests(SimpleTestCase):
    def setUp(self):
        network = patch("socket.socket.connect", side_effect=AssertionError("Red prohibida en pruebas"))
        network.start()
        self.addCleanup(network.stop)

    def test_faltan_variables_sin_exponer_secretos(self):
        for name in R2_SETTINGS:
            with self.subTest(variable=name), override_settings(**{name: ""}):
                with self.assertRaises(ImproperlyConfigured) as caught:
                    ensure_configured()
                self.assertIn(name, str(caught.exception))
                self.assertNotIn("secreto-de-prueba", str(caught.exception))

    def test_rechaza_urls_publicas_no_seguras(self):
        for url in ("http://media.example.com", "https://x.r2.dev", "https://X.R2.DEV.",
                    "https://media.example.com?a=1", "https://user:pass@media.example.com",
                    "https://media.example.com#fragmento", "https://", "https://[invalido"):
            with self.subTest(url=url), override_settings(R2_PUBLIC_BASE_URL=url), \
                    self.assertRaises(ImproperlyConfigured):
                ensure_configured()

    @override_settings(MEDIA_STORAGE_BACKEND="r2")
    def test_selecciona_r2(self):
        self.assertIsInstance(build_media_storage(DjangoMediaStorage), R2MediaStorage)

    def test_opciones_s3_sin_red(self):
        storage = build_s3_storage()
        self.assertEqual(storage.endpoint_url, "https://cuenta-de-prueba.r2.cloudflarestorage.com")
        self.assertEqual(storage.region_name, "auto")
        self.assertIs(storage.querystring_auth, False)
        self.assertIsNone(storage.default_acl)
        self.assertIs(storage.file_overwrite, False)
        self.assertEqual(storage.signature_version, "s3v4")
        self.assertEqual(storage.bucket_name, R2_SETTINGS["R2_BUCKET"])
        self.assertEqual(storage.object_parameters, {"CacheControl": "public, max-age=31536000, immutable"})

    @override_settings(MEDIA_STORAGE_BACKEND="desconocido")
    def test_error_de_proveedor_menciona_r2(self):
        with self.assertRaisesRegex(ImproperlyConfigured, "local, cloudinary o r2"):
            build_media_storage(DjangoMediaStorage)
