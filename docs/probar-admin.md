# Cómo probar el backend antes del commit

## 1. Pruebas automáticas sin tocar Supabase

Abre PowerShell y ejecuta:

```powershell
cd C:\Users\LAPTOP\enobra-platform\backend
.\.venv\Scripts\python.exe manage.py test --settings=config.test_settings --verbosity 2
```

Se muestran los nombres y resultados de los **33 tests**. Al final debe aparecer
`Ran 33 tests` y `OK`. No necesitas cuentas ni un servidor abierto. Las cuentas de
prueba y los datos solo existen en una base SQLite en memoria que se destruye al
terminar; sus credenciales no sirven en tu servidor normal.

Para probar solo un flujo:

```powershell
# Login, consulta del usuario, renovacion y revocacion al salir.
.\.venv\Scripts\python.exe manage.py test tests.test_admin_api.AdminAPITests.test_login_me_refresh_and_logout --settings=config.test_settings --verbosity 2

# Crear, consultar, editar, reemplazar y eliminar en las tres colecciones.
.\.venv\Scripts\python.exe manage.py test tests.test_admin_api.AdminAPITests.test_catalog_crud_and_audit --settings=config.test_settings --verbosity 2

# Ambos administradores editan el mismo contenido.
.\.venv\Scripts\python.exe manage.py test tests.test_admin_api.AdminAPITests.test_both_administrators_can_edit_shared_content --settings=config.test_settings --verbosity 2

# Subir, consultar y eliminar una imagen real en una carpeta temporal.
.\.venv\Scripts\python.exe manage.py test tests.test_admin_api.AdminAPITests.test_media_upload_read_delete --settings=config.test_settings --verbosity 2
```

## 2. API real: script de prueba

En una terminal, inicia Django con la conexión ya configurada:

```powershell
cd C:\Users\LAPTOP\enobra-platform\backend
.\.venv\Scripts\python.exe manage.py runserver
```

En otra terminal:

```powershell
cd C:\Users\LAPTOP\enobra-platform\backend
.\scripts\probar_admin.ps1
```

El script te pide correo y contraseña de **una cuenta administradora existente**.
El usuario debe estar `ACTIVO`, tener rol activo `admin` o `Administrador` y una
contraseña almacenada como hash compatible con Django. No se han creado cuentas
nuevas ni cambiado contraseñas. Si aparece `401` al iniciar sesión, comprueba estos
requisitos; las cuentas de los tests en memoria no son cuentas de Supabase.

El script imprime cada petición y su código, sin imprimir tokens ni contraseñas.
El recorrido del script se verificó contra un servidor HTTP temporal con SQLite
aislado: pasaron las peticiones y se comprobó la eliminación de sus tres registros.
Usa el servidor local por defecto; puedes indicar otra API con
`-BaseUrl https://tu-servidor/api/v1`.

**Esta segunda prueba sí escribe en la base configurada del servidor.** Crea un
borrador marcado como ejemplo en proyectos, propiedades y noticias, con un prefijo
`PRUEBA API` y un identificador aleatorio. Los consulta, edita y elimina al terminar,
incluso si falla un paso. No modifica la configuración de empresa ni los textos
institucionales. Permanecen los registros de auditoría y, si faltaban, las categorías
usadas por las altas. Una interrupción forzada o fallo de conexión puede impedir la
limpieza; el script informa los IDs que no logró eliminar cuando puede continuar.
La imagen de `example.com` es una referencia de prueba, no una foto alojada.

| Comprobación | Resultado esperado |
| --- | --- |
| Login | `200`, sesión iniciada |
| Crear proyecto, propiedad o noticia | `201`, ID generado |
| Consultar borrador con token | `200` |
| Consultar ese borrador sin token | `404` |
| Editar sin token | `401` |
| Editar con token | `200`, título actualizado |
| Listar con paginación | `200` |
| Bandeja de solicitudes sin token | `401` |
| Renovar sesión | `200`, acceso válido |
| Eliminar los registros de prueba | `204` |
| Consultarlos después de eliminar | `404` |
| Logout | `204` |
| Usar acceso o refresh después del logout | `401` |

## 3. Explorar las peticiones visualmente en Swagger

Con el servidor abierto, visita `http://127.0.0.1:8000/api/docs/`.

1. Abre **Autenticación → POST /api/v1/auth/login/** y pulsa **Try it out**.
   Introduce tu correo y contraseña y pulsa **Execute**.
2. Copia únicamente el valor `access` de la respuesta.
3. Pulsa **Authorize** y pega ese valor en `bearerAuth`. Swagger añade `Bearer`.
4. Consulta **GET /api/v1/auth/me/**. Debe devolver tu usuario con `role: admin`.
5. Prueba **POST /api/v1/projects/** con el ejemplo de abajo. Copia el `id` devuelto.
6. Consulta, edita mediante PATCH y elimina mediante DELETE usando ese `id`.
7. Ejecuta **POST /api/v1/auth/logout/** enviando el valor `refresh` del login.

Ejemplo de proyecto (borrador, para que no aparezca al público):

```json
{
  "title": "PRUEBA MANUAL administrador",
  "category": "Vivienda",
  "country": "Guatemala",
  "year": 2026,
  "description": "Proyecto temporal para comprobar el backend",
  "images": ["https://example.com/foto-de-prueba.jpg"],
  "renders": [],
  "video": "https://youtu.be/dQw4w9WgXcQ",
  "demo": true,
  "published": false
}
```

Para PATCH basta enviar `{"title": "PRUEBA MANUAL editada"}`. Las otras propiedades
deben conservarse. Elimina el proyecto al terminar; esta prueba manual no hace
limpieza automática.

También puedes probar la subida de imágenes desde **Medios (admin)** seleccionando
un PNG/JPEG/WebP/GIF real. Debe devolver `201` con una URL `/media/uploads/...` que
puedes abrir en `http://127.0.0.1:8000` seguido de esa ruta. Prueba un archivo de texto
renombrado como `.png`: debe rechazarlo con `400`. Elimina la imagen usando su ID.

La configuración, solicitudes y textos institucionales se prueban sin afectar datos
reales mediante la suite del primer paso. Sus PUT/PATCH en Swagger sí modifican la
base del servidor: úsalos en tu entorno de pruebas si deseas revisar esos flujos
manualmente. El frontend no se ha modificado; estas pruebas muestran el backend.

