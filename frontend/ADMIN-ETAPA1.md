# EnObra — Administración (primera etapa)

Implementación de la estructura del panel que reproduce los elementos principales del mockup aprobado, con React 18, Tailwind CSS 4 y Lucide React.

## Rutas

- `/admin/login`: inicio de sesión real vía `POST /api/v1/auth/login/`.
- `/admin`: resumen con indicadores cuando la API entregue datos.
- `/admin/noticias`: listado de noticias, con borradores para sesiones de administración.
- `/admin/mensajes`: bandeja de solicitudes y actualización de estado (`nuevo`, `atendido`, `archivado`).

## Comportamiento mientras Django no tenga persistencia

En `npm run dev` aparece un botón **Ver diseño de demostración**. Solo permite revisar la presentación; no crea una sesión y no expone acciones que modifiquen datos. La vista previa no está disponible en la compilación de producción.

Cuando la API responda `501`, el panel informa que aún falta implementar esa funcionalidad. No inventa datos, solicitudes ni éxitos de guardado.

## Autenticación y seguridad

- El inicio de sesión requiere correo y contraseña; no hay selección insegura de perfiles como en el mockup original.
- Solo se acepta un resultado con `access`, `refresh` y `user.role = 'admin'`.
- Los tokens se mantienen **solo en memoria** del componente `AdminLayout` y se pierden al recargar la página.
- No se guardan en `localStorage`, `sessionStorage` ni cookies desde el frontend.
- La navegación protegida es solo UX; **Django debe comprobar el token y rol en cada endpoint**.
- El cierre de sesión invalida el estado local e intenta revocar el refresh token en Django.
- El equipo debe decidir una estrategia de renovación y persistencia segura de sesión antes de producción.

## Alcance de esta entrega

Disponible: interfaz de login, navegación adaptable a pantallas pequeñas, resumen, listado de noticias y bandeja de consultas con actualización de estado cuando el backend funcione.

Pendiente: CRUD de noticias y carga de imágenes, gestión de proyectos/propiedades (equipo de frontend), indicadores completos y persistencia de Django/Storage. No se cambian rutas públicas, Django ni el sistema de autenticación del servidor.

## Comprobaciones

Desde el directorio raíz:

```powershell
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run build
```

Probar en `http://localhost:5173/admin/login` y seleccionar **Ver diseño de demostración**. Para probar el login real, Django debe estar iniciado en `127.0.0.1:8000` y el servicio de autenticación debe estar implementado.
