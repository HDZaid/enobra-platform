# Papelera de publicaciones (BE-12)

Estado al 24 de octubre de 2026, sobre `backend-dev` (`ec8f363`).
Referencias: [plan maestro, DEC-04/05 y contratos §6](plan/PLAN-MAESTRO.md),
[BE-04, BE-12 y BE-20](plan/PLAN-BACKEND.md) y
[compatibilidad con limpieza SQL](BE-04-compatibilidad-limpieza-supabase.md).

## Implementación e integración

Propiedades y proyectos comparten la lógica de `CatalogRepository` con
`supports_trash=True`. Noticias mantiene borrado definitivo directo (DEC-04).
Las rutas específicas y la vista unificada están montadas en el URLConf real.
`d726917` registró `apps.publications` y sus rutas en `config/settings.py` y
`config/urls.py`; `8e0010e` actualizó OpenAPI. La lógica original de BE-04
(`b7a2b1e`) se conserva. Siguen pendientes el catálogo/roles y permisos por recurso
de proyectos (BE-01/02), la fábrica BE-05 y la carrera de autorización BE-06b.

## Estados y transiciones

| Estado inicial | Operación | Resultado |
| --- | --- | --- |
| Borrador | Publicar mediante edición autorizada | Publicada |
| Publicada | Despublicar mediante edición autorizada | Borrador |
| Borrador o publicada | Enviar a papelera | Fila conservada, `publicado=False`, JSON con estado previo |
| En papelera | Restaurar | Recupera `was_published`: vuelve a borrador o publicada |
| En papelera | Eliminar permanentemente | Borra la fila y su metadato JSON; no se puede restaurar |

Las consultas normales, tanto públicas como administrativas, excluyen las filas en
papelera; proyectos también las excluye del listado de años. Restaurar conserva
imágenes/renders guardados en metadatos y referencias de video; no reconstruye
archivos externos eliminados por otros mecanismos. Eliminar permanentemente exige
que la fila exista y esté en papelera: no es un atajo para borrar una fila activa.
Restaurar o eliminar un registro ausente/fuera de papelera devuelve 404; las
transiciones exitosas de los endpoints devuelven 204.

## Endpoints y permisos

En las rutas siguientes, `tipo` es `properties` o `projects`; el identificador es
numérico para propiedades y slug para proyectos.

| Operación | Ruta real | Acceso actual |
| --- | --- | --- |
| Propiedades: enviar a papelera | `DELETE /api/v1/properties/{id}/` | `properties.trash.any` o `properties.trash.own` para borradores propios |
| Proyectos: enviar a papelera | `DELETE /api/v1/projects/{slug}/` | `admin.all`; aquí aún no se aplican `projects.trash.any/own` |
| Propiedades: listar | `GET /api/v1/admin/properties/trash/` | Alguno de `properties.trash.any`, `.trash.own`, `.restore`, `.delete_permanently` |
| Proyectos: listar | `GET /api/v1/admin/projects/trash/` | Alguno de `projects.trash.any`, `.trash.own`, `.restore`, `.delete_permanently` |
| Propiedades: restaurar | `POST /api/v1/admin/properties/{id}/restore/` | `properties.restore` |
| Proyectos: restaurar | `POST /api/v1/admin/projects/{slug}/restore/` | `projects.restore` |
| Propiedades: eliminar permanentemente | `DELETE /api/v1/admin/properties/{id}/permanent/` | `properties.delete_permanently` |
| Proyectos: eliminar permanentemente | `DELETE /api/v1/admin/projects/{slug}/permanent/` | `projects.delete_permanently` |
| Listado unificado integrado | `GET /api/v1/admin/trash/?type=properties\|projects` | Permisos del tipo solicitado, sin acceso cruzado a otro tipo |

`admin.all` satisface las comprobaciones comunes. Tener `.trash.own` no autoriza
restaurar ni eliminar permanentemente.

**Diferencias actuales frente al contrato:**

- Propiedades comprueba `.trash.any` y limita `.trash.own` a borradores propios al
  enviar a papelera. La comprobación del borrador antes de escribir deja pendiente
  la carrera de autorización de BE-06b.
