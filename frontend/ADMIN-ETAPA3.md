# EnObra — Etapa 3: bandeja administrativa de solicitudes

## Alcance

Se completó la interfaz **Mensajes** del panel de React para administrar consultas de Contacto y solicitudes de visita. **No se modificó `backend/`**. La interfaz sigue el mockup aprobado, pero utiliza los estados y contratos reales del backend.

### Funciones

- Listado paginado (12 elementos por página) y tarjetas con tipo, fecha, nombre y estado.
- Filtros por tipo (`contacto`, `visita`) y estado (`nuevo`, `atendido`, `archivado`).
- Búsqueda por nombre, correo, teléfono, asunto, mensaje y propiedad.
- Desplegar detalles: correo, teléfono, asunto, propiedad, fecha solicitada, mensaje, actualización y responsable si existe.
- Acciones para avanzar estados **únicamente** en el orden permitido por Django: `nuevo → atendido → archivado`. No se permite desarchivar o saltar estados.
- Modo demostración con **seis solicitudes ficticias**; se pueden filtrar y cambiar de estado, pero todo permanece en memoria y se reinicia al recargar. No se crean registros reales ni se realizan peticiones a Django en la demostración.
- El dashboard muestra la cantidad de solicitudes ficticias **solo en la vista previa**; nunca las presenta como registros reales.

## Contratos existentes (sin endpoints nuevos)

| Acción | HTTP | Ruta | Parámetros / cuerpo |
| --- | --- | --- | --- |
| Listar | GET | `/api/v1/inquiries/` | `page`, `page_size`, `kind`, `status` |
| Detalle | GET | `/api/v1/inquiries/{id}/` | Disponible en backend; la interfaz despliega los datos de la lista sin hacer una segunda petición |
| Cambiar estado | PATCH | `/api/v1/inquiries/{id}/` | `{ "status": "atendido" }` o `{ "status": "archivado" }` |

Todas las operaciones de administración requieren `Authorization: Bearer <access>` y permisos de Django. El frontend no sustituye el control de acceso del servidor.

**Limitación conocida:** Django no expone todavía un parámetro de búsqueda libre en `/inquiries/`. Por eso, con sesión real, la búsqueda de texto se aplica **solo a los 12 registros de la página cargada**, mientras que tipo/estado y paginación se resuelven en el servidor. En demostración se busca en todas las solicitudes ficticias.

## Archivos modificados

- `src/features/admin/pages/AdminInboxPage.jsx`: bandeja completa.
- `src/features/admin/utils/inbox.js`: datos de ejemplo, normalización, filtros, paginación y transiciones.
- `src/components/layout/AdminLayout.jsx`: estado en memoria compartido para la demostración.
- `src/features/admin/pages/AdminDashboardPage.jsx`: contador de ejemplo en modo demostración.
- `src/features/admin/components/AdminShell.jsx`: advertencia de demostración actualizada.
- `tests/adminInbox.test.mjs`: pruebas de lógica y contrato.

## Verificación (PowerShell desde la raíz)

```powershell
npm --prefix frontend run lint
npm --prefix frontend run test
npm --prefix frontend run build
npm --prefix frontend run dev
```

Abrir `http://localhost:5173/admin/login`, seleccionar **Ver diseño de demostración** y navegar a **Mensajes**. Comprobar filtros, búsqueda, detalles, cambio de `nuevo` a `atendido` y después a `archivado`. Recargar y verificar que los cambios se reinician.

## Integración futura con Django

1. Levantar el backend del equipo cuando esté disponible con la base de datos de pruebas.
2. Autenticar una cuenta administrativa válida y comprobar los permisos efectivos.
3. Validar listados, filtros, paginación, transiciones y respuestas 400/401/403/404 con datos de prueba.
4. Confirmar que los registros públicos de Contacto y Visitas llegan a la bandeja.
5. No realizar migraciones ni cambios en tablas desde esta rama frontend.

## Entrega

Validar lint, tests, build y revisión visual **antes** de hacer commit. No sobrescribir el trabajo de otros integrantes ni fusionar a `develop` sin revisión de PR.
