"""Arranque WSGI de producción desde backend/ (Render/Linux)."""
import os

bind = f"0.0.0.0:{int(os.environ.get('PORT', '10000'))}"
raw_env = ["DJANGO_SETTINGS_MODULE=config.production"]

# Un proceso mantiene compartida la caché local de throttling entre los hilos.
# Antes de escalar a varios procesos/instancias, configurar una caché compartida.
workers = 1
worker_class = "gthread"
threads = 4
timeout = 60
graceful_timeout = 30
errorlog = "-"
accesslog = "-"
# Omitir query strings, cabeceras y cuerpos de las peticiones en el log de acceso.
access_log_format = "%(h)s %(m)s %(U)s %(s)s %(L)s"

# Django decide si confía en X-Forwarded-Proto mediante su variable explícita.
# Evita que Gunicorn confíe por su cuenta en otras cabeceras de esquema.
secure_scheme_headers = {}