- `DELETE /projects/{slug}/` ya envía a papelera, pero todavía exige `admin.all`
  por el permiso predeterminado; falta aplicar `.trash.any/own`. No se debe afirmar
  que Empleado ya puede enviar sus proyectos a papelera.
- Las vistas específicas de proyectos para listar/restaurar/eliminar ya declaran
  sus permisos finos, pero estos no están en el catálogo actual de 12 permisos ni
  acreditados en los roles reales.
- En proyectos y en la vista unificada, `.trash.any`, `.restore` o
  `.delete_permanently` permiten listar todos los registros del tipo; si solo se
  tiene `.trash.own`, se filtra por propietario creador.
- La vista específica de propiedades conserva una diferencia: solo `admin.all`
  o `.trash.any` permiten listar todo; incluso con `.restore` o
  `.delete_permanently` se filtra por creador. Henry debe revisar esta diferencia
  al completar BE-02 y armonizar el contrato con la vista unificada.

El listado unificado exige `type`, admite `page` (predeterminado 1) y `page_size`
(predeterminado 12, máximo 100), y devuelve `{count,page,page_size,results}` con
`type`, `id` como texto, `title`, `trashed_at`, `trashed_by`, `trashed_by_name`,
`was_published` y `owner_id`. El listado específico usa el serializer de cada
publicación. El orden de papelera es actualización descendente y luego PK
descendente. Sin autenticación corresponde 401; sin permiso, 403; consultas
inválidas, 400.

## Almacenamiento actual en `contenido_pagina`

DEC-05 conserva el esquema existente: clave `admin.properties.<pk>` o
`admin.projects.<pk>`, donde `<pk>` es la clave numérica interna, no el slug.
`contenido` es texto JSON que conserva los metadatos previos y agrega:

```json
{
  "trash": {
    "trashed_at": "2026-10-23T12:00:00-06:00",
    "trashed_by": "7",
    "was_published": true
  }
}
```

La fecha es ilustrativa. `trashed_by` puede ser nulo. El propietario y el nombre
del actor del listado se obtienen de la fila de negocio y de usuarios; no son
campos adicionales del bloque `trash`. Se guarda el contenido con `visible=False`.
La restauración quita el bloque `trash` y recupera `publicado` desde
`was_published`; la eliminación permanente borra la clave de metadatos.

La lectura de claves/contenidos de papelera se hace en una sola consulta, sin
releer cada clave. Los tests comprueban una consulta de metadatos y cinco para
listar con uno o cuatro registros. Los bloques inválidos se ignoran. No hay un
plazo de purga automática propio de la papelera JSON.

Las transiciones usan transacciones y bloqueo de fila. Registran `PAPELERA`,
`RESTAURAR` y `ELIMINAR_PERMANENTE` en el módulo correspondiente; un fallo revierte
también los cambios de negocio y JSON. Véase [auditoría](auditoria.md).

## Imágenes: situación actual

Según el estado de Supabase informado por el solicitante, `proyecto_imagen` y
`propiedad_imagen` ya existen allí. Django todavía no tiene modelos ni repositorios
que las utilicen: `CatalogRepository` lee y escribe `images` y `renders` en el JSON
de `contenido_pagina`. Los videos sí usan sus relaciones actuales; eso no implica
integración de las tablas de imágenes.

Papelera y restauración conservan esas referencias JSON. La eliminación definitiva
borra el metadato de la publicación; no implementa una purga de archivos externos
ni un ciclo de imágenes sobre las tablas nuevas. No se consultaron Supabase ni sus
FK de imágenes para esta actualización, por lo que no se certifica su efecto ante
un borrado del padre. La adaptación del ORM y sus pruebas son una tarea posterior.

## Conflicto con `limpiar_proyectos_inactivos()` en Supabase

Hay dos ciclos independientes. La papelera usa JSON; la limpieza SQL usa
`estado_limpieza`, `fecha_ultima_actividad` y `fecha_marcado_eliminacion`.
BE-04 no modifica ni reconcilia esos campos.

Según la descripción del solicitante recogida en el
[informe de compatibilidad](BE-04-compatibilidad-limpieza-supabase.md), la función
marca proyectos tras **tres meses de inactividad**, permite eliminarlos después
de **30 días**, considera proyectos no publicados y no destacados, y no consulta
el JSON. No se inspeccionó ni ejecutó su cuerpo para BE-12; estos detalles no
constituyen una validación nueva de la función ni de su programación.

