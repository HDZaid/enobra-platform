"""Diagnóstico de lectura de R2, sin subir/borrar archivos ni revelar secretos."""
import os

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from django.core.exceptions import ImproperlyConfigured
from django.core.management.base import BaseCommand, CommandError

from config.media_storage import r2_options


class Command(BaseCommand):
    help = "Verifica acceso de lectura al bucket R2; funciona con R2_ENABLED=false."

    def handle(self, *args, **options):
        try:
            config = r2_options(os.environ, require_public_host=False)
        except ImproperlyConfigured as exc:
            raise CommandError(str(exc)) from None

        client = boto3.client(
            "s3", endpoint_url=config["endpoint_url"],
            aws_access_key_id=config["access_key"],
            aws_secret_access_key=config["secret_key"],
            region_name=config["region_name"],
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"},
                          connect_timeout=10, read_timeout=10, retries={"max_attempts": 1}),
        )
        try:
            client.list_objects_v2(Bucket=config["bucket_name"], MaxKeys=1)
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "desconocido")
            raise CommandError(
                f"R2 rechazó la lectura (código {code}). Revisa credenciales, bucket, permisos y filtro IP."
            ) from None
        except BotoCoreError:
            raise CommandError("No fue posible conectar con R2. Revisa endpoint, red y filtro IP.") from None
        finally:
            client.close()
        self.stdout.write(self.style.SUCCESS("Conexión R2 verificada: lectura del bucket autorizada."))
        self.stdout.write("Esta prueba no sube ni borra objetos y no valida escritura ni lectura pública de imágenes.")
