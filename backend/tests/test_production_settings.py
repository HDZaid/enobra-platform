"""Configuración y middleware reales, sin conexiones ni cambios en Supabase."""
import importlib
import os
from pathlib import Path
import subprocess
import sys
from unittest.mock import patch

from django.core.exceptions import ImproperlyConfigured
from django.http import HttpResponse
from django.test import SimpleTestCase, Client, override_settings
from django.urls import path

from config.settings import require_production_secret


def health(request):
    return HttpResponse("ok")


urlpatterns = [path("health/", health)]


class ProductionSettingsTests(SimpleTestCase):
    def startup(self, *, secret):
        env = {**os.environ, "DJANGO_DEBUG": "false", "DJANGO_SECRET_KEY": secret,
            "DATABASE_URL": "sqlite:///:memory:", "DJANGO_ALLOWED_HOSTS": "api.example.com",
            "CORS_ALLOWED_ORIGINS": "https://www.example.com",
            "FRONTEND_BASE_URL": "https://www.example.com"}
        return subprocess.run([sys.executable, "manage.py", "check", "--deploy", "--settings=config.production"],
            cwd=Path(__file__).resolve().parents[1], env=env, capture_output=True, text=True, timeout=30)

    def test_startup_rejects_development_key_with_debug_false(self):
        result = self.startup(secret="dev-only-insecure-key")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Producción requiere DJANGO_SECRET_KEY", result.stderr)

    def test_deploy_check_only_keeps_intentional_hsts_warnings(self):
        result = self.startup(secret="test-production-distinct-characters-" * 3)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("security.W005", result.stderr)
        self.assertIn("security.W021", result.stderr)
        for warning in ("W002", "W003", "W004", "W008", "W009", "W018", "W020"):
            self.assertNotIn("security." + warning, result.stderr)

    def load_config(self, **overrides):
        env = {"DJANGO_ALLOWED_HOSTS": "api.example.com",
            "CORS_ALLOWED_ORIGINS": "https://www.example.com",
            "FRONTEND_BASE_URL": "https://www.example.com",
            "DJANGO_TRUST_PROXY_SSL_HEADER": "true", **overrides}
        sys.modules.pop("config.production", None)
        try:
            with patch.dict(os.environ, env), patch("config.settings.SECRET_KEY", "test-production-key-" * 5):
                return importlib.import_module("config.production")
        finally:
            sys.modules.pop("config.production", None)

    def test_unsafe_secret_rejected(self):
        for value in ("", "dev-only-insecure-key", "django-insecure-" + "a" * 70, "a" * 70, "short"):
            with self.subTest(value=value), self.assertRaises(ImproperlyConfigured):
                require_production_secret(value)
        require_production_secret("test-key-with-enough-distinct-characters-" * 3)

    def test_missing_or_wildcard_hosts_rejected(self):
        for value in ("", "*", "*.example.com", ".example.com", "https://api.example.com", "localhost", "127.0.0.1"):
            with self.subTest(value=value), self.assertRaises(ImproperlyConfigured):
                self.load_config(DJANGO_ALLOWED_HOSTS=value)

    def test_unsafe_origins_rejected(self):
        for value in ("", "http://www.example.com", "https://*.example.com", "https://www.example.com/path",
                      "https://user:password@www.example.com", "https://www.example.com:bad", "https://localhost"):
            with self.subTest(value=value), self.assertRaises(ImproperlyConfigured):
                self.load_config(CORS_ALLOWED_ORIGINS=value)
        with self.assertRaises(ImproperlyConfigured):
            self.load_config(FRONTEND_BASE_URL="https://other.example.com")

    def test_proxy_header_requires_explicit_trust(self):
        self.assertIsNone(self.load_config(DJANGO_TRUST_PROXY_SSL_HEADER="false").SECURE_PROXY_SSL_HEADER)
        self.assertEqual(self.load_config().SECURE_PROXY_SSL_HEADER, ("HTTP_X_FORWARDED_PROTO", "https"))

    def test_https_headers_hosts_and_cors(self):
        config = self.load_config()
        options = {key: getattr(config, key) for key in (
            "MIDDLEWARE", "ALLOWED_HOSTS", "CORS_ALLOWED_ORIGINS", "CORS_ALLOW_ALL_ORIGINS",
            "CORS_ALLOW_CREDENTIALS", "SECURE_SSL_REDIRECT", "SECURE_PROXY_SSL_HEADER",
            "SECURE_CONTENT_TYPE_NOSNIFF", "SECURE_REFERRER_POLICY", "SECURE_HSTS_SECONDS",
            "SECURE_HSTS_INCLUDE_SUBDOMAINS", "SECURE_HSTS_PRELOAD", "X_FRAME_OPTIONS")}
        with override_settings(**options, ROOT_URLCONF=__name__, DEBUG=False):
            client = Client()
            response = client.get('/health/', HTTP_HOST='api.example.com')
            self.assertEqual(response.status_code, 301)
            self.assertEqual(response['Location'], 'https://api.example.com/health/')
            response = client.get('/health/', HTTP_HOST='api.example.com', HTTP_X_FORWARDED_PROTO='https',
                HTTP_ORIGIN='https://www.example.com')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response['X-Frame-Options'], 'DENY')
            self.assertEqual(response['X-Content-Type-Options'], 'nosniff')
            self.assertEqual(response['Referrer-Policy'], 'same-origin')
            self.assertEqual(response['Strict-Transport-Security'], 'max-age=3600')
            self.assertEqual(response['Access-Control-Allow-Origin'], 'https://www.example.com')
            denied = client.get('/health/', HTTP_HOST='api.example.com', HTTP_X_FORWARDED_PROTO='https',
                HTTP_ORIGIN='https://other.example.com')
            self.assertNotIn('Access-Control-Allow-Origin', denied)
            preflight = client.options('/health/', HTTP_HOST='api.example.com', HTTP_X_FORWARDED_PROTO='https',
                HTTP_ORIGIN='https://www.example.com', HTTP_ACCESS_CONTROL_REQUEST_METHOD='POST',
                HTTP_ACCESS_CONTROL_REQUEST_HEADERS='authorization,content-type')
            self.assertEqual(preflight['Access-Control-Allow-Origin'], 'https://www.example.com')
            self.assertIn('authorization', preflight['Access-Control-Allow-Headers'])
            invalid = client.get('/health/', HTTP_HOST='attacker.example', HTTP_X_FORWARDED_PROTO='https')
            self.assertEqual(invalid.status_code, 400)
