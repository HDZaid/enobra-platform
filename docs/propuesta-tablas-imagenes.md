# Propuesta de estructura de imágenes para Supabase

Fecha: 23 de octubre de 2026, Guatemala. Estado: propuesta revisada, **no aplicada**.
SQL: [propuesta-tablas-imagenes.sql](sql/propuesta-tablas-imagenes.sql).
Alcance autorizado: dos archivos nuevos en docs; sin cambios de código ni datos.

## Esquema propuesto

`proyecto 1 — N proyecto_imagen` y `propiedad 1 — N propiedad_imagen`.
Cada fila de imagen pertenece a exactamente una entidad; no hay tabla de archivos
binarios ni referencias cruzadas entre las dos tablas de imágenes.

| Campo común | Tipo / nulabilidad / valor por defecto | Decisión |
| --- | --- | --- |
| id_imagen | bigserial, PK, no nulo | bigint con secuencia; coincide con los identificadores actuales. |
| id_proyecto / id_propiedad | bigint, no nulo, FK | Referencia la PK numérica existente, nunca el slug público. |
| tipo_imagen | varchar(20), no nulo, `photo` | CHECK permite `photo` o `render`, valores del backend para estas galerías. |
| r2_key | varchar(500), admite NULL | Referencia externa opcional: no inventar claves R2 para URLs o archivos locales. Si existe no puede estar vacía. |
| url_publica | varchar(700), no nulo | Cada fila representa una imagen utilizable; no admite cadena vacía. No representa una carga incompleta. |
| titulo | varchar(200), admite NULL | Etiqueta editorial opcional. |
| texto_alternativo | varchar(250), admite NULL | Permite carga previa a edición; NULL indica pendiente. Cadena vacía puede expresar imagen decorativa, a validar en interfaz futura. |
| es_portada | boolean, no nulo, false | Se admiten cero o una portada por entidad. |
| orden | integer, no nulo, 0 | CHECK >= 0; empates permitidos con desempate por id. |
| fecha_creacion | timestamp with time zone, no nulo, now() | Misma convención observada en el esquema; instante absoluto, presentación local en Guatemala. |

`url_publica` admite una ruta local relativa (`/media/...`) o URL absoluta: no se
impone HTTPS en SQL porque rompería la compatibilidad local. Validar dominios y
esquemas seguros en la futura aplicación. Las URLs firmadas temporales no deben
persistirse como URL pública duradera. Para cargas privadas/pendientes con solo
clave habría que acordar otro contrato; esta propuesta no incluye ese estado.

Se agregan también ocho columnas, todas opcionales y sin DEFAULT:

| Tabla | Columnas propuestas |
| --- | --- |
| servicio | imagen_r2_key varchar(500), imagen_url varchar(700) |
| noticia | imagen_r2_key varchar(500), imagen_url varchar(700) |
| contenido_pagina | imagen_r2_key varchar(500), imagen_url varchar(700) |
| configuracion_sitio | logo_r2_key varchar(500), logo_url varchar(700) |

Las parejas admiten NULL independientemente: una URL heredada no tiene por qué
tener clave conocida y una clave privada no tiene por qué tener URL pública.
No se exige unicidad global de URL/clave: un archivo puede compartirse. Tampoco
se deduce propiedad del archivo a partir de un nombre de clave.

## Restricciones, índices y repetición

Cada tabla nueva tiene PK, FK y cuatro CHECK (tipo, orden, URL y clave).
Las FK usan `ON DELETE RESTRICT`, `ON UPDATE NO ACTION`, sin eliminación en
cascada ni desasociación automática. La aplicación deberá resolver explícitamente
las referencias antes de eliminar físicamente al padre.

Cada una tiene un índice `(id_padre, orden, id_imagen)` para listado ordenado y
comprobación de FK. El prefijo ya cubre búsquedas por padre; no se duplica con otro
índice simple. Un índice único parcial sobre id_padre `WHERE es_portada` impide
dos portadas incluso si una es foto y otra render. No obliga a que exista portada.
Cambiarla requerirá transacción: desmarcar primero la anterior y luego marcar la
nueva, con bloqueo del padre para coordinar escritores. La unicidad parcial es
inmediata y no diferible. No se proponen índices sobre títulos, URLs ni claves sin
un patrón de consulta que los justifique.

El script usa una transacción, timeout de bloqueos de 5 s y de sentencias de 30 s;
si falla, el ejecutor posterior debe abortar y hacer ROLLBACK de la sesión.
`IF NOT EXISTS` permite repetir una aplicación completa sin duplicar objetos ni
rellenar datos. **No reconcilia objetos preexistentes con estructura diferente**:
PostgreSQL puede omitir un objeto por nombre sin validar su definición. Antes de
aplicarlo de nuevo hay que comparar tipos, nulabilidad, defaults, CHECK, FK e
índices con esta propuesta; ante divergencia detenerse, no borrar ni corregir
automáticamente. No hay DROP, TRUNCATE, DML, backfill, funciones ni triggers.
Los ALTER son únicamente ADD COLUMN; añaden columnas nulas sin actualizar
lógicamente los registros. Hay bloqueos de DDL que deben planificarse después.

