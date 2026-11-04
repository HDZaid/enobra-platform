"""Prueba Gunicorn/HTTP en Linux con código copiado sin .env ni datos reales."""
import http.client
import json
import os
from pathlib import Path
import secrets
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from contextlib import contextmanager


ROOT = Path(__file__).resolve().parents[1]
HOST = "api.example.test"
ORIGIN = "https://www.example.test"


def request(port, *, path="/api/v1/health/", method="GET", **headers):
    connection = http.client.HTTPConnection("127.0.0.1", port, timeout=2)
    try:
        connection.request(method, path, headers={"Host": HOST, **headers})
        response = connection.getresponse()
        return response.status, dict((key.lower(), value) for key, value in response.getheaders()), response.read()
    finally:
        connection.close()


@contextmanager
def server(directory, *, trust_proxy):
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    env = {**os.environ,
        "PORT": str(port), "DJANGO_SETTINGS_MODULE": "config.settings",
        # Intencional: el comando Gunicorn debe forzar config.production.
        "DJANGO_DEBUG": "true", "DJANGO_SECRET_KEY": secrets.token_urlsafe(64),
        "DATABASE_URL": "postgresql://fake:fake@127.0.0.1:1/unused?connect_timeout=1",
        "DJANGO_ALLOWED_HOSTS": HOST, "CORS_ALLOWED_ORIGINS": ORIGIN,
        "FRONTEND_BASE_URL": ORIGIN, "DJANGO_TRUST_PROXY_SSL_HEADER": str(trust_proxy).lower(),
        "R2_ENABLED": "false", "INQUIRY_NOTIFY_EMAILS": "",
        "EMAIL_BACKEND": "django.core.mail.backends.locmem.EmailBackend",
        "PYTHONDONTWRITEBYTECODE": "1"}
    # No permitir que opciones externas cambien la configuración de la prueba.
    env.pop("GUNICORN_CMD_ARGS", None)
    env.pop("PYTHONPATH", None)
    with tempfile.TemporaryFile(mode="w+") as log:
        process = subprocess.Popen([sys.executable, "-m", "gunicorn", "--config", "gunicorn.conf.py",
                                    "config.wsgi:application"], cwd=directory, env=env,
                                   stdout=log, stderr=log)
        try:
            deadline = time.monotonic() + 20
            while time.monotonic() < deadline:
                if process.poll() is not None:
                    raise RuntimeError("Gunicorn terminó durante el arranque.")
                try:
                    status, _, _ = request(port)
                    if status == 301:
                        break
                except (OSError, http.client.HTTPException):
                    pass
                time.sleep(0.1)
            else:
                raise RuntimeError("Gunicorn no respondió dentro del plazo.")
            yield port
        except Exception:
            log.seek(0)
            print(log.read(), file=sys.stderr)
            raise
        finally:
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=5)


def verify():
    if sys.platform == "win32":
        raise SystemExit("Gunicorn requiere Linux: ejecutar esta verificación en Docker, WSL o CI.")
    with tempfile.TemporaryDirectory(prefix="enobra-production-") as temporary:
        directory = Path(temporary) / "backend"
        patterns = shutil.ignore_patterns(
            ".venv", "venv", "__pycache__", ".env", ".env.*", "*.sqlite3", "*.log")

        def ignore(path, names):
            excluded = set(patterns(path, names))
            if Path(path) == ROOT:
                excluded.update(set(names) & {"media", "staticfiles"})
            return excluded

        shutil.copytree(ROOT, directory, ignore=ignore)
        with server(directory, trust_proxy=True) as port:
            status, headers, _ = request(port)
            assert status == 301 and headers["location"] == f"https://{HOST}/api/v1/health/"
            status, headers, body = request(port, **{"X-Forwarded-Proto": "https", "Origin": ORIGIN})
            assert status == 200 and json.loads(body)["status"] == "ok", (status, body)
            assert headers["access-control-allow-origin"] == ORIGIN
            assert headers["x-frame-options"] == "DENY"
            assert headers["x-content-type-options"] == "nosniff"
            assert headers["strict-transport-security"] == "max-age=3600"
            status, headers, _ = request(port, method="OPTIONS", **{
                "X-Forwarded-Proto": "https", "Origin": ORIGIN,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization,content-type"})
            assert status == 200 and headers["access-control-allow-origin"] == ORIGIN
            assert "authorization" in headers["access-control-allow-headers"]
            status, headers, _ = request(port, **{
                "X-Forwarded-Proto": "https", "Origin": "https://untrusted.example"})
            assert status == 200 and "access-control-allow-origin" not in headers
            status, _, body = request(port, **{"X-Forwarded-Proto": "https", "Host": "untrusted.example"})
            assert status == 400 and b"Traceback" not in body
            status, _, _ = request(port, path="/api/v1/auth/me/", **{"X-Forwarded-Proto": "https"})
            assert status == 401
            print("OK: Gunicorn, perfil de producción, HTTPS sin bucle, CORS, cabeceras, hosts y 401.")
        with server(directory, trust_proxy=False) as port:
            status, headers, _ = request(port, **{"X-Forwarded-Proto": "https", "X-Forwarded-Ssl": "on"})
            assert status == 301 and headers["location"].startswith("https://")
            print("OK: sin confianza explícita, las cabeceras del cliente no cambian el esquema.")
    print("Sin conexiones a Supabase/R2, correos, migraciones ni datos reales.")


if __name__ == "__main__":
    verify()
