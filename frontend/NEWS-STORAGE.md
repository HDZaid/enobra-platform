# Imágenes de Noticias y Storage

- El frontend consume el campo `image` del endpoint `/api/v1/news/`. No almacena claves ni tokens del proveedor.
- Se admiten URLs `https://...` del proveedor, URLs `http://...` en desarrollo y rutas relativas `/media/...` entregadas por Django.
- `frontend/vite.config.js` redirige `/media/` al Django local en el puerto 8000. **Esto no habilita por sí solo los archivos multimedia en Django**: el backend deberá configurarlos, o devolver URLs HTTPS desde su Storage.
- En producción, las URLs `/media/...` deberán servirse desde el mismo dominio o mediante el proxy del despliegue. Preferiblemente, el backend devolverá la URL pública completa de la imagen.
- Si el campo está vacío, es inválido o la imagen no carga, el componente `NewsImage` muestra un ícono de imagen no disponible, sin romper la tarjeta ni el detalle.
- Las imágenes locales `/assets/...` solo son una demostración del mockup. No deben considerarse contenido real ni almacenamiento definitivo.
- La subida de imágenes del panel administrativo todavía **no está implementada**; será responsabilidad del endpoint de medios de Django. No subir imágenes directamente desde el navegador a un proveedor sin acuerdo del equipo.

## Pruebas

Desde la raíz del repositorio:

```powershell
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run build
```
