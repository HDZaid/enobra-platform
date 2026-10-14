# Pruebas de EnObra con Postman

Colección para el contrato de `develop`, commit `795ab6d`, revisada el 12 de octubre
de 2026. Incluye **62 peticiones**: las **40 operaciones HTTP de OpenAPI**, Swagger,
el esquema en vivo y comprobaciones adicionales de permisos, borradores y limpieza.

## Archivos

- [EnObra.postman_collection.json](EnObra.postman_collection.json): colección v2.1.
- [EnObra-RBAC.postman_collection.json](EnObra-RBAC.postman_collection.json): colección enfocada en roles, permisos y reglas de propiedades por rol.
- [EnObra-local.postman_environment.json](EnObra-local.postman_environment.json): entorno sin credenciales.
- [fixtures/catalogo-prueba.png](fixtures/catalogo-prueba.png): PNG válido para probar subidas.
- [Reporte de revisión](../reporte-revision-admin.md): problemas conocidos y reproducción.

## Preparar el servidor

Desde la raíz del repositorio, en PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Completa `backend/.env` con `DATABASE_URL` y una `DJANGO_SECRET_KEY` propia. La base
PostgreSQL de pruebas debe tener las tablas existentes que mapean los modelos
`managed=False`; `migrate` no las crea. Se necesita una cuenta existente en `usuario`,
con estado `ACTIVO`, rol activo `admin` o `Administrador` y un hash de contraseña
compatible con Django. Las credenciales de las pruebas unitarias no son cuentas reales.

```powershell
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py runserver
```

La API queda en `http://127.0.0.1:8000`. La colección prueba la API; no requiere
arrancar React ni tener implementado el panel visual.

## Importar y configurar

1. En Postman, usa **Import** e importa los dos archivos JSON.
2. Selecciona el entorno **EnObra Local**.
3. Completa sus valores locales:

   | Variable | Valor |
   | --- | --- |
   | `base_url` | `http://127.0.0.1:8000`, sin `/api/v1` ni barra final. |
   | `admin_email` | Correo de la cuenta administradora de pruebas. |
   | `admin_password` | Contraseña de esa cuenta; el archivo la marca como secreta. |
   | `service_id` | `diseno` como ejemplo del contrato. |
   | `run_shared_updates` | `false` por defecto; `true` habilita los PUT de empresa e institución. |

4. En **03 — Imágenes → Subir imagen y guardar URL**, selecciona el PNG incluido en
   el campo `file` de **Body → form-data**. Otra opción es configurar `docs/postman`
   como directorio de trabajo de Postman para resolver `fixtures/catalogo-prueba.png`.
   No agregues manualmente un encabezado `Content-Type` a esa petición.
5. Ejecuta la colección en orden con **Run collection**, una iteración. Para probar
   manualmente, comienza con login y subida de imagen antes de crear registros.

Los tokens e IDs se capturan automáticamente en variables de colección; no necesitas
copiarlos. Las peticiones públicas usan `No Auth` y las protegidas heredan Bearer.
El refresh renueva el access token; al final se comprueba la revocación de ambos y
se vacían las variables de tokens. Un login nuevo reinicia los IDs: termina la limpieza
pendiente antes de iniciar otra corrida. Conserva los IDs si interrumpes una ejecución.

## Colección enfocada en RBAC y roles de publicación

Importa `EnObra-RBAC.postman_collection.json` desde **Import**. Define sus variables
de colección `base_url`, `admin_email`, `admin_password`, `architect_email`,
`architect_password`, `employee_email` y `employee_password`. Cada cuenta debe existir,
estar activa y tener asignado su rol correspondiente. Esta colección no registra
cuentas ni cambia contraseñas; si no hay cuentas Ingeniero, Arquitecta y Empleado en
la base de pruebas, solo se pueden ejecutar las pruebas automatizadas de Django o las
secciones cuyos usuarios estén configurados.

Ejecuta las carpetas en orden. La colección valida login y `/auth/me`, lectura y
administración de roles/permisos, y creación, edición, publicación, papelera,
restauración y eliminación de propiedades según el rol. Genera un rol `Postman QA`
único, lo deja inactivo y sin permisos al final porque la API no tiene un contrato para
eliminar roles. Las propiedades de prueba se borran permanentemente durante la carpeta
de limpieza. Úsala únicamente contra una base de desarrollo o pruebas.

No compartas ni versiones exportaciones que contengan contraseñas, tokens o datos
reales. El entorno entregado está vacío y la colección no contiene secretos.

### Si el login falla antes de enviar la petición

El mensaje `Completa admin_email y admin_password en el entorno local` lo produce
el pre-request script de Postman: la petición todavía no llegó a Django. Completa
ambas variables en el entorno seleccionado **EnObra Local**. El cuerpo
`{{login_body}}` es correcto: el script lo construye a partir de esas variables.

