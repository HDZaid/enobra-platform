"""Run React against real Django HTTP/ORM using a disposable local database.

Never connects to DATABASE_URL, migrates Supabase, or uses production credentials.
Requires npm dependencies, Chromium and Playwright (see frontend/README.md, browser tests).
"""
import io
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
from wsgiref.simple_server import make_server, WSGIRequestHandler

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend'))


class QuietHandler(WSGIRequestHandler):
    def log_message(self, format, *args):
        pass


def run():
    with tempfile.TemporaryDirectory(prefix='enobra-integration-') as directory:
        temporary = Path(directory)
        # Select test settings before Django loads backend/.env; override all persistence.
        os.environ['DJANGO_SETTINGS_MODULE'] = 'config.test_settings'
        from django.conf import settings
        settings.DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3',
                                         'NAME': str(temporary / 'integration.sqlite3')}}
        settings.MEDIA_ROOT = str(temporary / 'media')
        settings.DEBUG = True
        settings.ALLOWED_HOSTS = ['localhost', '127.0.0.1']
        settings.SECRET_KEY = secrets.token_urlsafe(48)
        settings.PASSWORD_HASHERS = ['django.contrib.auth.hashers.PBKDF2PasswordHasher']
        import django
        django.setup()
        from django.apps import apps
        from django.contrib.auth.hashers import make_password
        from django.core.management import call_command
        from django.db import connection, connections
        from django.utils import timezone
        from django.core.files.uploadedfile import SimpleUploadedFile
        from persistence.models import Usuario, Rol, UsuarioRol
        from persistence.company import DjangoCompanyRepository, DjangoInstitutionRepository
        from persistence.catalog import DjangoNewsRepository, DjangoProjectRepository, DjangoPropertyRepository
        from persistence.media import DjangoMediaStorage
        from PIL import Image

        with connection.schema_editor() as editor:
            for model in apps.get_app_config('persistence').get_models():
                editor.create_model(model)
        call_command('seed_access_control', stdout=io.StringIO())
        password = secrets.token_urlsafe(24)
        for email, role in [('integration@example.test', 'Ingeniero'),
                            ('architect@example.test', 'Arquitecta')]:
            user = Usuario.objects.create(nombre='Cuenta de integración', correo=email,
                                           password_hash=make_password(password))
            UsuarioRol.objects.create(usuario=user, rol=Rol.objects.get(nombre=role))
        user = Usuario.objects.get(correo='integration@example.test')
        DjangoCompanyRepository().update({
            'name': 'EnObra', 'person': 'Responsable de integración',
            'address': 'Dirección de prueba', 'phones': ['55551234'],
            'whatsapp': '50255551234', 'email': 'contacto@example.test',
            'instagram': '', 'facebook': '', 'domain': '', 'logo': '',
        }, updated_by=user.pk)
        DjangoInstitutionRepository().update({
            'presentation': ['Presentación institucional desde Django.'],
            'signature': 'Equipo de prueba', 'role': 'Responsable',
            'vision': 'Visión de integración.', 'mission': 'Misión de integración.',
            'principles': [{'title': 'Calidad', 'description': 'Descripción de prueba.'}],
        }, updated_by=user.pk)
        image = io.BytesIO()
        Image.new('RGB', (32, 32), '#ff6a1f').save(image, format='PNG')
        image_file = temporary / 'fixture.png'
        image_file.write_bytes(image.getvalue())
        media = DjangoMediaStorage().save(
            SimpleUploadedFile('fixture.png', image.getvalue(), content_type='image/png'),
            filename='fixture.png', content_type='image/png', size=len(image.getvalue()),
            kind='news', uploaded_by=user.pk,
        )
        news = DjangoNewsRepository()
        for title, published in [('Noticia pública de integración', True), ('Borrador privado', False)]:
            news.create({'title': title, 'description': 'Contenido servido por Django.',
                         'category': 'Anuncios', 'date': timezone.localdate(),
                         'image': media['url'], 'demo': True, 'published': published}, created_by=user.pk)
        project = DjangoProjectRepository().create({
            'title': 'Proyecto de integración', 'category': 'Vivienda', 'country': 'Guatemala',
            'year': 2026, 'description': 'Catálogo de prueba; no representa contenido final.',
            'images': [media['url']], 'renders': [], 'video': '', 'demo': True, 'published': True,
        }, created_by=user.pk)
        prop = DjangoPropertyRepository().create({
            'title': 'Propiedad de integración', 'description': 'Propiedad de prueba.',
            'operation': 'Venta', 'type': 'Casa', 'zone': 'Zona 9', 'location': 'Quetzaltenango',
            'price': 500000, 'rooms': 3, 'baths': 2, 'parking': 1, 'area': 150,
            'date': timezone.localdate(), 'commercial': 'Condiciones de prueba.',
            'images': [media['url']], 'renders': [], 'video': '', 'demo': True, 'published': True,
        }, created_by=user.pk)
        from django.core.wsgi import get_wsgi_application
        server = make_server('127.0.0.1', 0, get_wsgi_application(), handler_class=QuietHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        # Pick an available development port; Vite's strictPort detects a race.
        with socket.socket() as listener:
            listener.bind(('127.0.0.1', 0))
            frontend_port = listener.getsockname()[1]
        base_url = f'http://127.0.0.1:{frontend_port}'
        environment = dict(os.environ,
            VITE_API_PROXY_TARGET=f'http://127.0.0.1:{server.server_port}',
            VITE_API_BASE_URL='/api/v1', VITE_NEWS_PREVIEW='false',
            INTEGRATION_BASE_URL=base_url, INTEGRATION_EMAIL=user.correo,
            INTEGRATION_PASSWORD=password, INTEGRATION_IMAGE=str(image_file),
            INTEGRATION_PROJECT=project['id'], INTEGRATION_PROPERTY=str(prop['id']))
        vite = None
        try:
            with (temporary / 'vite.log').open('w+') as output:
                vite = subprocess.Popen(['npm', '--prefix', str(ROOT / 'frontend'), 'run', 'dev', '--',
                    '--host', '127.0.0.1', '--port', str(frontend_port), '--strictPort'],
                    cwd=ROOT, env=environment, stdout=output, stderr=subprocess.STDOUT,
                    start_new_session=True)
                for _ in range(100):
                    if vite.poll() is not None:
                        raise RuntimeError('Vite stopped before readiness')
                    try:
                        with urllib.request.urlopen(base_url + '/api/v1/health/', timeout=2) as response:
                            if response.status == 200:
                                break
                    except (OSError, TimeoutError):
                        time.sleep(0.1)
                else:
                    raise RuntimeError('Timed out waiting for React/Django proxy')
                return subprocess.run(['node', str(ROOT / 'frontend/tests/browser/live-backend.cjs')],
                                      cwd=ROOT, env=environment).returncode
        finally:
            if vite is not None and vite.poll() is None:
                import signal
                os.killpg(vite.pid, signal.SIGTERM)
                vite.wait(timeout=10)
            server.shutdown()
            server.server_close()
            thread.join(timeout=10)
            connections.close_all()


if __name__ == '__main__':
    sys.exit(run())
