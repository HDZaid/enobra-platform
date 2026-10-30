# BE-14: configuración preparada; despliegue pendiente

Fecha: 29 de octubre de 2026, Guatemala. Solicitado por Geovanny. El frontend sigue
en mejoras y no hay URL pública de frontend/API facilitada para validar. No se ha
desplegado ni modificado el entorno real, sus claves o Supabase.

## Cambios de código

- `config.settings` rechaza claves cortas, de desarrollo o manifiestamente débiles
  cuando `DJANGO_DEBUG=false`. El desarrollo local conserva su configuración.
- `config.production` es el perfil HTTP que debe usarse en el hosting. Fija
  DEBUG=false incluso si se configura true por error, exige clave propia y dominios
  explícitos, y rechaza hosts vacíos, localhost, URLs y comodines.
- CORS admite solo los orígenes HTTPS declarados; FRONTEND_BASE_URL debe ser uno
  de ellos. No se admiten credenciales en URLs, rutas, comodines ni cookies CORS.
  La autenticación de esta API es Bearer; CORS no sustituye autorización.
- Redirección a HTTPS, HSTS inicial de una hora, X-Content-Type-Options=nosniff,
  X-Frame-Options=DENY, Referrer-Policy=same-origin y cookies seguras si se utilizan.
  Se incorporan middleware de CSRF y clickjacking; DRF conserva su mecanismo Bearer.
- `DJANGO_TRUST_PROXY_SSL_HEADER=true` habilita reconocimiento de
  X-Forwarded-Proto=https. Usarlo solo si se confirma que el proxy de confianza
  elimina/sobrescribe el valor enviado por el cliente; de lo contrario, dejar false.
  No se activa por detectar el nombre de un proveedor.

No se añadieron servicios, dominios ni infraestructura. El perfil de desarrollo y
la limpieza programada actual conservan su uso; el workflow sigue ejecutando su
revisión probada y no se ha actualizado para apuntar a estos cambios.

## Activar cuando esté listo el despliegue

Plantilla sin secretos: [backend/.env.production.example](../backend/.env.production.example).
Los dominios example.com son ejemplos y deben sustituirse. En el hosting configurar:

```text
DJANGO_SETTINGS_MODULE=config.production
DJANGO_DEBUG=false
DJANGO_SECRET_KEY=<clave aleatoria propia, al menos 50 caracteres>
DJANGO_ALLOWED_HOSTS=<dominio de la API, sin https:// ni ruta>
CORS_ALLOWED_ORIGINS=https://<dominio del frontend>
FRONTEND_BASE_URL=https://<dominio del frontend>
DATABASE_URL=<conexión de Supabase guardada como secreto>
DJANGO_TRUST_PROXY_SSL_HEADER=<true solo tras verificar el proxy>
```

Generar la clave una sola vez y guardarla en el proveedor; no publicarla ni cambiarla
en cada arranque, porque se usa para firmar JWT. Utilizar un servidor WSGI/ASGI de
producción compatible (por ejemplo Gunicorn), no runserver. Esta tarea no instala
un servidor ni crea el servicio web; se elige/configura al desplegar.

Ejecutar desde backend con esas variables y sin migraciones:

```bash
python manage.py check --deploy --settings=config.production
```

El chequeo conserva intencionalmente W005 y W021: no se extiende HSTS a todos los
subdominios ni se pide precarga en navegadores sin conocer/controlar los dominios.
No se silenciaron los avisos. Revisarlos cuando exista un dominio definitivo; no
activarlos solo para obtener una salida sin advertencias.

## Verificación y cierre

Las siete pruebas nuevas usan variables ficticias, middleware real y SQLite en
memoria para los procesos de chequeo; no acceden a Supabase. Verifican rechazo de
claves inseguras, hosts/orígenes inválidos, arranque, chequeo deploy, redirección,
proxy explícito, cabeceras HTTPS, hosts ajenos y preflight CORS con Authorization.

Resultado de esta revisión: `manage.py check` sin incidencias y **207 pruebas
backend aprobadas** con config.test_settings. `check --deploy` con variables de
ejemplo se ejecuta en las pruebas: sin errores y únicamente W005/W021, explicados
arriba. No se repitió frontend porque no cambió su código.

**Preparación de código completa; verificación desplegada pendiente.** Pablo y Juan,
con Henry de respaldo, completan esta lista cuando Geovanny aporte las URL:

- [ ] Registrar revisión desplegada, URL API y frontend; comprobar el perfil activo
  y variables correctas sin copiar secretos al informe.
- [ ] HTTPS válido y redirección HTTP; ausencia de bucles detrás del proxy.
- [ ] Cabeceras visibles en `/api/v1/health/` y respuestas de error.
- [ ] Host desconocido rechazado; CORS permite el frontend real y no devuelve
  Allow-Origin a un origen ajeno; preflight acepta Authorization y Content-Type.
- [ ] Login y una operación autorizada en el panel, sin exponer errores DEBUG.

Estas comprobaciones HTTP esperan el despliegue y sus URL definitivas; medios,
correo y cuentas finales conservan sus tareas propias. No cerrar el punto de verificación
de producción de #6/#15 con solo las pruebas locales.

## Organización de GitHub descartada

Geovanny descartó la transferencia a una organización para la entrega. Se conserva
el repositorio personal y el reparto de trabajo vigente. No pedir crear una
organización ni conceder nuevos Admin para avanzar en BE-14.

Referencias: [checklist de Django 5.2](https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/),
[proxy HTTPS](https://docs.djangoproject.com/en/5.2/ref/settings/#secure-proxy-ssl-header).