Completar las variables no registra una cuenta. Si el administrador no existe, hay
que inicializarlo primero en la base configurada. En este proyecto se puede hacer
mediante un comando de inicialización (seed) o `manage.py shell`, creando `Usuario`,
generando `password_hash` con `django.contrib.auth.hashers.make_password` y asociando
un `Rol` activo llamado `Administrador` o `admin` mediante `UsuarioRol`. El usuario
debe estar `ACTIVO`. No almacenar la contraseña en texto plano en `password_hash`.

El comando estándar `createsuperuser` no corresponde a estos modelos propios y el
proyecto todavía no incluye un comando para crear el primer administrador. No hay
endpoint público de registro. La colección no crea usuarios ni asigna permisos;
un login con credenciales inexistentes devolverá `401` cuando alcance la API y la
conexión a la base esté disponible.

## Orden y respuestas esperadas

| Carpeta | Qué prueba |
| --- | --- |
| 01 — Sistema | Salud, esquema OpenAPI y Swagger (`200`). |
| 02 — Autenticación | Login, usuario actual y refresh (`200`). |
| 03 — Imágenes | Subida real (`201`) y metadatos (`200`). |
| 04 — Empresa e institución | Lecturas; PUT opcionales que reemplazan datos globales. |
| 05 — Proyectos | Crear, listar, consultar, PUT, PATCH, borrador oculto y años. |
| 06 — Propiedades | CRUD, publicación temporal, listado y facetas. |
| 07 — Noticias | CRUD y ocultación de borradores. |
| 08 — Solicitudes | Contacto, visita, bandeja, detalle y estados. |
| 09 — Contratos pendientes | Servicios, detalle de servicio y búsqueda: `501 not_implemented`. |
| 10 — Permisos y validación | Rechazos esperados `401` y `400`. |
| 11 — Limpieza | DELETE de los tres registros y la imagen (`204`), seguido de GET (`404`). |
| 12 — Cierre y revocación | Logout (`204`) y rechazo de tokens revocados (`401`). |

Los filtros adicionales aparecen desmarcados en **Params** de los listados para que
puedas activarlos: año, categoría, operación, tipo, zona, precios, texto, favoritos,
orden, tipo de solicitud y estado. La fecha de visita se calcula para mañana.

Los `501` no indican que Servicios o Búsqueda estén implementados: son el resultado
esperado de sus contratos pendientes en este commit. Actualiza esas aserciones cuando
se implementen los repositorios. Las pruebas de la colección no sustituyen una revisión
de todas las combinaciones ni las regresiones descritas en el reporte.

## Qué datos modifica

Usa una base de pruebas. La corrida crea proyectos, propiedades, noticias, solicitudes,
metadatos, una imagen y registros de auditoría. Los registros de catálogo llevan el
prefijo `PRUEBA POSTMAN` y un identificador de ejecución. Proyectos y noticias son
borradores; la propiedad se publica temporalmente para poder solicitar una visita.

La carpeta 11 elimina los tres registros de catálogo antes de borrar su imagen. No
se eliminan las solicitudes porque el contrato no tiene DELETE para ellas. También
permanecen auditoría y categorías que se hayan creado. Si una petición falla, revisa
sus resultados y retoma la limpieza; no se garantiza limpieza ante interrupciones.
No reemplaces los IDs capturados por IDs de contenido real.

Con `run_shared_updates=false`, los dos PUT de la carpeta 04 se omiten, incluso si
ejecutas toda la colección. Con `true`, se envían sus JSON de ejemplo y **se reemplazan
los datos de empresa e institución sin restauración automática**. Edita esos cuerpos
o habilítalos solamente en una base aislada. El logo del ejemplo queda vacío para no
referenciar una imagen que la limpieza eliminará.

Si repites varias veces, puedes alcanzar los límites de la API: login `5/min` y
formularios públicos `10/hora` por IP. Un `429` requiere esperar o usar un entorno
aislado preparado para pruebas; no equivale a un fallo del contrato.

## Validación realizada

- JSON validado contra el [esquema oficial Postman v2.1](https://schema.postman.com/json/collection/v2.1.0/collection.json).
- Cobertura comparada con `docs/openapi.yaml`: **40/40 operaciones**.
- Corrida HTTP con Newman 6 y `run_shared_updates=true`: **62 peticiones y 102
  aserciones, sin fallos**, sobre Django con SQLite temporal y archivos temporales.
- Comprobación adicional con `run_shared_updates=false`: solo se enviaron los dos
  GET de empresa/institución; los PUT se omitieron correctamente.
- No se utilizaron cuentas ni tablas de Supabase. Esto no valida particularidades
  de PostgreSQL, concurrencia ni un despliegue real.

La omisión opcional usa [pm.execution.skipRequest](https://learning.postman.com/docs/tests-and-scripts/write-scripts/postman-sandbox-reference/pm-execution/).
La colección y este entorno deben actualizarse cuando cambie el contrato.
