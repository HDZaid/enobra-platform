# Reporte de revisión del backend administrativo

Fecha: 12 de octubre de 2026. Rama: `develop`.
Base anterior: `1f8f68d`. Commits revisados: `a2bee15` (modelos/conexión) y
`795ab6d` (backend administrativo). Estado de los hallazgos: **abiertos**.

## Conclusión y alcance

La implementación incorpora autenticación JWT con sesiones revocables, persistencia
ORM, CRUD de proyectos/propiedades/noticias, datos de empresa, textos institucionales,
solicitudes, imágenes y auditoría. Conserva la separación mediante interfaces y utiliza
transacciones para varias operaciones compuestas.

Los flujos principales pasan sus pruebas, pero se encontraron dos fallos reproducidos
y un desajuste de validación frente al modelo PostgreSQL. No se considera una validación
completa de producción. Esta revisión no modificó la implementación ni combinó ramas.

## Evidencia y límites de las pruebas

| Comprobación | Resultado |
| --- | --- |
| `manage.py check --settings=config.test_settings` | Sin errores. |
| Suite existente de Django | 33 pruebas aprobadas en SQLite en memoria. |
| Generación y validación de OpenAPI | Correctas. |
| Salud y Swagger | `200`. |
| Administrador estándar de Django, `/admin/` | `404`; no está instalado. |
| Prueba adicional de imagen referenciada | Borrado `204`, archivo eliminado y URL conservada en proyecto. |
| Prueba adicional de precio fuera de rango | Excepción `decimal.InvalidOperation` sin manejar. |
| Validación de correo de contacto de 166 caracteres | Aceptado; el modelo declara un máximo de 150. |
| Colección Postman con Newman | 62 peticiones y 102 aserciones aprobadas en servidor aislado. |

Las pruebas utilizaron SQLite en memoria y directorios temporales; no escribieron en
Supabase. Durante la revisión no había `backend/.env`, un `backend/.venv` ni
`DATABASE_URL` en el entorno del proceso. Las herramientas se instalaron en un entorno
temporal separado. No se probaron conexiones reales, restricciones del esquema remoto,
concurrencia entre procesos ni persistencia de archivos en producción.

La colección verifica los flujos esperados y cubre 40/40 operaciones de OpenAPI.
Que sus aserciones pasen no invalida estos hallazgos: los casos de regresión siguientes
se reproducen por separado, no se registran como respuestas exitosas esperadas.

## ADM-01 — Se eliminan archivos que todavía usa el catálogo

**Prioridad: P2. Confirmación: reproducido.**

Ubicación: [persistence/media.py](../backend/persistence/media.py), líneas 55–63.

`DjangoMediaStorage.delete()` elimina los metadatos y programa el borrado físico sin
comprobar si la URL se utiliza en proyectos, propiedades, noticias o el logo. Las
referencias guardadas en esos recursos no se actualizan.

### Reproducción

1. Iniciar sesión como administrador y subir un PNG a `POST /api/v1/admin/media/`.
2. Crear un proyecto con `images: ["<url devuelta>"]`.
3. Eliminar primero la imagen con `DELETE /api/v1/admin/media/<id>/`.
4. Consultar el proyecto y comprobar el archivo.

En la prueba aislada el DELETE devolvió `204`, quedaron cero archivos PNG y el
proyecto siguió devolviendo la URL original. Esto deja imágenes rotas y puede afectar
varios registros cuando comparten un archivo.

Con Postman, usa login, subida y creación de proyecto. Después ejecuta únicamente
“Eliminar imagen de esta ejecución”, antes de borrar el proyecto, y consulta su
detalle. Hazlo sobre datos desechables: el archivo se elimina realmente.

### Corrección sugerida y aceptación

Comprobar referencias antes del borrado y rechazarlo con un error documentado, por
ejemplo `409 media_in_use`; alternativamente, definir una operación explícita para
desvincular/reemplazar referencias. Coordinar la verificación con las escrituras del
catálogo para no introducir una carrera entre asignación y eliminación.

Agregar pruebas de archivos compartidos entre dos registros, logo, fotos/renders y
noticias. El rechazo debe conservar tanto el archivo como sus metadatos. Un archivo
sin referencias debe poder eliminarse. Actualizar OpenAPI y el manejo del frontend.

## ADM-02 — Los límites numéricos del contrato no coinciden con la base

**Prioridad: P2. Confirmación: reproducido para precio.**

Ubicaciones: [persistence/catalog.py](../backend/persistence/catalog.py), líneas 90–105;
[serializers de propiedades](../backend/apps/properties/serializers.py);
[modelo de propiedades](../backend/persistence/models/properties.py), líneas 62–66.

