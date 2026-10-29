# P-02: papelera de 90 días desde el backend

Decisión de Geovanny, 29-oct-2026: retirar la limpieza SQL de Supabase y eliminar
desde el código del backend las publicaciones con **más de 90 días en papelera**.
Sustituye la suspensión temporal y la política anterior de 8 meses de inactividad.

## Hecho y comprobado

- Se guardó la función original en `docs/sql/archive/p02-original-no-ejecutar.sql`
  (copia histórica, **no ejecutar**) y una copia exacta fuera del repositorio.
- Primero se suspendió y se verificó `0 marcados, 0 eliminados` en una transacción
  de solo lectura. Después, por la nueva instrucción de Geovanny, se ejecutó
  `DROP FUNCTION public.limpiar_proyectos_inactivos() RESTRICT`.
- Una nueva consulta confirmó que la función ya no existe. No se usó CASCADE ni se
  borraron publicaciones reales. Evidencia: [verificación SQL](qa/P02-funcion-retirada-2026-10-29.json).
- El comando `purge_expired_trash` usa los repositorios de la API: abarca Propiedades
  y Proyectos. Noticias conserva su borrado directo y no participa.
- Cuenta desde `trash.trashed_at`, no desde creación o última edición. Exactamente
  90 días todavía se conserva. Fechas inválidas o sin zona horaria no se purgan.
- Antes de borrar, bloquea la publicación y vuelve a comprobar estado y fecha.
  Restaurar elimina la marca; volver a enviarla a papelera inicia un nuevo plazo.
- Cada borrado registra actor, acción `ELIMINAR_PERMANENTE` y motivo de 90 días,
  elimina metadatos y conserva las reglas existentes de relaciones. Si falla el
  historial, revierte la operación. No borra archivos de imágenes compartidos.
- El comando exige un usuario activo con permiso de borrado definitivo para ambos
  tipos al ejecutar. Por defecto solo informa; no crea cuentas ni concede permisos.

## Render: paso operativo pendiente

Validación: `manage.py check` sin incidencias; **200 pruebas backend aprobadas**
en SQLite, incluidas 9 de retención (límite exacto, fechas inválidas, restauración,
recomprobación de candidatos, rollback, permisos, relaciones e idempotencia).
Tras ajustar la simulación sin bloqueos de escritura, las 9 pruebas se repitieron.
Simulación sobre Supabase real dentro de una transacción READ ONLY: **0 candidatos
en Propiedades y 0 en Proyectos**. No se borraron publicaciones reales para probar.
Esto no acredita carreras simultáneas en PostgreSQL ni ejecución desde Render.

Geovanny confirmó **Render**. Juan activa y verifica el Cron Job; Pablo es respaldo.
No hace falta esperar a Henry si cualquiera de ellos tiene acceso a Render y a las
variables del servicio. Admin de GitHub no concede esos accesos automáticamente.

Está preparado [render-cleanup.yaml](../render-cleanup.yaml), separado del despliegue
web: importa ese archivo como Blueprint desde develop. Ejecución diaria a las 03:00
de Guatemala (09:00 UTC), máximo 500 por tipo y ejecución. Si hay más pendientes,
se procesan en tandas sucesivas; el umbral es elegibilidad, no un instante exacto.

Configurar en Render, sin publicar secretos: DATABASE_URL de la misma base que la
API, DJANGO_SECRET_KEY y TRASH_CLEANUP_ACTOR_ID (ID del usuario que se responsabiliza
de la ejecución, activo y con permisos). Usar una cuenta técnica dedicada cuando
esté disponible; no atribuir el borrado al autor de la publicación.

Desde backend, revisar candidatos sin borrar:

```bash
python manage.py purge_expired_trash
```

Para aplicar, reemplazar ID por el actor verificado:

```bash
python manage.py purge_expired_trash --execute --actor-id ID
```

La configuración preparada usa el segundo comando. Revisar primero la simulación,
activar el servicio y registrar URL/ID del Cron Job, commit desplegado y primera
ejecución satisfactoria. Verificar también historial. No correr migraciones.

**No se ha creado ni activado el servicio en Render.** Su alta implica facturación:
Render documenta un mínimo de USD 1 al mes por Cron Job. Antes de declararlo activo,
comprobar el costo mostrado en la cuenta y la configuración efectiva. Fuentes:
[Cron Jobs](https://render.com/docs/cronjobs),
[Blueprints](https://render.com/docs/blueprint-spec).

## Condiciones de cierre

La decisión P-02 y la retirada de la función antigua están resueltas. La implementación
y sus pruebas se registran en este informe. El cierre operativo de la ejecución
automática requiere la primera ejecución acreditada en Render; no marcarla como
activa solo porque exista un YAML. Jenny puede probar la papelera con el backend
integrado y el nuevo aviso, sin esperar otra decisión de Henry sobre P-01/P-02.

No reintroducir la función antigua con scripts de esquema o restauraciones. Los
invocadores externos antiguos deben retirarse: llamarla ahora falla sin borrar datos.
Esta comprobación no descarta otros scripts con DELETE directo ajenos a esa función.
