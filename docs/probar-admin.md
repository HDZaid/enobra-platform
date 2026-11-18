# Comprobar el backend y el panel

<!-- enobra-documentacion-vigente -->
> Guía vigente. Revisión documental: 17-nov-2026.
> [Base y límites técnicos](BASE-DOCUMENTACION-TECNICA.md). Las evidencias no se reinterpretan como nuevas ejecuciones.
<!-- /enobra-documentacion-vigente -->
Separar pruebas aisladas, diagnósticos de solo lectura y recorridos que escriben.
La [base técnica](BASE-DOCUMENTACION-TECNICA.md) registra las fuentes y límites;
[estado actual](estado-proyecto.md) indica lo que aún no se ha validado en producción.

## Suite aislada

Desde backend con las dependencias instaladas:

```powershell
.\.venv\Scripts\python.exe manage.py check --settings=config.test_settings
.\.venv\Scripts\python.exe manage.py test tests --settings=config.test_settings
```

Usa SQLite separado y archivos temporales; no usar settings de producción para
esta suite. Resultado vigente: 238 pruebas aprobadas. Comprobar contrato:

```powershell
.\.venv\Scripts\python.exe manage.py spectacular --file ../docs/openapi.yaml --validate --fail-on-warn --settings=config.test_settings
```

Frontend, desde raíz: npm --prefix frontend run lint, npm --prefix frontend test
y npm --prefix frontend run build. El 17-nov pasaron 203 pruebas y lint en
`aa96acd`. La evidencia de Pages y Render está en [estado](estado-proyecto.md).

## Diagnósticos no destructivos

check_database usa una transacción READ ONLY para comprobar tablas/columnas de
Supabase, sin crear ni alterar; no certifica todos los tipos/índices/datos.
check_r2 comprueba lectura autenticada del bucket, sin subir/borrar. Credenciales
solo en entorno privado; no imprimir DSN, contraseñas o URLs firmadas.

Health desplegado: https://enobra-api.onrender.com/api/v1/health/. Es una consulta
pública HTTP; no prueba la base de datos ni el login. Actions reintenta health al
publicar develop. No hay health periódico; el cron diario de P-02 es otra tarea.

## Recorrido manual del panel

Usar una base/entorno de pruebas o datos ficticios con alcance autorizado. Las
cuentas unitarias no existen en Supabase. No adivinar ni copiar contraseñas.

1. Abrir frontend y comprobar que VITE_API_BASE_URL del build apunta a la API.
2. Iniciar sesión con una cuenta activa y rol reconocido; confirmar auth/me.
3. Verificar menús/acciones según la política fija. Roles personalizables no existe.
4. Crear borrador, subir una imagen real permitida y guardar; comprobar respuesta.
5. Publicar y comprobar catálogo y foto por API. Al despublicar, comprobar
   autorización de la API y regenerar Pages si la copia estática contiene esa foto.
6. Para proyectos/propiedades, enviar a papelera/restaurar con las facultades del rol.
7. Probar errores por campo y sesión sin perder contenido ni repetir escrituras.
   La actividad renueva la sesión; la inactividad muestra un contador y bloquea.
   Reingresar con la misma cuenta conserva el formulario montado, pero no prueba
   que se haya guardado.
8. Noticias y Mensajes: comprobar errores por campo y facultades de lectura/gestión.
   Guardar una consulta no acredita la entrega del correo.
9. Revisar una pantalla móvil y cerrar sesión. Registrar revisión, URL y resultado
   para convertir el recorrido en evidencia.

Errores esperados: 400, corregir campos; 401, seguir el reingreso y comprobar el
registro antes de reenviar; 403, revisar permisos sin cambiarlos para forzar
acceso; 501, 503 o sin red, conservar el contenido y registrar el fallo sin
exponer tokens. Un borrador no persiste al recargar o cerrar la pestaña.

En el sitio público, con datos guardados de Proyectos o Bienes raíces, la etiqueta
de cada tarjeta muestra un indicador de carga hasta que la API confirma los datos.
Si la API falla, muestra «Sin confirmar» con la opción de reintentar.

Una subida local devuelve /media/uploads/...; R2 privado devuelve la API /media/r2/
y vistas previas temporales. No confundir ambas configuraciones ni publicar tokens.
Borrar un medio usado debe rechazarse. No eliminar publicaciones, imágenes o usuarios
existentes para completar una prueba. El script probar_admin.ps1 escribe datos:
revisar su alcance y usar un entorno apropiado antes de ejecutarlo.

El 17-nov la página de login y el preflight CORS respondieron 200. El recorrido
con titulares y la subida desde el panel desplegado siguen sin evidencia
registrada. El usuario aún debe definir los correos definitivos.
