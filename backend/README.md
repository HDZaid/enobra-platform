# EnObra · Backend

<!-- enobra-documentacion-vigente -->
> Guía vigente. Revisión documental: 3-nov-2026.
> [Base y límites técnicos](../docs/BASE-DOCUMENTACION-TECNICA.md). Las evidencias no se reinterpretan como nuevas ejecuciones.
<!-- /enobra-documentacion-vigente -->
Django + DRF, PostgreSQL existente en Supabase y almacenamiento R2 privado. El
frontend consume la API; no conecta directamente a la base ni recibe claves R2.
Consultar [base técnica](../docs/BASE-DOCUMENTACION-TECNICA.md),
[arquitectura](../docs/arquitectura.md) y [estado actual](../docs/estado-proyecto.md).

## Desarrollo local

Python 3.12; Render/CI usan la revisión fijada en `.python-version`. PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --require-hashes -r requirements.txt
Copy-Item .env.example .env  # Solo la primera vez; completar en privado.
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py runserver
```

No sobrescribir un .env operativo ni publicar valores. En macOS/Linux usar
`.venv/bin/python`. Prioridad de configuración: entorno del proceso, .env.r2, .env.
Las plantillas .example no se cargan automáticamente.

## Pruebas aisladas y contrato

Desde backend:

```powershell
.\.venv\Scripts\python.exe manage.py check --settings=config.test_settings
.\.venv\Scripts\python.exe manage.py test tests --settings=config.test_settings
.\.venv\Scripts\python.exe manage.py spectacular --file ../docs/openapi.yaml --validate --fail-on-warn --settings=config.test_settings
```

La evidencia vigente registra 238 pruebas aprobadas. test_settings usa SQLite
separado; no acredita datos reales ni debe sustituirse por producción para una
prueba que crea/elimina registros. [Cómo probar](../docs/probar-admin.md).

`requirements.in` expresa rangos; requirements.txt fija versiones/hashes.
Actualizar el lock requiere revisión y las comprobaciones de la guía Render.

## Arquitectura y persistencia

Vistas/serializers dependen de interfaces; `apps/common/registry.py` resuelve
implementaciones registradas en `config/bindings.py`. `persistence/` usa ORM y
modelos managed=False sobre veinte tablas existentes. No ejecutar migraciones
ni seeds para recrearlas. [Diccionario](../docs/DICCIONARIO-DATOS.md).

La fábrica de publicaciones reúne proyectos, propiedades y noticias. Genera kits
de repositorio/permisos/papelera; no genera modelos ni define roles de usuarios.
Las interfaces ServiceRepository y SearchRepository siguen sin implementación
registrada; sus endpoints devuelven 501 not_implemented.

## API y autenticación

Contrato canónico: [openapi.yaml](../docs/openapi.yaml), 38 rutas y 55 operaciones.
Swagger `/api/docs/`; esquema `/api/schema/`. Prefijo habitual `/api/v1/`, excepto
la entrega de archivos privados mediante `/media/r2/{media_id}/`.

- JWT Bearer: auth/login/, auth/me/, auth/refresh/ y auth/logout/.
- Access de 15 minutos y refresh de 7 días, con sesión revocable en la base.
- Roles fijos Administrador, Arquitecto y Empleado; alias históricos reconocidos.
  Ingeniero equivale a Administrador. No hay editor de roles ni rutas de permisos.
- Usuarios: listado/selector, creación, edición y reemplazo de rol según política.
- Publicaciones: proyectos, propiedades y noticias; lecturas públicas excluyen
  borradores/papelera. Las operaciones protegidas requieren permisos efectivos.
- Empresa/institución, consultas de contacto/visitas, auditoría y papelera integrados.
- Listados paginados: `{count,page,page_size,results}`; errores:
  `{error:{code,message,details}}`. Ver serializers/OpenAPI para límites por campo.

El selector de roles usa admin/users/roles/ y no sustituye endpoints retirados.
[RBAC](../docs/RBAC.md), [Usuarios](../docs/usuarios-api.md),
[panel](../docs/admin-backend.md), [auditoría](../docs/auditoria.md).

## Producción en Render

Servicio enobra-api; fuente develop, raíz backend, despliegue manual.
Build e inicio:

```sh
pip install --require-hashes -r requirements.txt
python manage.py check --deploy --settings=config.production
gunicorn --config gunicorn.conf.py config.wsgi:application
```

Producción exige PostgreSQL, clave persistente de al menos 50 caracteres y hosts/
orígenes HTTPS explícitos. Supabase usa pooler de sesión y TLS en el servicio
validado. HTTPS/CORS/proxy/cabeceras comprobados; falta recorrido real por rol.
No regenerar la clave en cada arranque. Health comprueba HTTP, no la base.
[Render](../docs/Render-backend.md), [operación](../docs/operacion-produccion.md).

## R2 privado y consultas

R2_ENABLED=true y R2_ACCESS_MODE=private en Render, con MEDIA_API_ORIGIN HTTPS.
R2_PUBLIC_HOST no es obligatorio en ese modo; el bucket no tiene dominio público
ni r2.dev. Credenciales solo en el servidor. Django valida imágenes (10 MiB),
guarda metadatos y entrega bytes según publicación, sesión o vista previa de 15 min.
Se rechaza borrar un medio usado por contenido. No se migra un archivo al cambiar
solo una variable; véase [R2](../docs/R2-configuracion.md).

`check_r2` comprueba lectura autenticada sin subir/borrar. `check_database`
comprueba tablas/columnas en una transacción PostgreSQL de solo lectura; no valida
exhaustivamente tipos, constraints ni recuperación de datos.

Las consultas de contacto/visitas se guardan mediante el repositorio. El backend
de correo desplegado es dummy: configurar proveedor/remitente/destinatario y
probar recepción antes de declarar notificaciones operativas.

## Mantenimiento y límites

P-02 limpia proyectos/propiedades tras más de 90 días en papelera mediante el
workflow existente. No crear otro cron en Render ni restaurar el SQL retirado.
Las publicaciones y sus metadatos/auditoría se modifican transaccionalmente;
la limpieza de archivos huérfanos es un alcance distinto.

El ping de Inicio adelanta el arranque Free; Actions reintenta health al publicar
develop, sin ping periódico. Cuenta técnica, respaldos, cuentas definitivas y
pruebas reales se detallan en [estado del proyecto](../docs/estado-proyecto.md).
