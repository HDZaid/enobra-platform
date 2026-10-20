# Backend del panel administrativo

Implementación sobre `develop`, basada en `MockUp---enObra/admin.js`, los contratos
HTTP existentes y los modelos de `backend/persistence/models/`. No modifica el
frontend, la conexión a Supabase, los modelos existentes ni el esquema de sus tablas.

## Funcionalidades

- `/auth/login/`, `/auth/me/`, `/auth/refresh/`, `/auth/logout/`: JWT con acceso de
  15 minutos y refresh de 7 días; logout revoca ambos tokens de esa sesión.
- `/projects/`, `/properties/`, `/news/`: crear, listar, consultar, reemplazar,
  editar parcialmente y eliminar. Escritura administrativa y borradores privados.
  Se conservan slugs al editar y se resuelven títulos repetidos con sufijos.
- Filtros por año y categoría; propiedades por operación, tipo, zona, precio,
  favoritos y texto sin distinción de mayúsculas/tildes. Orden y paginación existentes.
- `/company/`: contacto, marca, dos teléfonos y redes sociales; `/institution/`:
  textos institucionales. Ambos administradores comparten los datos.
- `/inquiries/`: bandeja protegida y estados `nuevo → atendido → archivado`.
  Los formularios públicos de contacto y visita alimentan la misma bandeja.
- `/admin/media/`: subida, consulta de metadatos y eliminación de imágenes.
  Se comprueban contenido real, MIME y tamaño con Pillow. Los nombres de archivo
  se generan en el servidor; no se usa la ruta proporcionada por el cliente.
- Auditoría de altas, cambios, eliminaciones y estados en `historial_actividad`;
  las eliminaciones registran al administrador que hizo la petición.

Prefijo para todas estas rutas: `/api/v1`. Autorización: `Bearer <access>`.
Se conserva el formato de respuestas, errores y paginación. El cambio de validación
de video acepta únicamente enlaces HTTPS de YouTube, confirmado para esta entrega;
MP4/WebM ya no son válidos. Los teléfonos de empresa admiten como máximo dos valores
y responsable/correo respetan los 150 caracteres de las columnas existentes.

## Mapeo sin migraciones

Los datos principales usan `proyecto`, `propiedad`, `noticia`, sus categorías y videos,
`configuracion_sitio`, `red_social`, `mensaje_contacto`, `usuario` y `rol`.
Las redes se actualizan como filas, preservando otras redes ya registradas.

Los modelos existentes no tienen columnas para todos los campos del mockup.
`contenido_pagina` permite conservar esos datos sin crear tablas ni columnas,
con `visible=false` y claves internas reservadas:

| Clave | Contenido JSON |
| --- | --- |
| `admin.projects.<id numérico>` | Fotos, renders y marca `demo` |
| `admin.properties.<id numérico>` | Fotos, renders y marca `demo` |
| `admin.news.<id numérico>` | Imagen y marca `demo` |
| `admin.company` | Logo |
| `admin.institution` | Presentación, firma, cargo, visión, misión y principios |
| `admin.media.<uuid>` | Metadatos del archivo subido |
| `admin.inquiries.<id numérico>` | Estado de archivo y fecha del último cambio |
| `auth.session.<id aleatorio>` | Usuario, hash SHA-256 del refresh y expiración |

No se almacenan tokens ni contraseñas en texto plano. No se exponen estas filas
internas mediante endpoints genéricos. Las sesiones son compartidas entre procesos;
no dependen de caché local. Desactivar un usuario o su rol bloquea sus tokens.
`mensaje_contacto` permite únicamente `PENDIENTE` y `RESPONDIDO`: un mensaje archivado
conserva su fila como `RESPONDIDO` y el estado adicional se guarda en los metadatos.
Las operaciones compuestas de negocio, metadatos y auditoría usan transacciones.
Eliminar contenido no elimina los archivos compartidos; sus bajas son explícitas.

## Requisitos de ejecución

Instalar `backend/requirements.txt`. Las cuentas reales deben existir en `usuario`,
estar `ACTIVO` y tener un rol activo llamado `admin` o `Administrador` (sin distinguir
mayúsculas). Ambos perfiles reciben las mismas opciones del panel. No se crean cuentas
de ejemplo ni se incluyen credenciales. `password_hash` debe usar un formato soportado
por los hashers de Django; PBKDF2 es el predeterminado. Las claves en texto plano no
sirven para iniciar sesión.

Configurar una `DJANGO_SECRET_KEY` privada en producción; cambiarla invalida los JWT.
Mantener la configuración de conexión ya existente. No ejecutar migraciones para
estas tablas. No hace falta agregar `django.contrib.auth` ni `contenttypes` para
verificar hashes.

Las imágenes usan el almacenamiento Django predeterminado. En desarrollo se guardan
en `backend/media/` y se sirven bajo `/media/` con DEBUG. `MEDIA_ROOT` y `MEDIA_URL`
son opcionales. En producción configurar un directorio duradero y un servidor que
sirva esa URL, o un backend de almacenamiento Django. El proveedor externo sigue
pendiente; esta entrega no despliega ni configura un proveedor. El consumidor debe
poder acceder a `/media/` en el origen del backend o usar una `MEDIA_URL` HTTPS pública.

Limpieza periódica opcional de sesiones vencidas, desde `backend/`:

```powershell
.\.venv\Scripts\python.exe manage.py cleanup_admin_sessions
```

## Validación reproducible

Desde `backend/`:

```powershell
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py test --settings=config.test_settings
.\.venv\Scripts\python.exe manage.py spectacular --file ../docs/openapi.yaml --validate
```

Los tests ejercitan peticiones HTTP, permisos y persistencia ORM contra SQLite en
memoria. El runner reproduce las tablas `managed=False` solo en esa base desechable
y rechaza una conexión distinta. No escribe datos ni crea tablas en Supabase.
Incluye hashes PBKDF2 reales, dos administradores, revocación persistente, borradores,
CRUD, filtros, auditoría, rollback y archivos temporales reales. La concurrencia y
las particularidades de PostgreSQL requieren validación adicional en un entorno
PostgreSQL de pruebas; esta entrega no afirma haber probado Supabase en vivo.

Los módulos públicos de servicios y buscador global siguen sin implementación
registrada (`501`); no forman parte de las operaciones del panel. Las notificaciones
externas por correo/WhatsApp no se configuran en esta entrega.

