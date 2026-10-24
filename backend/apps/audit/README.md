# BE-07: historial y exportación

Implementación independiente del contrato de PLAN-MAESTRO.md §6.2 y la ficha
BE-07 de PLAN-BACKEND.md. No modifica tablas, configuración ni permisos.

## Contrato implementado

- `GET /api/v1/admin/audit/`: requiere `audit.read`; respuesta
  `{count, page, page_size, results}`. Tamaño predeterminado 12, máximo 100;
  valores fuera de rango devuelven 400, igual que la paginación compartida.
- Cada evento devuelve `id`, `user {id, name}`, `action`, `module`, `record_id`,
  `record_name`, `description`, `date`. No se seleccionan correo ni hash del usuario.
- Filtros combinables: `user_id`, `module`, `action`, `date_from`, `date_to`, `q`.
  Usuario/módulo/acción usan igualdad; búsqueda usa coincidencia textual sin
  distinguir mayúsculas sobre nombre del registro O descripción.
- Fechas de entrada `YYYY-MM-DD`: límites inclusivos del día en
  `America/Guatemala`, con independencia de la zona activa del servidor.
  Rangos invertidos o fechas inválidas devuelven 400. Orden `-fecha, -pk`.
- `GET /api/v1/admin/audit/export/`: requiere `audit.export`, independiente de
  `audit.read`, respetando el bypass administrativo existente. Usa los mismos
  filtros, sin paginación, y exporta los 10 000 eventos más recientes como máximo.
- CSV UTF-8 en streaming, adjunto `historial.csv`; columnas
  `id,user_id,user_name,action,module,record_id,record_name,description,date`.
  Fechas ISO con offset de Guatemala; nulos como celda vacía. Toda celda que
  comienza con `=`, `+`, `-` o `@` recibe una comilla simple. También se protegen
  prefijos con espacios y controles; `csv.writer` escapa comillas y saltos de línea.
- Solo lectura: `select_related("usuario")`, campos seleccionados explícitamente,
  paginación en SQL y exportación mediante `iterator(chunk_size=500)`.

## Integración pendiente de Henry

Al revisar el clon el 23 de octubre de 2026, BE-00 no tenía app, rutas ni binding
de auditoría; el catálogo local contenía `audit.read` pero no `audit.export`.
Se crearon los archivos de la app dentro del alcance de BE-07, sin tocar los
archivos compartidos. Henry debe revisar y realizar:

1. Registrar `apps.audit.apps.AuditConfig` en `INSTALLED_APPS` según BE-00.
2. Agregar `path("", include("apps.audit.urls"))` a `api_v1` en
   `config/urls.py`, conservando las rutas existentes.
3. En `register_repositories` de `config/bindings.py`, importar
   `AuditRepository` desde `apps.audit.interfaces` y `DjangoAuditRepository`
   desde `persistence.audit`, y registrar:

   ```python
   register(AuditRepository, DjangoAuditRepository())
   ```

4. Completar `audit.export` y las asignaciones de roles mediante BE-01/03,
   conservando `audit.read`. Esta tarea no ejecuta seeds ni cambia Supabase.
5. Regenerar OpenAPI con `--validate --fail-on-warn` y revisar con FE-03 los
   contratos y columnas CSV. Las vistas ya incluyen anotaciones del esquema.

No hay registro automático desde `AppConfig.ready`, ni repositorio por defecto
en las vistas: sin binding se conserva el 501 del registro compartido. No se
ha enviado comunicación a Henry desde herramientas; esta lista queda para la
coordinación del solicitante. Los endpoints no están disponibles en el URLConf
normal hasta que se integre el punto 2.

## Pruebas y límites

`tests/test_audit_api.py` monta únicamente estas URLs en un URLConf de pruebas y
registra temporalmente el repositorio, restaurando el registro al terminar cada
test. Utiliza `Principal` con permisos explícitos para probar cada autorización;
no acredita roles reales ni integración en configuración de producción.

Las 12 pruebas cubren filtros combinados y compartidos con CSV, privacidad,
fechas y límites inclusivos de Guatemala, orden/paginación, validación, nulos,
CSV y fórmulas, consultas constantes, streaming diferido, 10 001 eventos para
comprobar el tope y la respuesta 501 sin binding. Se ejecutan exclusivamente con
SQLite en memoria mediante `--settings=config.test_settings`; no certifican
rendimiento ni comportamiento de cursores del despliegue PostgreSQL.

BE-07 queda implementada y probada en su alcance independiente; el cierre
integrado espera rutas, binding, catálogo/roles y OpenAPI de Henry.
