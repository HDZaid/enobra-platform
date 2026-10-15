# EnObra — Frontend (base compartida)

Proyecto React + Vite en JavaScript/JSX, preparado para conectarse a los contratos de Django REST Framework de este mismo repositorio.

> **Alcance de este PR:** solo estructura, rutas y servicios HTTP. Las pantallas muestran marcadores temporales; **no son una versión del mockup aprobado**. Nadie debe considerar completada una vista hasta migrar sus elementos y comprobar fidelidad visual y funcional.

## Requisitos

Node.js >= 20.19 o >= 22.12 y npm. Desde la raíz del repositorio:

```bash
cd frontend
npm ci
npm run dev
```

Abra `http://localhost:5173/`. Para compilar y ejecutar comprobaciones:

```bash
npm run test
npm run lint
npm run build
```

El repositorio incluye `package-lock.json` para instalar dependencias con `npm ci`.
No incorpora `node_modules` ni tokens. Usa `npm install` cuando agregues o actualices
dependencias y versiona también los cambios del lockfile.

## API

- El servidor Django está en [`../backend/`](../backend/README.md); se ejecuta en otra terminal.
- El contrato compartido está en [`../docs/openapi.yaml`](../docs/openapi.yaml).
- Prefijo predeterminado: `/api/v1`, configurable con `VITE_API_BASE_URL` en `.env.local`.
- Vite redirige `/api` a Django en `http://127.0.0.1:8000` durante desarrollo.
- La API responde con `{count,page,page_size,results}` en listados y `{error:{code,message,details}}` en errores.
- Los contratos actuales siguen sin persistencia y pueden responder HTTP 501; este frontend **no simula operaciones exitosas**.
- El cliente HTTP se encuentra en `src/services/apiClient.js` y los servicios particulares dentro de `src/features/*/services/`.
- No subir secretos ni incluir contraseñas o tokens reales en el repositorio. Las peticiones protegidas reciben el token explícitamente; falta acordar sesión y renovación con el backend.

## Reparto del trabajo

| Persona | Módulo | Rutas públicas |
| --- | --- | --- |
| Leo (@Leonor-Rosales) | Inicio, Nosotros, Servicios, layout visual | `/`, `/nosotros`, `/servicios` |
| Geo (@g4usSi) | Proyectos y Bienes raíces, detalles | `/proyectos`, `/bienes-raices` |
| Jennifer (@Jeidy25Saquic) | Noticias, Contacto, panel y auth del frontend | `/noticias`, `/contacto`, `/admin` |

El panel será compartido: **cada persona implementará los formularios de administración de su propio módulo**. Los cambios en archivos compartidos (`src/app/`, `src/components/layout/`, `src/styles/`) se coordinan y revisan entre las personas afectadas. Las asignaciones son orientativas: cualquier integrante puede contribuir a otros módulos.

El equipo completo tiene tres integrantes de frontend y tres de backend. Las
[reglas compartidas](../docs/reglas-desarrollo.md) identifican responsables, contratos
y flujo de ramas. Todo está sujeto a cambios por acuerdo del equipo.

## Rutas y mockup

Las rutas de React se definen en `src/app/router.jsx` y `src/app/routePaths.js`. Se usan rutas limpias (`/noticias`) en lugar de archivos `.html`. Para migrar, conservar el contenido y aspecto del mockup original `MockUp---enObra`, sin copiar el `localStorage` como fuente permanente de contenido. El contenido administrable debe provenir de la API.

La base inicial no incluía los archivos del mockup ni sus recursos. Las ramas de módulos
pueden incorporarlos al migrar sus páginas, identificando los recursos de demostración.
Cloudflare R2 es la [propuesta de almacenamiento](../docs/infraestructura.md), todavía
sujeta a cambios y pendiente de implementación.

## Siguiente fase

1. Revisar y aceptar esta base entre los tres mediante Pull Request hacia `develop`.
2. Cada integrante crea su rama desde el `develop` actualizado.
3. Reemplazar los marcadores temporales por componentes fieles al mockup.
4. Acordar endpoints faltantes para edición institucional y videos con el backend antes de desarrollar formularios definitivos.
5. Integrar API y verificar permisos, validaciones, errores y cambios persistidos.