No se incluyen GRANT, REVOKE, políticas ni cambios RLS. Henry debe revisar los
privilegios por defecto y acceso de Supabase antes de cualquier aplicación: no
exponer automáticamente galerías de borradores o papelera a anon/authenticated.
La autorización de Django no protege por sí sola consultas directas a tablas vía
Supabase. El SQL no se debe aplicar hasta acordar esa política y probar el rol de
conexión del backend. No se presupone que todas las tablas public sean privadas.

## Evidencia real de solo lectura

Se usó la conexión existente de Django, sin imprimir credenciales, en transacción
con `SET TRANSACTION READ ONLY`, confirmado por `SHOW transaction_read_only = on`,
y timeout de 10 segundos. Solo se consultaron `information_schema.columns` y
`pg_constraint`; no se leyeron filas de negocio ni datos personales.

- No hay columnas visibles para `public.proyecto_imagen` ni
  `public.propiedad_imagen`; la comprobación adicional de catálogo de relaciones
  confirma su ausencia. Las seis tablas padre/destino sí existen en public.
- Las ocho columnas nuevas no existen en las cuatro tablas destino.
- `proyecto.id_proyecto` y `propiedad.id_propiedad` son bigint no nulos y PK;
  usan secuencias `nextval(...)`. Se propone bigserial para conservar esa convención,
  en lugar de cambiar a UUID o exigir una extensión.
- Las fechas existentes usan timestamp with time zone y `now()`.
- Las FK actuales de `proyecto_video` y `propiedad_video` usan ON DELETE CASCADE.
  Las FK de mensaje_contacto hacia proyecto y propiedad usan ON DELETE SET NULL.
  Esa política de videos no se replica en imágenes sin resolver los archivos externos.

Estos son resultados observados en esta sesión, no una garantía contra cambios
concurrentes de esquema. Repetir la inspección justo antes de una aplicación futura.

## Backend actual e integración posterior

`DjangoMediaStorage` (`persistence/media.py`) valida formato y tamaño con Pillow,
guarda con `default_storage` en `uploads/<uuid>.<ext>` y persiste `id`, `path`, URL,
tipo, tamaño y fecha como JSON en `contenido_pagina`, clave `admin.media.<id>`.
La configuración actual usa almacenamiento local; no se encontró adaptador R2.
Si falla el registro de la subida se intenta compensar borrando el archivo.
El DELETE de medios elimina metadatos y programa la eliminación del archivo con
`on_commit`; aún no comprueba si está en uso (BE-16). Si falla el borrado externo
después del commit puede quedar un archivo sin registro; no hay atomicidad entre
PostgreSQL y almacenamiento.

`CatalogRepository` guarda `images`, `renders` e `image` en JSON
`admin.<modulo>.<pk>`. Las galerías se devuelven desde esos arrays de URLs;
las nuevas tablas vacías no se consultarán por agregarlas al esquema.
Noticias usa `image` de esos metadatos, y `DjangoCompanyRepository` obtiene el logo
de `admin.company`. Institución guarda otro JSON (`admin.institution`).
Servicio sigue pendiente de implementación real (BE-17). Las columnas propuestas
no sustituyen automáticamente ninguno de esos contratos.

La clave `admin.media.<uuid>` no es una r2_key. No convertir la URL en clave por
recorte de texto: faltan proveedor, bucket y relación verificable. Es necesaria
una migración de datos separada, reversible y revisada, que preserve orden y
distinción foto/render. Durante una transición debe acordarse una fuente de
verdad y fallback; evitar escritura doble parcial y listas duplicadas.
Las columnas de contenido_pagina son una imagen por fila, no reemplazan los arrays
de JSON ni hacen que una fila genérica se vuelva un registro de galería.

Se conservan los nombres `r2_key`/`imagen_r2_key`/`logo_r2_key` del diagrama para no
introducir otra nomenclatura sin aprobación. Son dependientes de Cloudflare R2
en su nombre, pero el SQL no llama a R2 ni exige credenciales/extensiones.
DEC-09 y BE-18 siguen abiertos: Henry y Juan deben confirmar proveedor y decidir
si conviene renombrar a `storage_key` antes de aplicar, o documentar una semántica
genérica. No se equipara la autorización de preparar tablas con esa decisión.

## Papelera, borrado definitivo y limpieza SQL

Enviar a papelera y restaurar en BE-04 no borra al padre: las nuevas filas y archivos
se conservan. La integración futura debe excluir imágenes de entidades en papelera
de accesos públicos; una URL pública conocida puede seguir siendo accesible y
restaurar la entidad no recupera archivos eliminados por el endpoint de medios.

