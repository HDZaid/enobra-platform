# Backend en Render: arranque preparado

3 de noviembre de 2026, Guatemala. Esta preparación no crea servicios ni acredita
un despliegue. Los cambios se trabajan en backend-dev y se integran en develop.

## Configuración versionada

- `render.yaml`: un único Web Service Python gratuito para validación, rama
  `develop`, directorio `backend`, despliegues manuales y health check
  `/api/v1/health/`. No crea bases de datos ni tareas programadas.
- `backend/.python-version` y `PYTHON_VERSION`: Python 3.12.16.
- `backend/requirements.in`: dependencias directas; `requirements.txt`: versiones
  exactas y hashes de dependencias directas y transitivas, compatibles con Python
  3.12 en Linux y Windows. Gunicorn solo se instala fuera de Windows.
- `backend/gunicorn.conf.py`: escucha en `0.0.0.0:$PORT`, fuerza
  `config.production` y usa un proceso con cuatro hilos. Antes de escalar a varios
  procesos/instancias, sustituir la caché local de throttling por una compartida.
  Los logs de acceso no incluyen query strings, cabeceras ni cuerpos.
- Producción rechaza una clave débil, una conexión distinta de PostgreSQL y
  hosts/orígenes sin configurar. Los chequeos no abren conexiones a Supabase.

El frontend React se despliega por separado. La API devuelve JSON y Swagger usa
recursos de CDN; este paso no añade WhiteNoise ni `collectstatic`. Las imágenes
subidas requieren R2 antes de permitir su uso real.

## Valores que deben completarse en Render

Crear/importar el servicio desde `develop` y completar los campos `sync: false`:

| Variable | Valor requerido |
| --- | --- |
| `DJANGO_SECRET_KEY` | Clave propia, aleatoria y persistente de al menos 50 caracteres. Generar una vez con `python -c "import secrets; print(secrets.token_urlsafe(64))"` y guardarla directamente en Render. |
| `DATABASE_URL` | URL privada PostgreSQL de Supabase. Verificar conectividad desde Render, TLS y modo del pooler elegido. |
| `DJANGO_ALLOWED_HOSTS` | Host real de la API, sin esquema, puerto ni ruta. Incluir el hostname `onrender.com` y el dominio propio si se usa. |
| `CORS_ALLOWED_ORIGINS` | Orígenes HTTPS exactos del frontend, separados por comas y sin barra final. |
| `FRONTEND_BASE_URL` | Origen HTTPS del frontend; debe estar entre los orígenes CORS. |
| `DJANGO_TRUST_PROXY_SSL_HEADER` | `true` únicamente después de confirmar que el proxy elimina/sobrescribe `X-Forwarded-Proto` del cliente y envía el protocolo original. |

No utilizar `generateValue: true` para la clave en este proyecto: Render genera
44 caracteres, menos de los 50 exigidos. No generarla en cada arranque, porque
invalidaría JWT existentes. Las plantillas `.example` no se cargan automáticamente;
no copiar `.env` de desarrollo al servicio.

## Proxy HTTPS y primer despliegue

Render termina TLS antes de enviar la petición a Gunicorn. La aplicación necesita
reconocer el protocolo original, manteniendo HTTPS obligatorio:

1. Confirmar las garantías del proxy de Render sobre `X-Forwarded-Proto`; si no
   están claras, verificarlas con el proveedor antes de habilitar la confianza.
2. Una vez confirmadas, poner `DJANGO_TRUST_PROXY_SSL_HEADER=true`.
   Gunicorn deja la interpretación del esquema a Django; no confía por su cuenta
   en `X-Forwarded-Ssl` ni en otras cabeceras alternativas.
3. Ejecutar el build y arranque definidos por el Blueprint:

   ```sh
   pip install --require-hashes -r requirements.txt
   python manage.py check --deploy --settings=config.production
   gunicorn --config gunicorn.conf.py config.wsgi:application
   ```

