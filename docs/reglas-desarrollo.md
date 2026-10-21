# Reglas de desarrollo

Estado: acuerdos de ramas y equipo actualizados el 21 de octubre de 2026.
Regla vigente: [Trabajo en equipo](TRABAJO-EN-EQUIPO.md); una rama compartida por área, sin ramas alternas.

Somos seis integrantes: tres de backend y tres de frontend. Trabajamos mediante
contratos para poder avanzar en paralelo. Responsables, distribución, ramas,
infraestructura y estas reglas pueden cambiar por acuerdo del equipo; cualquier
ajuste se documenta en el PR correspondiente.

## Equipo y coordinación

Los usuarios de GitHub identifican a las personas responsables de coordinar cada área.
El reparto vigente separa frontend y backend. Pablo tiene además autorización para
el Administrador del frontend. Las demás colaboraciones fuera del área requieren
advertir y coordinar previamente; no asumir autorización por el último commit.

| Área | Integrante / usuario de GitHub | Responsabilidad inicial |
| --- | --- | --- |
| Frontend | Leo — [@Leonor-Rosales](https://github.com/Leonor-Rosales) | Inicio, Nosotros, Servicios y layout público. |
| Frontend | Geo — [@g4usSi](https://github.com/g4usSi) | Proyectos, Bienes raíces y sus detalles. |
| Frontend | Jennifer — [@Jeidy25Saquic](https://github.com/Jeidy25Saquic) | Noticias, Contacto, base del panel y autenticación del cliente. |
| Backend | Henry — [@HDZaid](https://github.com/HDZaid) | Contratos/API existentes; reparto de módulos backend por acordar. |
| Backend | Juan | Módulos backend por coordinar en backend-dev. |
| Backend y colaboración frontend | Pablo | Backend en backend-dev; Administrador del frontend en frontend-dev, coordinado con Jennifer. |

Los tres integrantes del frontend implementan también los formularios administrativos
de sus propios módulos. El panel, la navegación, la sesión y los componentes comunes
se coordinan entre los tres. El equipo backend acordará gradualmente el reparto de
autenticación, persistencia, módulos de negocio y almacenamiento de medios.

Esta tabla no crea restricciones de GitHub, permisos por carpeta ni aprobaciones
obligatorias de una persona específica.

## Organización del repositorio

- `backend/`: Django, configuración, contratos, validaciones, permisos y futuras
  implementaciones de persistencia. Django ORM es el acceso oficial a PostgreSQL en
  Supabase; los comandos de Django se ejecutan desde aquí.
- `frontend/`: React, rutas, componentes, estilos, servicios HTTP y pruebas del cliente.
  React consume la API de Django y nunca accede directamente a Supabase/PostgreSQL.
- `docs/`: contratos y acuerdos compartidos; cada aplicación conserva su README técnico.
- Entornos virtuales, `node_modules`, archivos `.env`, builds y credenciales son locales
  o del proveedor de despliegue y no se versionan. Se versionan los `.env.example`,
  el lockfile de npm. Las tablas de negocio actuales ya existen: se mapean con modelos
  no administrados y no se usa `makemigrations`/`migrate` para crearlas.

## Trabajo mediante contratos

1. Antes de implementar o cambiar una integración, revisar `docs/openapi.yaml` y
   los serializers, vistas e interfaces de `backend/apps/`.
2. Acordar método, ruta, permisos, campos, tipos, obligatoriedad, formatos de medios,
   paginación, filtros, errores y ejemplos con una persona de cada área afectada.
3. Cuando cambie la API, actualizar sus definiciones en Django y regenerar OpenAPI
   desde `backend/`:

   ```powershell
   .\.venv\Scripts\python.exe manage.py spectacular --file ../docs/openapi.yaml --validate
   ```

4. Revisar el diff del esquema y adaptar servicios y pruebas del frontend. OpenAPI es
   la referencia compartida publicada; se genera desde Django. Si ambas partes difieren,
   resolver la discrepancia antes de integrar. No editar solamente el YAML generado.
5. Un endpoint propuesto o un ejemplo en un documento no significa que esté implementado.
   Mientras falte persistencia, el `501 not_implemented` es un estado conocido que la UI
   debe manejar sin mostrar un guardado exitoso.
6. Para un cambio incompatible, describir consumidores afectados y acordar el orden de
   despliegue, la transición y, si hace falta, una versión nueva. Preferir ampliaciones
   compatibles que permitan actualizar frontend y backend por separado.

Se conserva `/api/v1/`, el formato de errores y la paginación definidos en el contrato.
El backend aplica permisos y validaciones aunque el frontend también valide formularios.
La persistencia implementa las interfaces existentes y se registra en
`backend/config/bindings.py`. No introducir endpoints o campos alternativos unilateralmente.

## Desarrollo del frontend

- Reutilizar `src/services/apiClient.js`; colocar servicios, páginas y componentes
  específicos dentro de `src/features/<modulo>/`.
- Coordinar cambios en `router.jsx`, layouts, estilos globales, cliente HTTP,
  `package.json`, `package-lock.json` y `vite.config.js` porque afectan varias funcionalidades.
- Delimitar estilos de módulo para evitar que alteren otras pantallas. Reutilizar los
  componentes comunes cuando corresponda y conservar el diseño de referencia acordado.
- Los datos de demostración deben estar identificados y separados de los datos reales.
  No reemplazar silenciosamente un resultado vacío válido por datos de ejemplo ni usar
  `localStorage` como persistencia del catálogo. Los favoritos pueden seguir siendo locales.
- Contemplar carga, vacío, error, falta de autorización e imágenes no disponibles.
  Verificar escritorio, móvil, teclado y navegación directa a rutas internas.

## Ramas y sincronización

- Frontend completo: Leo, Geo y Jennifer, junto con Pablo para Administrador, trabajan
  **todos en frontend-dev**. Backend completo: Juan, Pablo y Henry trabajan
  **todos en backend-dev**. No crear ramas personales ni alternativas por módulo.
- develop integra los avances revisados de las dos ramas compartidas. main permanece
  para versiones estables. No hacer trabajo diario directamente en esas dos ramas.
- Antes de empezar y antes de publicar: fetch, leer commits y diff de los compañeros,
  sincronizar con merge y validar el resultado. Si un compañero publicó mientras se
  hacía push, volver a revisar e integrar; nunca forzar el push ni hacer rebase.
- Usar mensajes convencionales para commits y merges. Conservar trabajo propio y
  ajeno al cambiar de rama o resolver conflictos; no usar reset --hard ni git clean.
- Revisar [el procedimiento completo y activar los hooks](TRABAJO-EN-EQUIPO.md).

Los informes de ramas anteriores documentan la historia; no autorizan a volver a
crear ramas feature/fix/personales. La integración previa ya se consolidó en develop.

## Commits, PR y validación

Usar Conventional Commits de alcance claro, con un título que explique el cambio y una descripción
cuando sea necesario. Ejemplos: `feat: agregar detalle de propiedades`,
`fix: validar fecha de visita` y `docs: actualizar contrato de medios`.

Para integrar trabajo, abrir un PR hacia `develop` que indique:

- Qué problema resuelve y qué módulos modifica.
- Contratos modificados, dependencias y pendientes de integración.
- Pruebas ejecutadas y resultado; capturas cuando cambie la interfaz visual.
- Variables nuevas mediante `.env.example`, migraciones o pasos de despliegue necesarios.

Se propone al menos una revisión de otro integrante; si cambia el contrato, coordinar
una revisión entre backend y frontend. Es un acuerdo de colaboración, no una restricción
técnica de acceso ni una protección de rama configurada por este documento.

Comprobaciones antes de integrar cambios que afecten código:

| Área | Comprobaciones |
| --- | --- |
| Backend | `manage.py check`; pruebas de comportamiento afectado; regeneración y validación de OpenAPI si cambia la API. |
| Frontend | `npm ci`, `npm test`, `npm run lint`, `npm run build`; revisión de las pantallas afectadas. |
| Integración | Peticiones y respuestas según contrato, permisos, errores y flujo real afectado; indicar explícitamente lo que siga pendiente. |
| Solo documentación | Rutas y enlaces correctos, comandos coherentes y ausencia de contradicciones con el código. |

Un build correcto no sustituye la prueba funcional. No declarar persistencia, subidas,
autenticación o despliegues completos si solamente existe el contrato o una demostración.

## Acuerdos de datos vigentes

- Los videos son únicamente enlaces de YouTube; no se almacenan archivos de video.
- Las redes sociales se representan con filas de `red_social`, no con columnas fijas.
- Los favoritos permanecen en el frontend (`localStorage`).
- La auditoría administrativa se registra en `historial_actividad` y los mensajes atendidos
  conservan su fila en `mensaje_contacto`, actualizando su estado.
- El proveedor para fotos y renders está pendiente; Cloudflare R2 es una propuesta, no una decisión.

## Cambios en los acuerdos

Todo está sujeto a cambios. Proponer el ajuste en un issue o PR, explicar motivo e impacto,
coordinar con las personas afectadas y actualizar estos documentos junto con el cambio.
Completar “Pendiente 1” y “Pendiente 2” cuando se conozcan los usuarios, sin bloquear el
desarrollo actual. La infraestructura se describe como [propuesta](infraestructura.md),
no como un despliegue ya realizado.
