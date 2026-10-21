# Integración parcial de React y Django

Estado: integración validada en desarrollo local y promovida a `develop`.
Origen integrado: `frontend-dev` en `4d3ea14`; se conserva su historial mediante merge.
**El proyecto y, en particular, los catálogos siguen en desarrollo.**
No se declara terminada la aplicación ni validada la conexión a Supabase.

## Qué quedó conectado y comprobado

Se ejecutó React en Vite contra el servidor HTTP real de Django, con ORM y archivos
reales en una base SQLite y un directorio temporal, sin interceptar peticiones.
Las cuentas y sus contraseñas se generan exclusivamente para esa prueba y se eliminan
junto con la base temporal. No se usan credenciales ni datos de producción.

| Módulo | Resultado verificado |
| --- | --- |
| Empresa y Nosotros | Datos institucionales provenientes de Django. Contacto utiliza los mismos datos de empresa que el encabezado/pie; ya no conserva teléfonos/dirección independientes. |
| Noticias públicas | Listado, detalle, imágenes y noticias recientes de Inicio provenientes de la API. Los borradores no aparecen en Inicio. |
| Login y permisos | Login JWT, `/auth/me/`, renovación mediante `/auth/refresh/`, restricción del panel, rol Arquitecta sin acceso a Noticias y revocación después de logout. |
| Noticias administrativas | Crear, subir PNG por multipart, publicar, editar y eliminar una noticia mediante React y comprobar el resultado guardado en Django. Eliminar la noticia no elimina su archivo de imagen. |
| Contacto | Envío JSON, teléfono normalizado, acuse válido y persistencia comprobada posteriormente desde la bandeja. |
| Mensajes | Consulta del contacto guardado y transiciones nuevo → atendido → archivado verificadas en la API. |
| Catálogos públicos existentes | Comprobación básica de lista/detalle de proyectos y propiedades a 1440 y 390 px con datos locales de prueba. Esto no certifica completitud del catálogo ni autoriza sus operaciones administrativas pendientes. |
| Navegación | Conservación de los módulos de Leo, Jennifer y Geo; ruta desconocida, errores y responsive cubiertos también por el recorrido con API simulada. |

## Cambios realizados para unir los módulos

- Inicio consulta noticias publicadas en Django; una lista vacía válida se muestra
  vacía y no se reemplaza por ejemplos. En error se conserva el contenido de referencia
  identificado por el componente de estado existente.
- Contacto consulta `company/` para responsable, dirección, teléfonos, correo y WhatsApp.
- El envío solo se confirma si Django devuelve un acuse con ID, estado y fecha válidos.
  Un 200 mal formado, 501 o fallo de red no se muestra como mensaje guardado.
- Correo limitado a 150 caracteres tanto en frontend como en el serializer Django,
  alineado con el modelo declarado. La prueba comprueba que un correo rechazado no
  crea una solicitud. Los tamaños reales de Supabase requieren inspección adicional.
- Las noticias públicas de ejemplo requieren ahora `VITE_NEWS_PREVIEW=true` explícito
  en desarrollo. El valor predeterminado no activa ejemplos ante una API caída.
  La vista previa administrativa sigue siendo una opción explícita de desarrollo.
- Vite usa el mismo destino para `/api` y `/media`; puede seleccionarse mediante la
  variable de proceso `VITE_API_PROXY_TARGET`. No se incluyen secretos en variables VITE.
- Corregida la anotación sin cuerpo de restore y regenerado `docs/openapi.yaml`,
  incluyendo las rutas ya existentes de roles, permisos y papelera. Generación estricta
  sin errores; esto documenta esas rutas, no da por terminadas sus pantallas.

## Qué falta y qué no se declara integrado por completo

### 1. Supabase y configuración real

- No se logró conexión PostgreSQL desde este entorno: no hay acceso TCP utilizable.
  La validación anterior usa ORM real sobre SQLite local, no PostgreSQL remoto.
- Rotar la contraseña expuesta y configurar valores mediante un canal seguro.
  No copiar claves a Git, documentación, variables VITE ni al chat.
- Validar el esquema y sus tipos/longitudes/precisiones/acciones de borrado e índices
  mediante `information_schema` y `pg_catalog`; la exportación contextual no los
  representa por completo.
- El último esquema que el usuario identificó como actual coincide por nombre con
  las 20 tablas y las 166 columnas mapeadas. Las tres columnas de limpieza de
  `proyecto` **sí están presentes**: la observación sobre su ausencia quedó descartada.
- Probar los flujos con PostgreSQL de desarrollo y datos desechables antes de afirmar
  compatibilidad operativa con Supabase. No ejecutar el SQL contextual ni migraciones
  para recrear tablas de negocio.

### 2. Catálogos en construcción

- Definir y terminar el alcance de proyectos, propiedades y sus formularios
  administrativos. No se inventaron pantallas o flujos para declararlos completos.
- Corregir la carrera entre autorización de borrador y escritura/papelera: la
  propiedad debe bloquearse y validarse dentro de la misma transacción que la cambia.
  Un empleado no debe conservar autorización después de una publicación simultánea.
