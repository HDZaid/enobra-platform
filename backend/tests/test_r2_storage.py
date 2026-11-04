"""R2 con credenciales ficticias: ninguna prueba accede al bucket real."""
import io
import os
from unittest.mock import patch

from botocore.exceptions import ClientError, EndpointConnectionError
from django.core.exceptions import ImproperlyConfigured
from django.core.files.storage import StorageHandler
from django.core.management import call_command, CommandError
from django.test import SimpleTestCase

from config.media_storage import media_storage_settings, r2_options


R2_ENV = {
    "R2_ENABLED": "true", "R2_BUCKET_NAME": "test-media",
    "R2_ENDPOINT_URL": "https://" + "a" * 32 + ".r2.cloudflarestorage.com",
    "R2_ACCESS_KEY_ID": "fake-access-key", "R2_SECRET_ACCESS_KEY": "fake-secret-key",
    "R2_PUBLIC_HOST": "media.example.com",
}


class R2StorageTests(SimpleTestCase):
    def test_private_mode_uses_authenticated_s3_without_public_hostname(self):
        config = media_storage_settings({**R2_ENV, "R2_ACCESS_MODE": "private", "R2_PUBLIC_HOST": ""})
        options = config["default"]["OPTIONS"]
        self.assertIsNone(options["custom_domain"])
        self.assertTrue(options["querystring_auth"])
        self.assertFalse(options["file_overwrite"])
        with self.assertRaises(ImproperlyConfigured):
            media_storage_settings({"R2_ACCESS_MODE": "invalid"})

    def test_local_storage_remains_default_without_credentials(self):
        self.assertEqual(media_storage_settings({})["default"]["BACKEND"],
                         "django.core.files.storage.FileSystemStorage")
        self.assertEqual(media_storage_settings({"R2_ENABLED": "false"}), media_storage_settings({}))
        with self.assertRaises(ImproperlyConfigured):
            media_storage_settings({"R2_ENABLED": "yes"})

    def test_missing_credentials_fail_without_exposing_other_values(self):
        for name in ("R2_BUCKET_NAME", "R2_ENDPOINT_URL", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"):
            with self.subTest(name=name), self.assertRaises(ImproperlyConfigured) as error:
                media_storage_settings({**R2_ENV, name: ""})
            self.assertIn(name, str(error.exception))
            self.assertNotIn(R2_ENV["R2_SECRET_ACCESS_KEY"], str(error.exception))

    def test_s3_endpoint_rejects_http_bucket_paths_and_other_hosts(self):
        for endpoint in (R2_ENV["R2_ENDPOINT_URL"].replace("https:", "http:"),
                         R2_ENV["R2_ENDPOINT_URL"] + "/test-media", "https://example.com"):
            with self.subTest(endpoint=endpoint), self.assertRaises(ImproperlyConfigured):
                r2_options({**R2_ENV, "R2_ENDPOINT_URL": endpoint})
        for jurisdiction in ("eu", "us", "fedramp"):
            r2_options({**R2_ENV, "R2_ENDPOINT_URL": "https://" + "b" * 32
                        + f".{jurisdiction}.r2.cloudflarestorage.com"})

    def test_activation_requires_public_hostname_for_persisted_urls(self):
        for host in ("", "https://media.example.com", "media.example.com/", "media.example.com:443",
                     "user@media.example.com", "*.example.com", "localhost", "127.0.0.1", "[invalid"):
            with self.subTest(host=host), self.assertRaises(ImproperlyConfigured):
                media_storage_settings({**R2_ENV, "R2_PUBLIC_HOST": host})

    def test_urls_are_permanent_https_and_do_not_contain_credentials(self):
        storage = StorageHandler(media_storage_settings(R2_ENV))["default"]
        self.assertEqual(storage.url("uploads/photo.png"), "https://media.example.com/uploads/photo.png")
        self.assertFalse(storage.file_overwrite)
        self.assertIsNone(storage.default_acl)

    def test_diagnostic_reads_only_and_works_before_public_domain_exists(self):
        output = io.StringIO()
        with patch.dict(os.environ, {**R2_ENV, "R2_ENABLED": "false", "R2_PUBLIC_HOST": ""}, clear=True), \
                patch("persistence.management.commands.check_r2.boto3.client") as factory:
            call_command("check_r2", stdout=output)
        client = factory.return_value
        client.list_objects_v2.assert_called_once_with(Bucket="test-media", MaxKeys=1)
        self.assertEqual([call[0] for call in client.method_calls], ["list_objects_v2", "close"])
        self.assertIn("lectura del bucket autorizada", output.getvalue())
        self.assertNotIn(R2_ENV["R2_SECRET_ACCESS_KEY"], output.getvalue())

    def test_diagnostic_sanitizes_remote_errors(self):
        failures = (
            ClientError({"Error": {"Code": "AccessDenied", "Message": "fake-secret-key"}}, "ListObjectsV2"),
            EndpointConnectionError(endpoint_url="https://fake-secret-key.example.com"),
        )
        for failure in failures:
            with self.subTest(failure=type(failure).__name__), \
                    patch.dict(os.environ, R2_ENV, clear=True), \
                    patch("persistence.management.commands.check_r2.boto3.client") as factory:
                factory.return_value.list_objects_v2.side_effect = failure
                with self.assertRaises(CommandError) as error:
                    call_command("check_r2")
                self.assertNotIn("fake-secret-key", str(error.exception))
                factory.return_value.close.assert_called_once()
