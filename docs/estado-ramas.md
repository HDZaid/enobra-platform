# Consolidación de la integración en develop

La integración validada de React y Django (`frontend-dev`, `4d3ea14`) se incorpora
mediante merge a `develop`, conservando commits y autores. `main` no se modifica.
Las funcionalidades pendientes permanecen descritas en
[integración backend/frontend](integracion-backend-frontend.md); la promoción no
significa que los catálogos estén terminados ni que se haya desplegado producción.

## Criterio de limpieza

| Rama | Decisión | Evidencia |
| --- | --- | --- |
| develop | Conservar como destino de integración | Recibe todo el historial de frontend-dev. |
| main | Conservar sin cambios | Rama principal existente; no recibe esta fusión. |
| frontend-dev | Retirar después de publicar el merge | HEAD revisado: 4d3ea145eab46edb3f30fc13a7805435b84400f7. Queda como ancestro de develop. |
| feature/projects-&-real-estates | Retirar después de publicar el merge | HEAD revisado: da2d292e64f4feed256352d06674788f7d65aed6. Ya incorporado mediante merge a frontend-dev y, por tanto, a develop. |
| frontend/news-admin-contact | Retirar tras integración final | Se fusiona su HEAD 9189058 preservando el frontend ya validado e incorporando diagnóstico/configuración y reporte pendientes. |
| fix/db-connection-diagnostics | Retirar tras revisión adicional solicitada | Commit a79493d archivado; las pruebas y la carga de runserver fallan por dependencia ausente. Se conserva bundle y parche recuperable. |

La eliminación se condiciona al SHA revisado de cada referencia remota y se solicita
como una operación atómica: si una rama avanzó, no se borra con esos valores antiguos.
No se reescribe ningún historial ni se eliminan ramas con trabajo exclusivo pendiente.
La rama local frontend-dev se elimina únicamente cuando Git confirma su incorporación.

## Respaldo y validación

Antes de modificar las ramas se creó y verificó un bundle Git completo, conservado
fuera del checkout en el entorno de trabajo:
`/workspace/repository-backups/enobra-before-develop-cleanup.bundle`.
Contiene el historial completo y las referencias anteriores a la limpieza. No se
crearon ramas temporales ni de respaldo. Los commits de las ramas retiradas siguen
siendo accesibles también como ancestros de develop.

El árbol de la fusión se comprobó idéntico al de frontend-dev antes de actualizar
estas notas y las referencias de documentación. No hubo conflictos de código.

Validación en el resultado de la fusión:

- Backend: 38 pruebas aprobadas en SQLite aislada; system checks correctos.
- Frontend: 76 pruebas aprobadas, lint y build correctos.
- OpenAPI estricto: correcto, sin diferencias con el esquema versionado.
- Recorrido de navegador contra Django real: contacto/bandeja, JWT, noticias CRUD,
  imágenes, permisos y lecturas básicas de catálogos correctos en base desechable.
- Se conserva la limitación de no haber validado Supabase desde este entorno.
- Revisión de whitespace del código correcta; los archivos de licencia originales
  inter-OFL.txt y outfit-OFL.txt traen un espacio final heredado en la línea 21.
  Se conservaron sus bytes y se excluyeron únicamente esos dos archivos del chequeo
  del diff de fusión; no se modificaron licencias para cambiar el resultado del control.

La limpieza de esta entrega se limita a referencias Git incorporadas. No se ejecutan
`git clean`, borrados de contenido, migraciones ni cambios a datos/archivos locales.


## Revisión adicional de ramas con commits de Henry

Tras revisar nuevamente las referencias remotas, la única rama de trabajo cuyo
cambio exclusivo es de Henry es `fix/db-connection-diagnostics`, HEAD
`a79493d994a9d24b86fb8a3e2393babd8153aeca`.

Su título describe adaptación del login, pero el diff real solo añade tres archivos:
check_database.py, un reemplazo de runserver y test_db_diagnostics.py. Todos importan
persistence.db_diagnostics, ausente de su árbol. Se exportó el backend de esa rama a
un directorio temporal, sin cambiar develop ni crear ramas/worktrees, y se ejecutaron:

- `manage.py test tests.test_db_diagnostics --settings=config.test_settings`:
  un error de importación, salida 1; no ejecutó los casos internos de diagnóstico.
- `manage.py help runserver`: salida 1, error de importación del comando personalizado.

Ambos terminan en `ModuleNotFoundError: No module named 'persistence.db_diagnostics'`.
No se solicitó conexión ni se escribieron datos de Supabase. La rama no ofrece un
arranque utilizable como está publicada y no aporta frontend nuevo. Tras la solicitud
expresa de limpiar las ramas de Henry se retira esta referencia, sin integrar código
incompleto. Esto no significa que la idea del diagnóstico sea inútil: su recuperación
queda disponible si se decide completarla posteriormente.

Antes de retirarla se creó y verificó un segundo bundle completo:
`/workspace/repository-backups/enobra-before-henry-cleanup.bundle`.
También se guardó el commit como parche independiente:
`/workspace/repository-backups/henry-db-diagnostics-a79493d.patch`.
La eliminación remota se condiciona al SHA anterior para no borrar cambios recientes.

En esa revisión `frontend/news-admin-contact` no se eliminó: aunque Henry firma su último commit,
contiene una entrega de Jennifer y conserva cambios backend/documentación exclusivos,
incluido el módulo de diagnóstico que falta en la otra rama. La autoría del último
commit no demuestra propiedad exclusiva ni que una rama haya cumplido su función.
`develop` y `main` permanecen. Esta revisión solo cambia documentación y referencias
Git; el backend y frontend validados en develop no se modifican.


## Cierre final de frontend/news-admin-contact

Por solicitud posterior del usuario se integra el historial completo de
`91890588be99ef91069eb2ac3157b99ea32b4ab0` mediante merge a develop. Su frontend ya
estaba integrado selectivamente. Los conflictos se resolvieron conservando las
versiones de develop tras comparar ambos lados: router con Leo/Geo/Jennifer,
Contacto conectado a empresa, límite de correo, landmarks únicos, fuentes locales,
vista previa optativa y proxy configurable. El árbol frontend queda idéntico al
anterior a este merge; no se repite ni revierte esa implementación.

Se incorporan los metadatos DATABASE_URL_SOURCE, el módulo db_diagnostics y el
reporte de contratos, con sus estados actualizados. Se completa un comando manual
`check_database` que comprueba columnas de las tablas public dentro de una
transacción PostgreSQL de solo lectura y con timeout por sentencia. No cambia
runserver ni añade llamadas automáticas a Supabase al iniciar la aplicación.

Del parche archivado de a79493d se recuperan las pruebas de diagnóstico; se añaden
pruebas de ocultación de credenciales en mensajes y del comando manual. El fallo por
módulo ausente queda resuelto al integrar ahora ambas piezas. No se restaura la rama
de diagnóstico eliminada ni su override de runserver.

El respaldo completo previo al merge está en
`/workspace/repository-backups/enobra-before-final-news-merge.bundle` y fue verificado.
La eliminación de la rama se hace solo después de publicar y comprobar que su SHA
es ancestro de develop, con protección ante avances remotos concurrentes.

Validación del cierre final: 47 pruebas backend y 76 frontend aprobadas, lint/build
y OpenAPI estricto correctos, comando check_database cargado correctamente y
recorrido React→Django aprobado con SQLite/archivos temporales. Las pruebas del
comando manual simulan la conexión PostgreSQL y verifican la transacción de solo
lectura y ausencia de cambios de esquema; no se afirma acceso real a Supabase.