- Resolver límites numéricos coherentes con modelos y base real. Un precio fuera
  del rango del modelo reprodujo un HTTP 500 en SQLite; no se probó ese fallo en
  PostgreSQL. Contadores, precio y superficie necesitan pruebas de frontera.
- Decidir el contrato de decimales: la BD/modelos admiten decimales, mientras la API
  actual expone enteros. No se modificó unilateralmente ese contrato.
- Las lecturas de las rutas actuales se mantienen; no hay nueva interfaz administrativa
  que exponga los flujos de catálogos todavía pendientes.

### 3. Servicios y búsqueda

- `ServiceRepository` y `SearchRepository` no tienen implementación registrada: 501.
- Servicios y el buscador conservan su comportamiento visual de referencia existente.
  No se presentan como consultas reales completas.
- El portafolio de Inicio conserva contenido de referencia identificado como ejemplo;
  su integración completa debe acompañar el avance de catálogos.

### 4. Medios

- `DELETE /admin/media/{id}/` sigue permitiendo eliminar archivos referenciados.
  No se añadió una acción frontend para usar ese endpoint. Hay que definir y probar
  rechazo de borrado en uso o una operación explícita de sustitución/desvinculación.
- La subida local está validada; falta elegir/configurar almacenamiento persistente
  y comprobar URLs públicas/CORS/permisos de archivos en el despliegue real.
- Eliminar noticias conserva los archivos; definir limpieza de huérfanos sin borrar
  recursos compartidos.

### 5. Sesión, administración y avisos

- La sesión frontend permanece en memoria: se pierde al recargar. El endpoint de
  refresh funciona, pero no hay renovación automática ni restauración de sesión.
- Faltan formularios de administración de contenido institucional, proyectos y
  propiedades, además de cualquier gestión de usuarios/auditoría todavía no publicada.
- Contacto y visitas se guardan; no hay notificación real por correo o WhatsApp.
- Red social sigue representada por campos fijos del contrato actual; evaluar la
  colección dinámica en una ampliación coordinada.
- DEBUG, SECRET_KEY, HTTPS, cabeceras, CORS, proxy y límites deben revisarse para
  producción. Esta entrega no constituye despliegue ni certificación de producción.
- Diagnóstico de BD: el fragmento incompleto de `fix/db-connection-diagnostics`
  se archivó durante la limpieza de ramas por faltar su módulo requerido. El módulo
  complementario sigue en `frontend/news-admin-contact`; no se incorporó al backend.
  Ver [revisión de ramas](estado-ramas.md).

## Pruebas ejecutadas

| Comprobación | Resultado |
| --- | --- |
| Django `check` | Correcto. |
| Suite backend con SQLite aislada | 38 pruebas aprobadas. |
| Suite frontend Node | 76 pruebas aprobadas, ninguna omitida. |
| ESLint | Correcto. |
| Build de producción Vite | Correcto. |
| OpenAPI `--validate --fail-on-warn` | Correcto; salida idéntica al esquema versionado. |
| Navegador con API interceptada | Correcto: rutas, permisos, errores, vacío/reintento y responsive. |
| Navegador sin interceptar API | Correcto: Django real, contacto, bandeja, JWT, noticias CRUD, archivos y lectura básica de catálogos. |
| `git diff --check` | Correcto. |
| PostgreSQL/Supabase remoto | No ejecutado por bloqueo de conectividad. |

No se eliminaron pruebas para obtener estos resultados. Se ajustaron dos fixtures de
contacto para representar el contrato real: ID de texto y `created_at` obligatorio.
Los fallos de catálogo/medios conocidos quedan pendientes; los tests aprobados no los
invalidan ni demuestran que el proyecto completo esté terminado.

## Reproducir la integración local

Desde la raíz del repositorio, con Python 3.12+, Node compatible y Chromium instalado:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
npm --prefix frontend ci
npm --cache /workspace/.npm-cache --prefix /tmp/enobra-browser install --no-audit --no-fund playwright@1.64.1
PLAYWRIGHT_MODULE=/tmp/enobra-browser/node_modules/playwright \
CHROMIUM_PATH=/usr/bin/chromium \
.venv/bin/python backend/scripts/verify_frontend_integration.py
```

La última orden crea una base SQLite temporal desde los modelos no administrados,
carga fixtures y cuentas aleatorias solo en esa base, arranca Django y Vite en puertos
locales libres y ejecuta `frontend/tests/browser/live-backend.cjs`. Mantiene PBKDF2,
permisos y límites de peticiones; no llama a Supabase. Termina los procesos propios y
borra base/archivos temporales al finalizar. Playwright es una herramienta de pruebas
externa; no se añadieron dependencias al producto ni se cambió el lockfile.

Para trabajar con Django configurado en otra terminal, usar el flujo habitual de
`backend/README.md`, guardar credenciales solo en `backend/.env` ignorado por Git o
variables seguras, y ejecutar `npm --prefix frontend run dev` desde la raíz.
El destino predeterminado del proxy es `http://127.0.0.1:8000`. Para otro puerto,
exportar `VITE_API_PROXY_TARGET` en el proceso que ejecuta npm. Los procesos vivos no
son una configuración de despliegue y deben arrancarse en cada sesión.
