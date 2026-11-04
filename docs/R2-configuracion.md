# Cloudflare R2 privado y entrega de imágenes

<!-- enobra-documentacion-vigente -->
> Guía vigente. Revisión documental: 3-nov-2026.
> [Base y límites técnicos](BASE-DOCUMENTACION-TECNICA.md). Las evidencias no se reinterpretan como nuevas ejecuciones.
<!-- /enobra-documentacion-vigente -->
Estado: R2 privado activo en Render. Decisión del 3-nov-2026: los objetos no se
publican mediante dominio del bucket ni r2.dev; las fotos públicas del catálogo se
entregan por Django. [Evidencia real](Render-validacion-2026-11-03.md).

## Configuración

En Render, guardar credenciales como secretos y estos valores no sensibles:

```dotenv
R2_ENABLED=true
R2_ACCESS_MODE=private
MEDIA_API_ORIGIN=https://enobra-api.onrender.com
R2_PUBLIC_HOST=
```

También son necesarios R2_BUCKET_NAME, R2_ENDPOINT_URL, R2_ACCESS_KEY_ID y
R2_SECRET_ACCESS_KEY. El endpoint S3 es HTTPS de la cuenta, sin bucket ni rutas.
No escribir sus valores privados en este documento. Bucket operativo:
`enobra-media-prod`. MEDIA_API_ORIGIN debe ser un origen HTTPS incluido en hosts.

R2_PUBLIC_HOST se usa solo en el modo público alternativo soportado por código;
no es requisito del modo privado activo. No conectar media.enobra.com.gt ni
activar r2.dev como parte de esta configuración. En desarrollo, R2_ENABLED=false
conserva almacenamiento local. Prioridad: entorno del proceso, .env.r2 y .env.

## Flujo y autorización

1. El panel envía POST admin/media/ con archivo y kind; necesita media.upload.
2. Django valida contenido real JPEG/PNG/WebP/GIF y límite de 10 MiB, guarda en R2
   con nombre UUID y metadatos en contenido_pagina.
3. La base conserva `/media/r2/<id>/`, proveedor r2-private y clave del objeto.
4. Las fotos vinculadas a publicaciones públicas y el logo pueden leerse por API.
   Borradores/papelera no habilitan lectura anónima.
5. La API permite lectura privada con sesión autorizada o capacidad de vista
   previa firmada para una imagen, válida quince minutos. No devuelve claves ni
   URLs S3 firmadas al navegador. Al guardar retira el token de la referencia.

Lecturas privadas: private, no-store; públicas: caché de cinco minutos. No se
requiere CORS del bucket en este flujo; sí los orígenes CORS explícitos de Django.
La firma emitida puede valer hasta vencer o borrar el medio aunque se cierre sesión.
No incluir URLs de vista previa con tokens en capturas, docs o logs.

## Borrado y persistencia

Se rechaza con 400 borrar una imagen referenciada por proyectos, propiedades,
noticias o contenido institucional, incluidos borradores y papelera. Guardar una
referencia y borrar el medio bloquean su fila para evitar referencias a un upload
eliminado. Esta protección no implica limpieza de archivos huérfanos automática.
Producción devuelve 503 al intentar subir usando disco local efímero.

Inventario del despliegue: cinco registros, un original disponible. Se copió ese
original conservando clave/ID; el hash coincidió y la API lo recuperó tras otro
despliegue. Los cuatro originales de otras PC siguen aplazados. No se borraron
sus registros ni se recreó la base. Falta probar la subida/publicación completa
desde el panel desplegado con un usuario real.

## Diagnóstico y fuentes

Desde backend: `python manage.py check_r2` verifica lectura autenticada, sin subir
ni borrar; funciona antes de activar R2. El nombre del archivo local o las claves
no se imprimen. No equivale a probar escritura, API o persistencia desplegada.

Código: config/media_storage.py, apps/media/references.py y views.py,
persistence/media.py, private_media.py y media_references.py.
Pruebas: test_r2_storage.py, test_private_media.py y protección de medios en uso.
La suite completa vigente tiene 238 pruebas; ver [estado](estado-proyecto.md).
