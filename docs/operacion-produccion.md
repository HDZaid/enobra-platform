# Operación de EnObra

<!-- enobra-documentacion-vigente -->
> Guía vigente. Revisión documental: 17-nov-2026.
> [Base y límites técnicos](BASE-DOCUMENTACION-TECNICA.md). Las evidencias no se reinterpretan como nuevas ejecuciones.
<!-- /enobra-documentacion-vigente -->
Revisión del 17-nov-2026. Las pruebas de despliegue del 3-nov se conservan en
su [informe fechado](Render-validacion-2026-11-03.md). Los resultados de esta
revisión están en [estado del proyecto](estado-proyecto.md).

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

## Copia pública del catálogo en Pages

- El `prebuild` de `npm run build` se ejecuta con `CF_PAGES=1` o
  `CATALOG_SNAPSHOT=1` y requiere `VITE_API_BASE_URL` HTTPS. Consulta health
  antes de leer la API pública. Guarda la copia en `/data/catalog-snapshot.json`.
- Incluye hasta 20 proyectos y 20 propiedades publicados, años y facetas.
  Copia imágenes admitidas en `/data/media/`, con 4 MiB por archivo y 15 MiB
  totales. Si la API falla, registra `status: failed` y continúa el build.
- Las pantallas de catálogo leen primero la caché local, válida hasta siete días,
  o la copia estática para vistas cubiertas. La API actualiza los datos al
  responder y un 404 real muestra que la ficha ya no está disponible.
- Hasta esa respuesta, las etiquetas de Venta/Alquiler y de categoría muestran
  un indicador de carga. Si la API falla quedan como «Sin confirmar», con un
  aviso y la opción de reintentar. Un cliente no ve como confirmada una
  disponibilidad que Render todavía no respondió.
- Resumen compara la cantidad de publicaciones y la última actualización de las
  respuestas consultadas con la huella del build. Avisa si la copia falta, falló
  o quedó atrasada. El aviso permite diagnosticar la copia desde el panel.
- Para actualizar los archivos estáticos, reconstruir Pages y comprobar
  `status`, `generatedAt` y el contenido servido. Una foto copiada cuando era
  pública puede seguir disponible en el artefacto anterior después de retirar
  la publicación, aunque la API ya controle su acceso en R2.
- Las Pages Functions de las fichas de Proyectos y Bienes raíces preparan
  metadatos Open Graph desde la copia o la API pública. El enlace de WhatsApp
  abre una consulta prellenada con la ficha.

El 17-nov se leyó una copia `ok` en el dominio y en Pages. Su generación
figura el 12-nov a las 19:47 de Guatemala. Estaba vacía y ambos listados de
la API reportaron cero publicados al consultarlos.

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
| Consulta no envía correo | El notificador existe. La última configuración documentada usó `dummy`. Comprobar el proveedor y acreditar entrega antes de dar el envío por operativo. |
| Resumen avisa que el catálogo está atrasado | Verificar la copia del build de Pages y reconstruir si no refleja la API publicada. |
| Servicios/búsqueda devuelve 501 | Endpoints aún pendientes; no es fallo del despliegue. |

No publicar contraseñas, DSN, JWT, claves R2 ni URLs de vista previa con tokens en
Markdown, commits, capturas o logs. Conservar respaldos privados y separar evidencia
local de resultados realmente comprobados en las URL desplegadas.

## Evidencia del ping de Inicio

Código integrado en `6a53f23396a45560d0a2d781befe37c342fbd8c0`, publicado en
backend-dev, frontend-dev y develop. Cloudflare Pages terminó correctamente el
despliegue `13e14f83-76aa-4e06-8176-f571b7f058b9`. El dominio enobra.com.gt y el
host enobra-platform.pages.dev entregaron `index-lomXJnnF.js`, con origen Render,
petición health y timeout de 75 segundos incorporados.

- [Disponibilidad de Render aprobada](https://github.com/HDZaid/enobra-platform/actions/runs/41776192253).
- [Backend de producción aprobado](https://github.com/HDZaid/enobra-platform/actions/runs/41776192150).
- Frontend: 191 pruebas, lint y build correctos. El ping no arranca al importar el
  módulo, se deduplica aun después de terminar y tolera 45 segundos antes del timeout.
- Verificación local del comando Actions: dos respuestas 503 seguidas de 200;
  completó en el tercer intento. YAML comprobado sin schedule ni permisos.
- Los tres árboles se sincronizaron mediante merge; main conserva su SHA anterior.

La comprobación del JavaScript servido acredita publicación y configuración; no
se forzó una suspensión de Render ni se validó un login real para probar el ping.

## Cuentas definitivas

El usuario comunicará los titulares de Admin e Ingeniero cuando estén
definidos. El filtro de cuentas del panel cambia qué filas se muestran.
Cualquier depuración en Supabase se coordina por separado con sus relaciones de
auditoría y el actor técnico de P-02. Ingeniero es alias de Administrador.
