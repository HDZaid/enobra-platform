# Conexión de Django con Cloudflare R2

Fecha: 1 de noviembre de 2026, Guatemala. R2 elegido por Geovanny para imágenes.

## Estado

Bucket `enobra-media-prod` creado y credencial de objetos limitada al bucket.
Configuración local privada en `backend/.env.r2`, excluida por `.gitignore`.
Las claves reales no forman parte del repositorio ni del frontend.

Geovanny confirmó que el dominio todavía no está configurado. El bucket conserva
su acceso privado y `R2_ENABLED=false`; las subidas del panel siguen usando disco
local hasta activar el proveedor. Esto no acredita persistencia en producción.

## Variables

```dotenv
R2_ENABLED=false
R2_BUCKET_NAME=enobra-media-prod
R2_ENDPOINT_URL=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<secreto>
R2_SECRET_ACCESS_KEY=<secreto>
R2_PUBLIC_HOST=
```

Prioridad de carga: variables del sistema, `backend/.env.r2`, `backend/.env`.
En el hosting configurar los valores como variables privadas; el archivo local
no se publica. El endpoint S3 no incluye el nombre del bucket. R2_PUBLIC_HOST
contiene solo el hostname de lectura pública, sin esquema, puerto ni barra final.

## Verificar las credenciales antes de activar las imágenes

Desde backend con su entorno virtual:

```powershell
.\.venv\Scripts\python.exe manage.py check_r2
```

Hace una solicitud `ListObjectsV2` limitada a un objeto y no muestra nombres de
archivos ni secretos. No crea, sube, modifica o borra objetos; funciona con
`R2_ENABLED=false` y sin dominio público. Comprueba lectura autenticada, no
escritura, autorización de otros buckets ni acceso público por HTTPS.

## Activar cuando esté configurado el dominio

1. Conectar el subdominio elegido al bucket desde R2 > Settings > Custom Domains.
   Los objetos de ese bucket serán accesibles por su URL; destinarlo a imágenes
   públicas. El dominio debe existir en la misma cuenta de Cloudflare.
2. Configurar `R2_PUBLIC_HOST` y luego `R2_ENABLED=true` en el entorno que se probará.
   Django rechaza la activación si faltan credenciales o hostname público.
3. Reiniciar Django y probar `POST /api/v1/admin/media/` desde el panel con un
   usuario que tenga `media.upload`. Conservar permisos y validación de 10 MB.
4. Comprobar la imagen en el catálogo y tras otro despliegue. Verificar también
   el borrado autorizado y la conservación de objetos compartidos.
5. Si existen imágenes locales, copiar primero los archivos manteniendo sus claves
   `uploads/...` y actualizar las URLs guardadas en metadatos y publicaciones.
   Conservar la copia local hasta verificar todas las referencias. Un cambio de
   backend no migra archivos ni reescribe las URLs anteriores automáticamente.

`default_storage` usa django-storages/S3 en R2. Guarda URLs públicas HTTPS estables,
sin firmas que caduquen, y nombres UUID sin sobreescritura. El endpoint y la respuesta
del frontend no cambian. No hacen falta subidas directas del navegador ni una
política CORS de R2 para este flujo; el CORS de Django sigue siendo necesario.

## Restricciones por IP

El filtro del token controla desde dónde se usan las credenciales S3. Para Render,
obtener todos los rangos de salida en servicio > Connect > Outbound antes de
restringirlo. Las pruebas locales requieren una credencial o acceso de desarrollo
adecuado. Este filtro no controla la lectura pública de imágenes por su dominio.

## Verificación y pendientes

- `manage.py check`: sin incidencias.
- `manage.py test tests --settings=config.test_settings`: 222 pruebas aprobadas,
  incluidas 7 de configuración y diagnóstico R2 con credenciales ficticias.
- `manage.py check_r2`: lectura autenticada del bucket real autorizada. Sin
  subidas, borrados ni cambios en Supabase.
- Archivo privado ignorado por Git y credenciales ausentes de archivos versionables.

Siguen pendientes dominio, activación del proveedor, migración si hay archivos
previos y pruebas de subida/borrado/persistencia en el entorno desplegado.
Cloudflare Pages y el servicio web Django se configuran por separado.

Referencias: [R2 y django-storages](https://django-storages.readthedocs.io/en/latest/backends/s3_compatible/cloudflare-r2.html),
[dominios públicos de R2](https://developers.cloudflare.com/r2/buckets/public-buckets/),
[salida de Render](https://render.com/docs/outbound-ip-addresses).
