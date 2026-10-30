# Política fija de roles en código

Esta política sustituye la administración de roles por datos descrita en informes
anteriores. No requiere migraciones, SQL, seeds ni cambios de registros reales.

| Rol mostrado | Nombres almacenados compatibles | Facultades |
| --- | --- | --- |
| Administrador | Ingeniero, admin, Administrador | Funciones disponibles; único que crea usuarios, asigna uno de los roles fijos y elimina definitivamente desde papelera. No crea/personaliza roles. |
| Empleado | Empleado | Crea, edita y publica noticias, proyectos y propiedades, incluidas las de otros; carga imágenes. Sin borrado, papelera ni administración de usuarios/permisos. |
| Arquitecto | Arquitecta, Arquitecto | Facultades de contenido, imágenes, consultas, historial y gestión de usuarios; envía a papelera y restaura. Sin crear usuarios, reasignar roles ni eliminar definitivamente desde papelera. |

## Autorización

`DjangoAuthService._principal` obtiene los nombres de los roles activos de la cuenta
y calcula la política fija en `access_policy.py` en cada autenticación/verificación.
Los permisos humanos guardados en `RolPermiso` no otorgan facultades adicionales.
Arquitecto nunca recibe admin.all. Las combinaciones antiguas de roles reconocidos
usan la intersección de permisos, no la unión. No se utiliza el nombre mostrado
como prueba de identidad en el navegador: la API decide y la interfaz refleja sus
permisos efectivos.

Las rutas HTTP de administración `admin/roles/`, `admin/roles/{id}/` y
`admin/permissions/` se retiraron: peticiones directas reciben 404, incluso para
Administrador. El repositorio también rechaza crear/editar roles. El frontend ya
no tiene módulo, rutas ni menú de Roles.

Usuarios conserva su listado y selector: GET admin/users/roles/ devuelve solo roles
predeterminados activos existentes, conservando los IDs. Si falta alguno, se omite
y la interfaz informa la limitación; no se crea ni activa en la base. Las opciones
contienen descripciones de la política efectiva, no permisos personalizables.
Administrador puede elegir una opción existente al crear o reasignar una cuenta;
Arquitecto solo edita nombre/estado de cuentas no administradoras. Ninguno puede
cambiar su propio rol/desactivarse ni dejar sin administrador activo el sistema.
La cuenta técnica no se puede modificar o reasignar mediante estas operaciones.

## Cuenta técnica y P-02

La excepción de `allow_service=True` se utiliza exclusivamente desde el comando
purge_expired_trash. Para una cuenta con contraseña inutilizable y un rol no
interactivo, conserva los permisos originales almacenados. No permite login ni
verificación de tokens interactivos. No cambia el usuario técnico, relaciones,
secretos, workflow, SHA programado ni horario de GitHub Actions.
Las pruebas aisladas comprueban que el comando conserva ambos permisos de borrado.

## Límites y compatibilidad

No se consultó la base real: no se puede certificar desde esta tarea que estén los
tres roles activos. Los roles conocidos conservan sus identificadores; no hay
renombrado persistente ni IDs inventados. Las cuentas humanas que únicamente tengan
roles personalizados dejan de autenticar bajo esta política fija. No se reasignan
automáticamente; debe revisarse su situación por el responsable autorizado de datos
fuera de esta tarea. Los nombres históricos de fixtures/seed se conservan, pero no
son la fuente de autorización de sesiones humanas.

La autorización tiene efecto al desplegar el backend. Desplegar solo el frontend
no implementa la política. Sesiones verificadas por el backend nuevo reciben la
política actual; la interfaz debe refrescar su usuario o volver a iniciar sesión.

## Verificación

Pruebas ORM/HTTP con SQLite aislada: permisos adversariales almacenados ignorados,
roles/IDs sin alterar, roles faltantes sin crear, edición/publicación ajena por
Empleado, papelera/restauración por Arquitecto, borrado definitivo y creación de
usuarios bloqueados para roles limitados, rechazo de reasignación/elevación, alias
legados, combinación de roles, cuenta técnica y conservación de P-02.

Pruebas UI en Chromium con Django y SQLite temporales, sin seeds en el runner:
menús y etiquetas de los tres roles, opciones con IDs existentes, sin pantallas
ni acciones de personalización, sin creación de usuarios por Arquitecto, sin
selector de reasignación para Arquitecto, subida por los tres roles y edición de
proyecto ajeno por Empleado. Endpoints de Roles rechazados también desde la API.
El runner genera fixtures solo en SQLite; no lee ni escribe filas reales.

OpenAPI regenerado con test_settings, --validate y --fail-on-warn. No se ejecutaron
SQL, migraciones, seeds ni sincronizaciones contra la base del proyecto. Las suites
históricas conservan sus fixtures/seed únicamente dentro de bases SQLite de prueba;
las pruebas nuevas de política y el runner de navegador no ejecutan seeds.
