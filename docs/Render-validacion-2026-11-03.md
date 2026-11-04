# Render y R2 privado: validación del 3-nov-2026

<!-- enobra-documentacion-vigente -->
> Evidencia fechada; resultados limitados al entorno y revisión indicados. Revisión documental: 3-nov-2026.
> [Base y límites técnicos](BASE-DOCUMENTACION-TECNICA.md). Las evidencias no se reinterpretan como nuevas ejecuciones.
<!-- /enobra-documentacion-vigente -->
Servicio gratuito de validación solicitado por Geovanny. API:
[enobra-api](https://enobra-api.onrender.com/api/v1/health/).
Código backend `bea72e1`, integrado en develop `912d91676d72495efd0d5b373db25f00989141c1`.
[CI Linux aprobado](https://github.com/HDZaid/enobra-platform/actions/runs/41770108190):
238 pruebas, instalación con hashes y arranque HTTP con Gunicorn.

## Servicio real

- Render `enobra-api`, rama develop, raíz backend, Python 3.12.16, plan Free.
  Despliegue manual; sin crear otra base ni otro programador de limpieza.
- Build: `pip install --require-hashes -r requirements.txt && python manage.py check --deploy --settings=config.production`.
- Inicio: `gunicorn --config gunicorn.conf.py config.wsgi:application`.
  Health check `/api/v1/health/`.
- PostgreSQL existente de Supabase mediante pooler de sesión 5432 y TLS requerido.
  No se ejecutaron migraciones, seeds ni recreaciones de tablas.
- Clave persistente de 86 caracteres guardada como secreto; no se regenera al
  arrancar. Hosts API explícitos y orígenes CORS `https://enobra.com.gt` y
  `https://www.enobra.com.gt`. No se modificó DNS ni se conectó dominio propio.
- Activación privada en despliegue
  [dep-dblb4h3bc2fs73dol5j0](https://dashboard.render.com/web/srv-dblahpm417fc73fvqtn0/deploys/dep-dblb4h3bc2fs73dol5j0),
  estado Deploy succeeded / Live.

Configuración no secreta aplicada:

```dotenv
R2_ENABLED=true
R2_ACCESS_MODE=private
MEDIA_API_ORIGIN=https://enobra-api.onrender.com
R2_PUBLIC_HOST=
```

El bucket `enobra-media-prod` conserva acceso público deshabilitado, sin dominio
personalizado ni URL r2.dev. Las credenciales solo están en entornos privados;
no hay secretos en este informe ni en el repositorio.

## Verificaciones HTTP reales

| Comprobación | Resultado |
| --- | --- |
| HTTP a health | 301 hacia HTTPS |
| HTTPS health, empresa, proyectos y noticias | 200 |
| auth/me sin Bearer | 401 |
| Cabeceras health | HSTS max-age=3600, nosniff, DENY |
| Preflight desde enobra.com.gt | 200 y Allow-Origin exacto |
| Preflight desde origen ajeno | Sin Allow-Origin |
| Cliente envía X-Forwarded-Proto=http sobre HTTPS | 200, sin bucle de redirección |

Estas consultas de catálogos comprobaron además conectividad real con Supabase.
Health por sí solo no comprueba la base. Se mantienen los avisos W005/W021 de
HSTS documentados en BE-14; no se habilitó preload ni todos los subdominios.

## Migración y privacidad de imágenes

Inventario: cinco metadatos existentes y un original disponible. Los otros cuatro
proceden de otras PC; el usuario aplazó recuperarlos. No se borraron sus registros.

La imagen disponible, de 257501 bytes, se copió a R2 conservando su clave
`uploads/...jpg` e identificador. SHA-256 remoto coincide con el respaldo original.
Se guardó respaldo privado local de sus metadatos antes de actualizar solamente
esa fila a proveedor `r2-private` y referencia permanente `/media/r2/<id>/`.
No tenía referencias en publicaciones o contenido al actualizarla. La copia local
se conserva y siguen existiendo los cinco registros.

- La API desplegada recuperó los 257501 bytes: SHA-256 coincide con el original.
- Imagen sin publicación pública: GET anónimo 404; vista previa válida 200,
  Content-Type image/jpeg y Cache-Control private, no-store; firma alterada 404.
- Solicitud anónima al endpoint S3: 400 InvalidArgument; no expone la imagen.
  La comprobación del panel Cloudflare confirma también acceso público deshabilitado.
- Escritura y lectura mediante Django S3Storage con las mismas opciones de
  producción verificadas desde este equipo usando un objeto de prueba nuevo.
  Se retiró únicamente ese objeto temporal; no se borraron imágenes existentes.
- Las 238 pruebas aisladas cubren fotos públicas, borradores, papelera, logo,
  vistas previas caducadas/alteradas y protección de medios en uso. Esto no
  sustituye una prueba desde el panel con una cuenta real en Render.

## Persistencia tras otro despliegue

Segundo despliegue manual de la misma revisión:
[dep-dblb6frbc2fs73doqn80](https://dashboard.render.com/web/srv-dblahpm417fc73fvqtn0/deploys/dep-dblb6frbc2fs73doqn80),
Deploy succeeded / Live. Después de finalizar, la API volvió a entregar los
257501 bytes con el mismo SHA-256. Metadatos canónicos conservados y cinco
registros de medios presentes. Lectura anónima, firma alterada y vista previa
caducada: 404; vista previa válida: 200 con private, no-store.

Esta evidencia verifica persistencia del objeto migrado y lectura desde Render.
La escritura con S3Storage se verificó desde este equipo; una subida mediante
POST autenticado desde Render sigue pendiente de la prueba desde el panel.

## Pendientes que no se dan por cerrados

- Login y subida/publicación desde el panel con un usuario real y prueba por rol
  contra la URL desplegada. No se crearon JWT de cuentas para esta verificación.
- Cuatro originales anteriores pendientes de recuperar o resolver cuando el
  usuario autorice una limpieza concreta. No se borró ni reinició la base.
- Correo: backend dummy en validación; no entrega consultas. Configurar proveedor
  y destinatario antes de dar por validado el envío.
- El frontend quedó conectado a Render en una comprobación posterior descrita
  en operacion-produccion.md. Dominio propio de API opcional; Servicios y búsqueda
  conservan sus pendientes funcionales.
- El servicio Free puede suspenderse por inactividad; este despliegue es de
  validación. La limpieza de papelera sigue en GitHub Actions.
