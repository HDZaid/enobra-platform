# Cloudflare Pages + Render + Supabase + Cloudflare R2

Guía de configuración. **No guarda secretos**: cada valor se escribe en el panel de la
plataforma correspondiente, nunca en el repositorio ni en el chat.

| Pieza | Plataforma | Archivo del repo |
|---|---|---|
| Frontend (React) | Cloudflare Pages | `frontend/public/_redirects`, `_headers`; variables en `frontend/.env.example` |
| API (Django) | Render, plan gratuito | `render.yaml` |
| Base de datos | Supabase (ya existe) | `DATABASE_URL` del pooler |
| Imágenes | Cloudflare R2 | `backend/persistence/media_r2.py` |
| Correo de consultas | Resend (API HTTPS) | `ResendInquiryNotifier` |

## Variables de entorno del backend (Render)

| Variable | Valor | Secreta |
|---|---|---|
| `DJANGO_DEBUG` | `false` | no |
| `DJANGO_SECRET_KEY` | Render la genera; mínimo 32 caracteres | sí |
| `DJANGO_ALLOWED_HOSTS` | `api.<dominio>` (el host `onrender.com` se agrega solo) | no |
| `CORS_ALLOWED_ORIGINS` | `https://<dominio>` (sin barra final) | no |
| `FRONTEND_BASE_URL` | `https://<dominio>` | no |
| `DATABASE_URL` | cadena del *transaction pooler* de Supabase | sí |
| `DATABASE_POOLER_MODE` | `transaction` | no |
| `MEDIA_STORAGE_BACKEND` | `r2` | no |
| `R2_ACCOUNT_ID` | identificador de cuenta de Cloudflare | sí |
| `R2_ACCESS_KEY_ID` | Access Key ID del token del bucket | sí |
| `R2_SECRET_ACCESS_KEY` | Secret Access Key del token del bucket | sí |
| `R2_BUCKET` | `enobra-media` | no |
| `R2_PUBLIC_BASE_URL` | `https://media.<dominio>.com.gt` (sin barra final) | no |
| `INQUIRY_NOTIFIER` | `resend` | no |
| `RESEND_API_KEY` | clave de la API de Resend | sí |
| `INQUIRY_NOTIFY_EMAILS` | correos que reciben consultas, separados por comas | no |
| `DEFAULT_FROM_EMAIL` | remitente de un dominio verificado en Resend | no |

El backend **no arranca** con `DJANGO_DEBUG=false` si la clave secreta es la de desarrollo
o tiene menos de 32 caracteres. Con `MEDIA_STORAGE_BACKEND=r2`, `MEDIA_STORAGE_BACKEND=cloudinary` o
`INQUIRY_NOTIFIER=resend` sin sus credenciales tampoco arranca: falla al inicio, no en la
primera subida.

## Preparar R2 en Cloudflare (lo hace una persona, una vez)

1. El dominio `.com.gt` debe estar en Cloudflare, con sus nameservers apuntando a
   Cloudflare. Es el mismo requisito que el dominio de Pages. Si tiene DNSSEC,
   desactivarlo antes del cambio de nameservers.
2. R2 → Crear bucket (por ejemplo `enobra-media`), con ubicación automática y
   almacenamiento Standard.