Con RESTRICT, el DELETE permanente actual de `CatalogRepository` fallaría por FK
si hay imágenes. Al ser transaccional, se revierte también el borrado de JSON y
la auditoría. Sin manejo de ese conflicto en el backend puede resultar un 500.
`managed=False` y la ausencia actual de modelos de imágenes impiden que el colector
ORM las descubra: no basta con aplicar SQL. **La futura aplicación queda bloqueada
hasta adaptar y probar este flujo**, conservando la exigencia de borrar solo desde
papelera y con permisos/auditoría existentes.

La misma FK impide que `limpiar_proyectos_inactivos()` elimine un proyecto con
imágenes. Si su DELETE es masivo y no captura el error, puede abortar la sentencia
y su transacción, afectando también otros candidatos o marcas de esa ejecución.
No se inspeccionó ni ejecutó la función; su manejo de errores no está acreditado.
Según la información del solicitante siguen vigentes 3 meses + 30 días; los 8 meses
son una solicitud pendiente, no una modificación incluida. No se modifican
`estado_limpieza`, marcas, pg_cron ni la política JSON de DEC-05.

CASCADE borraría filas pero no archivos externos y perdería las claves necesarias
para recuperarlos o limpiarlos: por eso se descarta aquí. SET NULL requeriría
relación opcional y produciría registros desvinculados, contrario a la pertenencia
obligatoria solicitada. RESTRICT preserva referencias y obliga a una decisión
explícita; tampoco impide borrar externamente un archivo aún referenciado.

En una etapa futura: comprobar usos compartidos de cada archivo, auditar la
decisión, conservar las claves en un registro durable de trabajo y coordinar el
borrado de referencias/entidad y los reintentos externos. No borrar archivos antes
del commit; `on_commit` por sí solo no garantiza entrega ni reintentos tras caídas.
Ese flujo y la detección de huérfanos no se implementan en esta propuesta.

## Cambios futuros necesarios en Django (no realizados)

1. Crear `ProyectoImagen` y `PropiedadImagen` con `managed=False`, db_table exacto,
   BigAutoField `id_imagen`, ForeignKey con db_column exacta, relación inversa
   `imagenes` y `on_delete=RESTRICT`. Evitar índice FK duplicado respecto al compuesto.
2. Mapear CharField de longitudes propuestas y null adecuados, BooleanField e
   IntegerField con defaults y DateTimeField con db_default=Now(). Representar
   CHECK, índices compuestos y UniqueConstraint condicional `es_portada=True`.
   Revisar el comportamiento del colector para no introducir cascadas nuevas.
3. Ampliar modelos existentes Servicio, Noticia, ContenidoPagina y ConfiguracionSitio
   con las ocho columnas opcionales, sin migraciones automáticas sobre estas tablas.
4. Extender diagnóstico BE-10 y runner aislado para las nuevas tablas y constraints.
5. Coordinar repositorios con Juan/Henry y serializers/contratos con los dueños:
   leer galerías en orden, preservar API `images`/`renders`/`image`/`logo`, evitar N+1,
   guardar transaccionalmente portada y asociaciones. No hacer esa implementación ahora.
6. Definir un almacenamiento persistente y metadatos verificables; adaptar BE-16
   para impedir eliminar archivos referenciados y cubrir cargas abandonadas,
   archivos compartidos, errores externos y carreras de borrado/restauración.
7. Adaptar borrado definitivo y coordinar función SQL antes de cargar imágenes;
   probar integridad, auditoría, permisos y restauración en PostgreSQL aislado.

## Verificaciones y límites

Se revisaron nombres, PK y FK reales en modo lectura. El script se revisó
estáticamente con sqlparse: estructura de sentencias, delimitadores y ausencia de
operaciones destructivas; sqlparse **no valida la gramática PostgreSQL completa**.
No hay psql/postgres ni parser PostgreSQL disponibles en los intérpretes locales
comprobados; no se instaló una dependencia ni se arrancó un servidor para esta tarea.
Queda pendiente validación ejecutable e idempotencia en PostgreSQL desechable,
sin conexión a Supabase, antes de aprobar aplicación.

Se ejecutó `git diff --check` y se compararon hashes SHA-256 de todos los archivos
previos para comprobar que BE-04, BE-07, BE-09, BE-10 y frontend siguen intactos.
Se revisó origin/backend-dev con fetch: sin commits/diff remotos nuevos. Se conservó
la rama y el árbol local; no se hizo merge ni commit para limpiar cambios ajenos.
No se repitió la suite de Django porque solo se agregan documentos sin cambiar
comportamiento. Las 97 pruebas aprobadas de la sesión anterior no se atribuyen a
una ejecución nueva ni validan este DDL.

No se ejecutó el archivo SQL, DDL ni DML contra Supabase; solo lecturas de catálogo.
No se modificaron modelos, repositorios, servicios, configuración, planes,
frontend, contratos, permisos, función de limpieza ni datos. Sin migraciones,
seeds, commits o push. La aplicación e integración requieren coordinación posterior.
