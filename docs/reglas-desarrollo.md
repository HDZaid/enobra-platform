# Reglas de desarrollo

Estado: acuerdos iniciales revisables. Fecha: 12 de octubre de 2026.

Somos seis integrantes: tres de backend y tres de frontend. Trabajamos mediante
contratos para poder avanzar en paralelo. Responsables, distribución, ramas,
infraestructura y estas reglas pueden cambiar por acuerdo del equipo; cualquier
ajuste se documenta en el PR correspondiente.

## Equipo y coordinación

Los usuarios de GitHub identifican a las personas responsables de coordinar cada área.
La asignación no es exclusiva ni restringe quién puede contribuir: cualquier integrante
puede apoyar otro módulo, avisando y coordinando los cambios compartidos.

| Área | Integrante / usuario de GitHub | Responsabilidad inicial |
| --- | --- | --- |
| Frontend | Leo — [@Leonor-Rosales](https://github.com/Leonor-Rosales) | Inicio, Nosotros, Servicios y layout público. |
| Frontend | Geo — [@g4usSi](https://github.com/g4usSi) | Proyectos, Bienes raíces y sus detalles. |
| Frontend | Jennifer — [@Jeidy25Saquic](https://github.com/Jeidy25Saquic) | Noticias, Contacto, base del panel y autenticación del cliente. |
| Backend | Henry — [@HDZaid](https://github.com/HDZaid) | Contratos/API existentes; reparto de módulos backend por acordar. |
| Backend | Pendiente 1 | Usuario y módulos por confirmar. |
| Backend | Pendiente 2 | Usuario y módulos por confirmar. |

Los tres integrantes del frontend implementan también los formularios administrativos
de sus propios módulos. El panel, la navegación, la sesión y los componentes comunes
se coordinan entre los tres. El equipo backend acordará gradualmente el reparto de
autenticación, persistencia, módulos de negocio y almacenamiento de medios.

Esta tabla no crea restricciones de GitHub, permisos por carpeta ni aprobaciones
obligatorias de una persona específica.

## Organización del repositorio

- `backend/`: Django, configuración, contratos, validaciones, permisos y futuras
  implementaciones de persistencia. Los comandos de Django se ejecutan desde aquí.
- `frontend/`: React, rutas, componentes, estilos, servicios HTTP y pruebas del cliente.
- `docs/`: contratos y acuerdos compartidos; cada aplicación conserva su README técnico.
- Entornos virtuales, `node_modules`, archivos `.env`, builds y credenciales son locales
  o del proveedor de despliegue y no se versionan. Se versionan los `.env.example`,
  el lockfile de npm y las migraciones cuando se incorpore la base de datos.

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

- `develop` es la base de integración y de nuevas ramas de trabajo.
- `main` se reserva como propuesta para versiones estables. Actualizar ramas de trabajo
  no implica publicar una versión ni incorporar automáticamente `develop` en `main`.
- Se conservan las ramas existentes. Para trabajo nuevo se sugieren nombres descriptivos
  como `feature/<modulo>`, `fix/<problema>` o `docs/<tema>`; no se renombra trabajo en curso
  solo para ajustarlo a una convención.
- `frontend-dev` es una rama compartida existente, no otra fuente del contrato. Si el
  equipo la sigue usando, debe recibir `develop` y sus cambios se revisan antes de integrarlos.
- Sincronizar con merge para preservar el historial compartido. No sobrescribir ramas
  de otras personas, forzar pushes ni resolver conflictos descartando un lado completo.

Ejemplo desde una rama de trabajo con el árbol limpio:

```powershell
git fetch origin
git merge origin/develop
# Resolver conflictos y ejecutar las comprobaciones de lo afectado.
git push origin HEAD
```

Antes de cambiar de rama, guardar el trabajo propio en un commit o stash identificado.
No aplicar ni borrar stashes de otros trabajos durante una sincronización.
Actualizar una rama con `develop` conserva sus avances, pero no integra esos avances
de vuelta en `develop`; eso se realiza mediante su PR.

### Situación observada en las ramas actuales

La separación de Django a `backend/` puede incorporarse a las ramas de frontend sin
conflictos textuales en el estado revisado. Esto no garantiza que las funcionalidades
se puedan combinar entre sí sin revisión.

La comparación del avance `b9289dd` (`frontend-dev` y `feature/projects-&-real-estates`)
con `530a7f9` (`feature/news-admin-contact`) presenta un conflicto en
`frontend/src/app/router.jsx`. Al integrar esos avances, conservar las rutas de ambas
funcionalidades, revisar imports, layouts y dependencias, y probar la navegación completa.
Este conflicto corresponde a la futura integración entre funcionalidades, no a la
sincronización individual con `develop`.

## Commits, PR y validación

Hacer commits de alcance claro, con un título que explique el cambio y una descripción
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

## Cambios en los acuerdos

Todo está sujeto a cambios. Proponer el ajuste en un issue o PR, explicar motivo e impacto,
coordinar con las personas afectadas y actualizar estos documentos junto con el cambio.
Completar “Pendiente 1” y “Pendiente 2” cuando se conozcan los usuarios, sin bloquear el
desarrollo actual. La infraestructura se describe como [propuesta](infraestructura.md),
no como un despliegue ya realizado.
