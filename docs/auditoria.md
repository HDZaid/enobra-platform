# Auditoría administrativa (BE-12)

<!-- enobra-documentacion-vigente -->
> Guía vigente. Revisión documental: 3-nov-2026.
> [Base y límites técnicos](BASE-DOCUMENTACION-TECNICA.md). Las evidencias no se reinterpretan como nuevas ejecuciones.
<!-- /enobra-documentacion-vigente -->
Estado documental: 3-nov-2026, contrastado con apps.audit y persistence.audit.
[Contrato HTTP](openapi.yaml), [RBAC vigente](RBAC.md) y [base técnica](BASE-DOCUMENTACION-TECNICA.md).

## Implementación e integración

BE-07 implementa lectura y exportación del historial. `apps.audit` está instalada
y sus dos rutas están montadas en el URLConf normal. `a26b321` registró
`AuditRepository → DjangoAuditRepository` en `config/bindings.py`: con permisos
suficientes y consultas válidas responden **200**, incluido el CSV en streaming.
`8e0010e` actualizó OpenAPI. El merge `f624461` conservó la implementación original
de BE-07 (`bb8b9bf`) frente a los stubs paralelos de BE-00.

La integración de rutas, repositorio y audit.export está completada. El catálogo
incluye ese permiso y la política fija lo concede a Administrador y Arquitecto;
Empleado no consulta/exporta historial. No se necesita modificar roles desde un
editor de permisos ni ejecutar seeds para describir esa autorización.

## Eventos registrados

La escritura se encuentra en los adaptadores de persistencia; no es un registro
automático de toda petición HTTP ni de toda escritura directa en Supabase.

| Módulo | Acciones presentes en la implementación |
| --- | --- |
| `properties`, `projects` | `CREAR`, `EDITAR`, `PAPELERA`, `RESTAURAR`, `ELIMINAR_PERMANENTE` |
| `news` | `CREAR`, `EDITAR`, `ELIMINAR` (sin papelera, DEC-04) |
| `company`, `institution` | `EDITAR` |
| `inquiries` | `ESTADO`, al cambiar el estado de una consulta |
| `media` | `CREAR`, `ELIMINAR` |
| `roles` | Pueden existir eventos históricos; la creación/edición de roles personalizables está retirada. |
| `users` | `CREAR`, `EDITAR`, `ROL`, mediante la escritura propia del repositorio de usuarios (BE-08 integrado en `ec8f363`) |

El helper general `audit()` usa el actor explícito o el usuario de actualización/
creación del objeto. Si no hay actor, no crea un evento; no inventa un usuario de
sistema. Usa la clave primaria numérica del objeto, incluso para proyectos cuya
API identifica por slug. En papelera, JSON, auditoría y cambio de negocio están en
la misma transacción: un fallo revierte la operación.

| Operación de papelera | Evento en `properties` o `projects` |
| --- | --- |
| Enviar a papelera y guardar `was_published` | `PAPELERA` |
| Recuperar `publicado` desde `was_published` | `RESTAURAR` |
| Borrar definitivamente la fila y sus metadatos | `ELIMINAR_PERMANENTE` |

El evento de eliminación se registra antes de borrar la fila, dentro de la misma
transacción, y permanece en el historial porque `id_registro` no tiene FK al
objeto. Un DELETE externo o una limpieza SQL no pasa por este helper y no tiene
garantizada esa misma auditoría. La coordinación con la limpieza automática y las
tablas de imágenes pendientes de uso en Django se detalla en [papelera](papelera.md).

## Formato y privacidad

`historial_actividad` es una tabla existente, mapeada con `managed=False`.

| Columna / atributo | Salida HTTP | Significado |
| --- | --- | --- |
| `id_historial` / `id` | `id` | Identificador del evento |
| `id_usuario` / `usuario` | `user: {id, name}` | Actor; el nombre se lee del usuario actual |
| `accion` | `action` | Acción registrada, hasta 50 caracteres |
| `modulo` | `module` | Módulo, hasta 60 caracteres |
| `id_registro` | `record_id` | ID numérico nullable, sin FK al objeto auditado |
| `nombre_registro` | `record_name` | Nombre nullable, hasta 250 caracteres |
| `descripcion` | `description` | Descripción nullable, hasta 500 caracteres |
| `fecha` | `date` | Fecha del evento |

El helper general toma `titulo` como nombre, truncado a 250 caracteres; si el
objeto no tiene ese atributo, escribe una cadena vacía. No llena `descripcion`.
Otros productores, como usuarios y limpieza de papelera, tienen su propia escritura. La salida de BE-07 no
expone correo ni hash de contraseña del actor. El historial no permite recuperar
un objeto eliminado: conserva referencias y texto, no una copia completa.

## Consulta, permisos y paginación

