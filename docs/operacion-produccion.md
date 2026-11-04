# Operación de EnObra

Corte del 3-nov-2026. Estado y pendientes globales en
[estado-proyecto.md](estado-proyecto.md).

## Destinos y despliegue

| Servicio | Configuración |
| --- | --- |
| Cloudflare Pages | Proyecto `enobra-platform`, producción `frontend-dev`, raíz `frontend`, `npm run build`, salida `dist`. |
| Sitio y panel | [Sitio](https://enobra.com.gt), [login](https://enobra.com.gt/admin/login). |
| API Render | `enobra-api`, [health](https://enobra-api.onrender.com/api/v1/health/), fuente `develop`, raíz `backend`, despliegue manual. |
| Datos e imágenes | Supabase PostgreSQL existente y R2 privado `enobra-media-prod`. |

En Pages, entorno **Production**, configurar como texto público:

```dotenv
VITE_API_BASE_URL=https://enobra-api.onrender.com/api/v1
```

Guardar y reconstruir el despliegue de producción. La variable se incorpora al
JavaScript durante el build; editarla sin reconstruir no cambia el cliente.
El 3-nov se verificó el despliegue `2424e9ef-6305-4b67-a142-4838cbc51eb0`:
JS publicado con origen Render, API POST de login disponible y preflight CORS
permitido desde enobra.com.gt. Se probó el contrato con cuerpo vacío, sin iniciar
sesión ni validar la contraseña de ningún usuario.

Render usa `config.production`, Gunicorn y secretos persistentes en el proveedor.
Ver [guía de configuración](Render-backend.md). No ejecutar migraciones/seeds al
desplegar para recrear tablas existentes. Los cambios nuevos de backend necesitan
un despliegue manual; actualizar `develop` no publica automáticamente la API.

## Activación al entrar en Inicio

`HomePage` solicita `warmBackend()` al montarse. El módulo conserva una única
promesa por carga: React StrictMode y volver a Inicio en navegación interna no
repiten el ping. Recargar la aplicación permite otra petición.

- GET al health de la API configurada, sin cookies, Bearer ni datos de usuario.
- Se ejecuta en segundo plano; no bloquea la página ni el login.
- Espera hasta 75 segundos y termina silenciosamente ante error o timeout.
- Visitar directamente otra ruta no ejecuta este ping adicional. Las consultas
  habituales de esas páginas pueden despertar Render por su propio tráfico.
- No hay intervalos en el navegador ni tarea periódica de health en Actions.

Render Free duerme tras 15 minutos sin tráfico y puede tardar cerca de un minuto
al recibir otra petición. El primer visitante todavía puede esperar. Véase la
[documentación de Render](https://render.com/docs/free).

## GitHub Actions: reintentos acotados

`.github/workflows/render-health.yml` se ejecuta con cada push a `develop`:

- Hasta cinco intentos (uno inicial y cuatro reintentos).
- Pausa de 15 segundos, conexión de hasta 10 segundos y solicitud de hasta 75.
- Ventana de reintentos de 360 segundos y job limitado a 8 minutos.
- Repite errores HTTP o de red y falla si la API no se recupera.
- Solo consulta el endpoint público; no usa secretos, JWT ni operaciones de escritura.

Para repetir manualmente: Actions > Disponibilidad de Render > una ejecución >
Re-run all jobs. No se añadió schedule; no se cambia la rama predeterminada ni
`main`. La limpieza diaria P-02 es otra tarea existente y mantiene su programación.
Health confirma el proceso HTTP, no la conexión a Supabase ni la versión desplegada.

## Problemas comunes

| Síntoma | Comprobación y corrección |
| --- | --- |
| Login devuelve 405 | Revisar la URL destino. `/api/v1` relativo en Pages llega al sitio estático; configurar VITE_API_BASE_URL y reconstruir. |
| Primera petición tarda o falla | Esperar el arranque Free; Actions reintenta. El ping de Inicio no reenvía escrituras ni credenciales. |
| CORS bloquea el frontend | Declarar el origen HTTPS exacto en Render; verificar el preflight, sin comodines. |
| Login devuelve 401 | Revisar contraseña, estado activo y rol reconocido con su titular. No se recupera la contraseña original desde el hash. |
| Foto antigua no carga | Cuatro originales no estaban en este equipo; recuperar la copia correcta. No borrar metadatos como solución automática. |
| Foto de borrador da 404 | Usar sesión autorizada o vista previa vigente; el bucket sigue privado. |
| Una subida devuelve 503 | Revisar proveedor y variables R2. Producción bloquea almacenamiento local efímero. |
| Consulta no envía correo | Validación usa backend dummy; falta configurar proveedor y destinatario. |
| Servicios/búsqueda devuelve 501 | Endpoints aún pendientes; no es fallo del despliegue. |

No publicar contraseñas, DSN, JWT, claves R2 ni URLs de vista previa con tokens en
Markdown, commits, capturas o logs. Conservar respaldos privados y separar evidencia
local de resultados realmente comprobados en las URL desplegadas.