3. Bucket → Settings → Custom Domains → `media.<dominio>.com.gt`. El dominio debe
   estar en la **misma cuenta** que el bucket. **No activar el acceso por `r2.dev`**:
   tiene límites de tráfico y es solo para desarrollo, como explica la
   [documentación de buckets públicos](https://developers.cloudflare.com/r2/buckets/public-buckets/).
4. R2 → Manage API tokens → crear un token "Object Read & Write" **solo para ese
   bucket**. Copiar Access Key ID, Secret Access Key y Account ID al panel de Render,
   en sus variables `R2_*`. El secreto se muestra una sola vez. Configurar también
   `R2_BUCKET` y `R2_PUBLIC_BASE_URL` en Render.
5. No se necesita CORS en el bucket para mostrar las imágenes: el navegador solo
   las lee y las subidas pasan por el backend.
6. Costo de referencia para Standard: 10 GB de almacenamiento al mes, 1 millón de
   operaciones de escritura (clase A) y 10 millones de lectura (clase B) gratuitos.
   La salida de datos no tiene costo. Pasado el límite de almacenamiento,
   US$0.015 por GB al mes; los excesos de operaciones se cobran por separado.
   Verificar los [precios de Cloudflare](https://developers.cloudflare.com/r2/pricing/)
   el día del despliegue.

## Datos iniciales en Supabase (una sola vez, desde tu computadora)

El plan gratuito de Render **no incluye terminal**, así que los comandos de `manage.py`
se ejecutan en tu máquina apuntando a Supabase. La cadena de conexión solo se escribe en la
terminal, nunca en un archivo del repositorio ni en el chat:

```bash
cd backend
export DATABASE_URL='<cadena del pooler de Supabase>'   # PowerShell: $env:DATABASE_URL='...'
python manage.py check_database                         # solo lectura: comprueba tablas y columnas
python manage.py seed_access_control                    # crea los permisos y roles que falten; no pisa roles existentes
```

- `seed_access_control` **no crea usuarios**. Cada cuenta (Ingeniero, Arquitecta, Empleado)
  debe existir en la tabla `usuario`, activa y con su rol asignado. Si ya existen las del
  equipo, el seed deja al Ingeniero con los 32 permisos.
- Sin `--sync`: ese modo restablece los roles predeterminados y quita permisos añadidos a mano.
- Antes de usar la papelera en la base real, revisa
  [BE-04-compatibilidad-limpieza-supabase.md](BE-04-compatibilidad-limpieza-supabase.md): la
  función `limpiar_proyectos_inactivos()` de Supabase podría borrar proyectos en la papelera.
- Haz un **respaldo de la base** (Supabase → Database → Backups, o `pg_dump`) antes de
  ejecutar nada.

## Ruta de salud y plan gratuito de Render

`GET /api/v1/health/` no usa la base de datos y no se redirige a HTTPS. El plan gratuito
duerme el servicio tras 15 min sin tráfico (la primera petición tarda hasta ~1 min) y borra
el disco en cada reinicio; por eso las imágenes van a Cloudflare R2. Un monitor externo que
visite la ruta de salud cada 10 minutos evita el sueño, pero no lo garantiza.

## Alternativas descartadas y respaldo con Cloudinary

- **Koyeb:** su plan gratuito está cerrado a cuentas nuevas desde febrero de 2026. Se usa Render.
- **Imágenes en Cloudflare R2:** es la propuesta aceptada por el dueño, pero exige una tarjeta en
  Cloudflare, incluso dentro del plan gratuito. Esta rama `despliegue/r2` usa R2;
  si el dueño no entrega la tarjeta, se usa `despliegue/cloudinary`. Solo cambia el
  proveedor de imágenes. Se elige una u otra el día del despliegue.
  La integración Cloudinary sigue disponible aquí con `MEDIA_STORAGE_BACKEND=cloudinary`
  y `CLOUDINARY_URL` configurada en Render; para desarrollo sigue disponible `local`.

## Pinger

Un monitor gratuito (UptimeRobot, cron-job.org…) que visite
`https://api.<dominio>.com.gt/api/v1/health/` cada 10 minutos reduce el sueño del plan
gratuito de Render, pero **no lo garantiza**. Antes de una demo, abre la API a mano.

## Frontend (Cloudflare Pages)

- Comando de build: `npm run build`; directorio: `dist`; raíz del proyecto: `frontend`.
- Variable `VITE_API_BASE_URL` = `https://api.<dominio>/api/v1` (se fija al compilar).
- `public/_redirects` hace que las rutas del panel funcionen al recargar.

## Antes de abrir al público

- [ ] Repetir a mano, en la URL real, los recorridos por rol de `docs/INT-04-matriz-roles.md`
      (no ejecutes `matriz_roles.py` contra la base real: crea propiedades, proyectos, noticias y roles de prueba).
- [ ] Probar con los tres roles en la URL real: iniciar sesión, subir imagen, publicar, enviar a la papelera, enviar una consulta.
- [ ] Confirmar que llega el correo de la consulta.
- [ ] Subir `DJANGO_HSTS_SECONDS` solo cuando HTTPS esté verificado.
- [ ] Las imágenes antiguas con ruta `/media/...` dejan de existir: volver a subirlas.