El contrato valida mínimos, pero no máximos para precio, superficie y contadores.
La nueva persistencia escribe en campos con capacidad limitada, sin convertir el
desbordamiento en un error de validación.

### Reproducción

En “06 — Propiedades → Crear borrador”, conserva el cuerpo válido y cambia:

```json
{"price": 10000000000}
```

Envía el cuerpo completo modificado con token. No envíes únicamente ese campo: faltan
los demás campos requeridos para POST.

El serializer acepta el valor, pero `precio` es `DecimalField(max_digits=12,
decimal_places=2)`, que admite diez dígitos enteros. En SQLite, la prueba HTTP provocó
`decimal.InvalidOperation` durante la lectura del registro recién creado. El cliente
de pruebas relanzó la excepción; al no existir un manejador para ella, la API no
produce el `400` uniforme esperado. No se reprodujo el caso sobre PostgreSQL real.

### Corrección sugerida y aceptación

Alinear los máximos del serializer con los modelos. Si el contrato conserva números
enteros: precio máximo `9999999999` y superficie máxima `99999999`, dados los campos
decimales actuales. Revisar también los límites de habitaciones, baños y parqueos.
Si se desean decimales, acordar el cambio de contrato con frontend.

Probar el máximo permitido y el primer valor que lo supera, tanto en POST como en
PUT/PATCH. Los valores inválidos deben devolver `400 validation_error` sin modificar
el registro. Regenerar OpenAPI y verificar también sobre PostgreSQL de pruebas.

## ADM-03 — Contacto acepta correos que no caben en la columna

**Prioridad: P2. Confirmación: aceptación del serializer y límite del modelo;
rechazo en PostgreSQL pendiente de reproducción.**

Ubicaciones: [persistence/inquiries.py](../backend/persistence/inquiries.py), líneas
26–28; [serializer de contacto](../backend/apps/inquiries/serializers.py);
[modelo MensajeContacto](../backend/persistence/models/inquiries.py).

`ContactInquiryCreateSerializer.email` no declara `max_length=150`, mientras que
`MensajeContacto.correo` sí tiene ese límite. La persistencia usa directamente el
valor validado. El método `objects.create()` no ejecuta la validación completa del modelo.

### Reproducción

Se construyó un correo sintácticamente válido de 166 caracteres así:

```python
email = "a" * 60 + "@" + "b" * 60 + "." + "c" * 40 + ".com"
```

Con nombre, teléfono, asunto y mensaje válidos, `serializer.is_valid()` devolvió
`True`. El límite inspeccionado del campo `correo` fue 150.

Para reproducirlo en Postman, duplica “Enviar contacto público”, añade este pre-request
script y usa `"email": "{{long_contact_email}}"` en el JSON:

```javascript
pm.variables.set("long_contact_email",
  "a".repeat(60) + "@" + "b".repeat(60) + "." + "c".repeat(40) + ".com");
```

Si la tabla real coincide con el modelo (`varchar(150)`), la escritura excede su
capacidad y se espera un error de base de datos. Esa consecuencia se infiere del
mapeo; no se ejecutó contra Supabase. SQLite no comprueba ese límite como PostgreSQL,
por lo que una prueba solamente con SQLite puede ocultar el problema.

### Corrección sugerida y aceptación

Agregar `max_length=150` al campo de entrada y regenerar OpenAPI. Probar un correo
válido dentro del límite y otro que lo exceda: el segundo debe devolver `400` antes
de escribir en la base. Revisar otros campos de entrada contra sus columnas, sin
asumir que la aceptación de SQLite prueba compatibilidad con PostgreSQL.

## Pendientes que no son fallos nuevos de esta entrega

- El frontend administrativo sigue usando `PendingPage` en `/admin` y `/admin/login`.
  Estos cambios implementan la API, no una interfaz administrativa terminada.
- Servicios y búsqueda siguen devolviendo `501`: sus repositorios no están registrados.
- Las imágenes usan almacenamiento local de Django. El almacenamiento duradero y el
  proveedor externo deben configurarse antes de desplegar.
- Los modelos son `managed=False`: dependen de las tablas existentes. No se ha
  verificado aquí que el esquema remoto coincida completamente con el mapeo.
- No se han creado cuentas reales ni cambiado contraseñas.

El siguiente paso sugerido es corregir ADM-01 a ADM-03 con pruebas de regresión y
validar la integración en un PostgreSQL de pruebas antes de conectar el panel real.