| Endpoint | Permiso exigido por la vista |
| --- | --- |
| `GET /api/v1/admin/audit/` | `audit.read` |
| `GET /api/v1/admin/audit/export/` | `audit.export` |

Los permisos son independientes: leer no autoriza exportar y exportar no autoriza
listar. `admin.all` satisface ambos mediante el mecanismo común de permisos.
Sin autenticación se devuelve 401; autenticado sin permiso, 403; filtros inválidos,
400. La asignación efectiva se calcula mediante la política fija vigente.

Filtros combinables, compartidos por listado y exportación:

| Parámetro | Comportamiento |
| --- | --- |
| `user_id` | Coincidencia exacta de usuario; entero positivo |
| `module`, `action` | Coincidencia exacta; máximos de 60 y 50 caracteres |
| `date_from`, `date_to` | Fechas `YYYY-MM-DD`; límites inclusivos del día en `America/Guatemala` |
| `q` | Búsqueda sin distinguir mayúsculas en nombre del registro o descripción |

Un rango invertido se rechaza. El orden es `-fecha`, seguido de `-pk` para resolver
empates. El listado acepta `page` (mínimo y valor predeterminado 1) y `page_size`
(predeterminado 12; entre 1 y 100). Devuelve
`{count, page, page_size, results}`; una página fuera del rango tiene resultados
vacíos. La consulta usa `select_related("usuario")` para evitar releer cada actor.

Los límites diarios se calculan explícitamente en `America/Guatemala` (UTC−06:00),
independientemente de la zona del servidor: `date_from` empieza a las 00:00:00 y
`date_to` termina a las 23:59:59.999999 del día indicado. Por ejemplo, filtrar solo
el 24 de octubre de 2026 abarca desde `2026-10-24T06:00:00Z` hasta
`2026-10-25T05:59:59.999999Z`.

## Exportación CSV y prevención de fórmulas

La respuesta es streaming, `text/csv; charset=utf-8`, con descarga
`historial.csv`. Columnas: `id,user_id,user_name,action,module,record_id,record_name,
description,date`. Las fechas se exportan en ISO 8601 con zona de Guatemala.
Los valores nulos se convierten en celdas vacías y `csv.writer` escapa comillas,
comas y saltos de línea.

Se exportan como máximo **10 000 eventos**, con los mismos filtros y orden del
listado, leyendo lotes de 500. `page` y `page_size` no limitan la exportación;
no hay paginación ni indicador adicional de truncamiento en el CSV.

Cada celda de datos que empieza con `=`, `+`, `-` o `@` recibe una comilla simple
inicial: `=CMD()` se convierte en `'=CMD()`. También se detectan esos prefijos
después de espacios, tabulaciones o retornos/saltos de línea; una celda que empieza
con tabulación, retorno o salto de línea se protege igualmente. Esta neutralización
se aplica al CSV, sin modificar los eventos guardados ni la respuesta JSON.

## Evidencia, límites y pendientes

[Las pruebas de BE-07](../backend/tests/test_audit_api.py) cubren permisos separados,
privacidad, filtros combinados, límites diarios de Guatemala, orden, paginación,
nulos, fórmulas, consultas y tope de exportación. Sustituyen el URLConf e inyectan el
repositorio; usan SQLite en memoria con `config.test_settings`. Las pruebas de
contratos normales comprueban ahora respuestas 200 en ambas rutas con el binding
real y 403 al exportar con solo `audit.read`. La suite general vigente registra 238 pruebas aprobadas; este documento no
representa una nueva ejecución ni sustituye las evidencias fechadas. La prueba aislada
sin binding conserva 501 como comportamiento de error; no describe el estado
normal de la API integrada.

No se almacenan valores completos antes/después, IP ni eventos de login mediante
este mecanismo (BE-19). No se garantiza auditoría de SQL externo, ni se valida con
SQLite la concurrencia de PostgreSQL, los roles reales o la entrega en producción.

Falta verificar listado/exportación con titulares reales desde el panel desplegado.
El registro, catálogo y OpenAPI ya están integrados. Véase [papelera](papelera.md)
para retención y eventos; P-02 sustituyó la función SQL antigua.

Fuentes contrastadas: [rutas](../backend/apps/audit/urls.py),
[vistas y CSV](../backend/apps/audit/views.py),
[validación de filtros](../backend/apps/audit/serializers.py),
[repositorio de lectura](../backend/persistence/audit.py),
[catálogo inicial](../backend/apps/accounts/access_policy.py) y
[pruebas de integración](../backend/tests/test_contract_stubs.py).

La ampliación BE-19 (valores completos antes/después, IP y eventos de login) no
forma parte de este mecanismo. La depuración futura de cuentas debe respetar
las relaciones del historial y no se ejecuta al actualizar la documentación.
