# Despliegue: Cloudflare Pages + Render + Supabase + Cloudinary (rama `despliegue/cloudinary`)

Guía de configuración. **No guarda secretos**: cada valor se escribe en el panel de la
plataforma correspondiente, nunca en el repositorio ni en el chat.

| Pieza | Plataforma | Archivo del repo |
|---|---|---|
| Frontend (React) | Cloudflare Pages | `frontend/public/_redirects`, `_headers`; variables en `frontend/.env.example` |
| API (Django) | Render, plan gratuito | `render.yaml` |
| Base de datos | Supabase (ya existe) | `DATABASE_URL` del pooler |
| Imágenes | Cloudinary, plan gratuito | `backend/persistence/media_cloudinary.py` |
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
| `MEDIA_STORAGE_BACKEND` | `cloudinary` | no |
| `CLOUDINARY_URL` | `cloudinary://API_KEY:API_SECRET@CLOUD_NAME` | sí |
| `INQUIRY_NOTIFIER` | `resend` | no |
| `RESEND_API_KEY` | clave de la API de Resend | sí |
| `INQUIRY_NOTIFY_EMAILS` | correos que reciben consultas, separados por comas | no |
| `DEFAULT_FROM_EMAIL` | remitente de un dominio verificado en Resend | no |

El backend **no arranca** con `DJANGO_DEBUG=false` si la clave secreta es la de desarrollo
o tiene menos de 32 caracteres. Con `MEDIA_STORAGE_BACKEND=cloudinary` o
`INQUIRY_NOTIFIER=resend` sin sus credenciales tampoco arranca: falla al inicio, no en la
primera subida.

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
el disco en cada reinicio; por eso las imágenes van a Cloudinary. Un monitor externo que
visite la ruta de salud cada 10 minutos evita el sueño, pero no lo garantiza.

## Alternativas descartadas y variante con R2

- **Koyeb:** su plan gratuito está cerrado a cuentas nuevas desde febrero de 2026. Se usa Render.
- **Imágenes en Cloudflare R2:** es la propuesta aceptada por el dueño, pero exige una tarjeta en
  Cloudflare. Esta rama usa Cloudinary; la variante con R2 vive en la rama `despliegue/r2`
  (misma base, con `MEDIA_STORAGE_BACKEND=r2`). Se elige una u otra el día del despliegue.

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
