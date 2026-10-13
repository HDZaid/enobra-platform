# Propuesta de infraestructura

Estado: propuesta inicial, sujeta a cambios. Fecha: 12 de octubre de 2026.
Este documento no crea servicios, configura DNS ni activa despliegues.

| Componente | Proveedor propuesto | Responsabilidad |
| --- | --- | --- |
| Frontend | Cloudflare Pages | Publicar el build de React/Vite y conectarlo al dominio `.gt` que se elija. |
| Fotos y renders | Pendiente (R2 es una propuesta) | Almacenar imágenes y servir sus URLs según la política que se acuerde. |
| Backend | Render | Ejecutar Django y exponer la API HTTPS. |
| Base de datos | PostgreSQL en Supabase | Persistir las 20 tablas existentes; Django ORM es el acceso oficial. |

## Flujo propuesto

El navegador descarga React desde Pages, consulta la API de Django en Render y muestra
las imágenes usando las URLs devueltas por la API. Django coordina la autorización,
validación y persistencia mediante su ORM. React nunca usa directamente Supabase/PostgreSQL.
El proveedor de imágenes se integrará en Django cuando se elija; R2 sigue siendo una opción.
Los videos se conservan únicamente como enlaces de YouTube.

## Frontend en Cloudflare Pages

- Directorio del proyecto: `frontend/`. Comando de build propuesto: `npm run build`;
  salida: `dist/`. Instalar dependencias según el lockfile y fijar una versión de Node
  compatible con `package.json` al configurar el proveedor.
- Configurar `VITE_API_BASE_URL` con la URL HTTPS de la API terminada en `/api/v1`.
  Es un valor público incorporado durante la compilación; cambiarlo requiere otro build.
- Si se prefiere `/api/v1` en el mismo dominio, habrá que implementar explícitamente
  su proxy. El proxy local de Vite no se ejecuta en el frontend estático de producción.
- Conectar el dominio `.gt` después de elegirlo y configurar DNS. Para usar el dominio
  raíz en Pages, Cloudflare requiere que sea una zona de la cuenta y que sus nameservers
  estén configurados según su documentación de dominios personalizados.
- Verificar recarga y acceso directo a rutas como `/noticias/...`. Pages ofrece el
  comportamiento SPA cuando no hay un `404.html` de nivel superior; revisar que la
  configuración final conserve ese comportamiento.

Referencias oficiales: [configuración de builds](https://developers.cloudflare.com/pages/configuration/build-configuration/),
[dominios personalizados](https://developers.cloudflare.com/pages/configuration/custom-domains/)
y [comportamiento SPA](https://developers.cloudflare.com/pages/configuration/serving-pages/).

## Backend en Render

- Usar `backend/` como directorio raíz del servicio y `requirements.txt` para las
  dependencias. Render permite desplegar servicios independientes desde un monorepo.
- Seleccionar y agregar un servidor WSGI/ASGI de producción. Los puntos de entrada
  existentes son `config.wsgi:application` y `config.asgi:application`.
  `manage.py runserver` se usa únicamente durante desarrollo.
- Configurar secretos en el proveedor, `DJANGO_DEBUG=false`, hosts permitidos y
  `CORS_ALLOWED_ORIGINS` con los orígenes concretos del frontend. Acordar también
  cómo se autorizan los entornos de vista previa.
- Usar `/api/v1/health/` para comprobar el servicio y configurar `DATABASE_URL` con la
  conexión de Supabase. Las tablas existentes se mapean con Django ORM y `managed=False`;
  no ejecutar `makemigrations`/`migrate` para crearlas.
- No usar el disco local del servicio como almacenamiento definitivo de las imágenes.

Referencias oficiales: [monorepos en Render](https://render.com/docs/monorepo-support)
y [despliegue de Django](https://render.com/docs/deploy-django).

## Propuesta de imágenes en Cloudflare R2

- El contrato actual recibe archivos en `POST /api/v1/admin/media/`, protegido para
  administración. Si se elige R2, se implementaría `MediaStorage` en el backend
  para guardar en R2 y devolver metadatos y una URL HTTPS utilizable por el frontend.
- Mantener claves de R2 en el backend. La UI no debe recibir credenciales del proveedor
  ni subir directamente a un bucket sin un flujo de autorización acordado.
- Validar contenido real, tamaño y permisos en el backend. Guardar identificadores y
  metadatos en PostgreSQL cuando corresponda, no el contenido binario ni imágenes en base64.
- Para imágenes públicas de catálogo, evaluar un dominio personalizado de medios.
  Habilitarlo hace accesibles los objetos correspondientes: decidir por separado
  cómo proteger imágenes privadas o borradores. Un nombre de archivo difícil de adivinar
  no es control de acceso.
- Acordar sustitución, borrado y archivos huérfanos. No borrar un objeto todavía usado
  por otros registros. Las URLs entregadas deben funcionar desde Pages y sus vistas previas.
- Si más adelante se opta por subidas directas mediante URLs firmadas, documentar el
  cambio de contrato, expiración, validación y CORS. En R2 esas URLs usan el endpoint
  de la API S3, no el dominio personalizado de lectura.

Referencias oficiales: [buckets públicos y dominios](https://developers.cloudflare.com/r2/buckets/public-buckets/)
y [URLs firmadas](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).

## Decisiones pendientes

- Dominio `.gt` definitivo y, si procede, subdominios de API e imágenes.
- Cuentas del equipo, personas que administran cada servicio y acceso compartido.
- Entornos, respaldos y recuperación de PostgreSQL en Supabase.
- Proveedor definitivo y política de almacenamiento para fotos y renders.
- Planes, límites, costos y disponibilidad antes de elegir servicios definitivos.
- Rama de producción y estrategia de previews. Se propone `main` para releases y
  `develop` para integración; no se configura despliegue automático con este documento.
- Implementación de modelos/repositorios, autenticación, servidor de producción y adaptador
  del proveedor de imágenes que se seleccione.

Los responsables coordinan estas decisiones, pero cualquier integrante puede proponer
alternativas. Actualizar este documento y los ejemplos de entorno al cambiar la propuesta.