| Conflicto | Consecuencia |
| --- | --- |
| SQL marca un borrador sin JSON | No aparece automáticamente en la papelera manual |
| Se envía un proyecto antiguo a papelera | Queda despublicado y podría ser candidato SQL; el plazo no parte necesariamente de `trashed_at` |
| Se restaura un borrador antiguo | Conserva actividad/marca SQL y podría borrarse en una ejecución posterior |
| Se restaura una publicación | Recupera publicación, pero no limpia las marcas SQL |
| SQL elimina una fila en papelera | Puede dejar JSON huérfano; el listado lo omite y restaurar devuelve 404 |

La API no garantiza los mismos eventos de auditoría para un DELETE externo. Las
pruebas locales acreditan que eliminar un proyecto conserva consultas con vínculo
nulo y elimina videos relacionados; el informe previo recoge las FK reales
`SET NULL` y `CASCADE`. No prueban la función, sus invocadores ni concurrencia
PostgreSQL. Que pg_cron no esté instalado no demuestra que nadie la invoque.

**Solicitud pendiente: ampliar de tres a ocho meses el umbral de inactividad.**
Se documenta por petición del solicitante y coincide con la advertencia de la
[propuesta de imágenes](propuesta-tablas-imagenes.md). No está aplicada ni aprobada
como política definitiva. Tampoco implica por sí misma cambiar los 30 días ni
convertirlos en una garantía de recuperación de papelera. Aumentar el umbral no
resuelve la falta de coordinación entre SQL y JSON.

Henry, Juan y el Ingeniero deben acordar el umbral, si la limpieza excluye la
papelera o comparte su retención, qué ocurre al restaurar, las marcas de actividad,
el actor de auditoría, las relaciones y la limpieza de huérfanos. Cambiar función,
campos nativos o programación requiere autorización y una tarea posterior; BE-12
no ejecuta cambios en Supabase. La coexistencia segura sigue pendiente.

## Evidencia y evolución pendiente

[Las pruebas BE-04](../backend/tests/test_trash.py) cubren ciclo completo,
publicación previa, exclusión de listados, permisos simulados por tipo/propietario,
consultas constantes, rollback, relaciones y ausencia de fila con JSON huérfano.
Usan las rutas reales mediante `config.urls`; una prueba adicional comprueba que
la ruta unificada está montada y exige sesión. Los permisos se simulan mediante
`Principal` y la base es SQLite en memoria: no acreditan roles en Supabase.
La revisión local de este mismo commit ejecutó 119 pruebas del backend y
`check --settings=config.test_settings`, todos satisfactorios. Comprobaciones
adicionales en memoria reprodujeron el 403 de DELETE de proyectos con permisos
finos y la diferencia de alcance entre los listados de propiedades. Estos
resultados no validan concurrencia ni restricciones reales de PostgreSQL.

BE-20 propone columnas nativas y uso de `estado_limpieza` después de acordar la
política y aprobar cambios de esquema. No es comportamiento actual. La propuesta
de imágenes requiere adaptación y pruebas de Django aunque las tablas ya existan
en Supabase; su existencia no implica que el ORM las utilice.

Para cerrar los pendientes funcionales, el equipo debe completar BE-01/02,
armonizar los listados de propiedades y comprobar los flujos con roles reales.
La ruta unificada y la actualización de OpenAPI ya están integradas.
BE-06b corresponde a Pablo. La política SQL requiere acuerdo del equipo; no puede
darse por resuelta únicamente registrando endpoints.

Fuentes contrastadas: [rutas de propiedades](../backend/apps/properties/urls.py),
[rutas de proyectos](../backend/apps/projects/urls.py),
[rutas unificadas](../backend/apps/publications/urls.py),
[vistas de propiedades](../backend/apps/properties/views.py),
[vistas de proyectos](../backend/apps/projects/views.py),
[vista unificada](../backend/apps/publications/views.py),
[repositorio compartido](../backend/persistence/catalog.py) y
[escritura del historial](../backend/persistence/support.py).

El alcance documental de BE-12 está completo para este estado del backend. Esto no
cierra los pendientes funcionales de BE-04 ni autoriza cambios en SQL, permisos o
tablas de imágenes.
