"""Base aislada: jamás utiliza DATABASE_URL ni crea tablas en Supabase."""
from .settings import *  # noqa: F403

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
SECRET_KEY = "test-only-key-with-at-least-thirty-two-characters"
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
TEST_RUNNER = "tests.runner.ExistingTablesTestRunner"
ALLOWED_HOSTS = ["testserver", "localhost"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
INQUIRY_NOTIFY_EMAILS = []