4. Comprobar HTTP → HTTPS y que HTTPS devuelve 200 sin repetir redirecciones.
   No resolver un bucle desactivando `SECURE_SSL_REDIRECT`.
5. Verificar cabeceras, CORS permitido/ajeno, login y permisos con las URL reales.
   Registrar URL, revisión y resultados antes de dar el despliegue por validado.

`check --deploy` conserva W005/W021 sobre HSTS, ya justificados en BE-14. El
health check actual comprueba el proceso HTTP, no la conexión a Supabase; validar
la base por separado. No ejecutar `makemigrations`, `migrate` ni seeds para recrear
tablas o modificar permisos existentes. No crear otra base de datos en Render.

## Reproducir las comprobaciones

En Linux, con Python 3.12.16 y desde backend:

```sh
python -m pip install --require-hashes -r requirements.txt
python -m pip check
python manage.py check
python manage.py test tests --settings=config.test_settings
python scripts/verify_production_startup.py
```

La última prueba arranca Gunicorn dos veces con código temporal sin `.env`, una
clave efímera y PostgreSQL ficticio en un puerto local cerrado. Verifica HTTPS,
proxy, CORS, cabeceras, host ajeno y 401 sin tocar bases u objetos reales. Cierra
sus procesos al terminar. En Windows, `runserver` conserva el flujo habitual;
la prueba de Gunicorn se ejecuta en Linux, WSL, Docker o GitHub Actions.

`.github/workflows/backend-production.yml` repite instalación con hashes, pruebas
aisladas y arranque HTTP en Linux. No usa secretos ni despliega.

Verificación del 3-nov para `bb01cfc`: [GitHub Actions aprobado](https://github.com/HDZaid/enobra-platform/actions/runs/41764835389)
en Linux con Python 3.12.16, instalación con hashes, dependencias compatibles,
223 pruebas y ambos arranques HTTP con Gunicorn correctos. En Windows también
pasaron las 223 pruebas y el esquema OpenAPI siguió equivalente al versionado.
`render.yaml` validado con el esquema oficial de Render. Estas pruebas simulan
el proxy y no acreditan las garantías del proxy real ni un despliegue.

Para actualizar dependencias, con uv 0.13.7 desde la raíz del repositorio:

```sh
uv pip compile backend/requirements.in --python-version 3.12.16 --universal --generate-hashes --output-file backend/requirements.txt --no-emit-index-url
```

Editar `requirements.in`, regenerar el archivo y revisar diferencias. Añadir
`--upgrade` solo para una actualización deliberada. Repetir comprobaciones y
revisar OpenAPI si cambian Django/DRF/drf-spectacular.

## Límites y siguientes pasos

- El Blueprint gratuito es para validación: se suspende por inactividad y no
  conserva archivos locales. Elegir un plan adecuado antes del uso continuo.
- R2 permanece desactivado. Configurar dominio y variables R2 antes de permitir
  subidas persistentes; migración y pruebas de imágenes son otro paso.
  El perfil de producción devuelve 503 en la subida mientras el proveedor sea
  local, para evitar guardar archivos en el disco efímero del servicio.
- El correo sigue sin configurar. Render gratuito bloquea SMTP 25/465/587;
  valorar un adaptador HTTPS. No usar consola con consultas reales.
- Servicios y búsqueda siguen pendientes. Este cambio no los implementa.
- P-02 sigue en GitHub Actions. No importar `render-cleanup.yaml` ni crear un Cron
  Job duplicado. El workflow de limpieza y su SHA probado no se modifican.

Referencias: [servicios web](https://render.com/docs/web-services),
[Blueprint](https://render.com/docs/blueprint-spec),
[Python](https://render.com/docs/python-version),
[plan gratuito](https://render.com/docs/free),
[proxy de Django](https://docs.djangoproject.com/en/5.2/ref/settings/#secure-proxy-ssl-header),
[Gunicorn](https://gunicorn.org/reference/settings/),
[resolución de dependencias](https://docs.astral.sh/uv/pip/compile/).
