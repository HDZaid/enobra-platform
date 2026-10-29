# Responsables y condiciones de cierre

Acuerdo solicitado por Geovanny el 29 de octubre de 2026. Sustituye las restricciones
de responsable único de los planes anteriores; conserva autoría histórica, ramas
compartidas y decisiones funcionales.

## Regla para el equipo y sus agentes

Una asignación indica quién lleva la tarea, no quién puede resolverla exclusivamente.
El responsable o su respaldo puede avanzar, verificar y publicar sin esperar la
aprobación personal de Henry. Coordinar archivos que otro esté modificando. Si falta
acceso, registrar servicio, permiso y quién puede concederlo; no escribir solamente
«depende de Henry». No cerrar una tarea sin evidencia.

| Trabajo | Responsable | Respaldo | Condición de cierre |
| --- | --- | --- | --- |
| Integrar backend; configuración, permisos y OpenAPI | Pablo | Henry; Juan para datos y pruebas | Revisar commits y consumidores, check y pruebas backend; si cambia el contrato, generar OpenAPI con validación. P-01 ya está integrado. |
| Integrar frontend y habilitar papelera de Proyectos | Jenny | Geovanny | Lint, pruebas y build; para habilitar papelera sobre Supabase, cierre técnico P-02 y prueba del recorrido. |
| Limpieza de papelera P-02 tras más de 90 días | Pablo; el agente de Geovanny ejecuta el cambio autorizado | Juan | Retirar función SQL antigua, implementar limpieza en backend con historial y probarla; documentar por separado la programación en el hosting. Véase el informe P-02. |
| Cuentas permanentes de la aplicación | Pablo | Juan | Geovanny identifica titulares y roles; quien tenga acceso crea cuentas y verifica login/permisos. Los roles ya existen. |
| Despliegue, imágenes persistentes y correo | Juan | Pablo | Geovanny confirma destino/proveedor y acceso; registrar URL, versión, imagen recuperable tras reinicio/despliegue y prueba de correo. Cerrar cada comprobación por separado. |
| Pruebas en URL desplegada | Geovanny y Leo | Jenny para interfaz; Juan para API | Resultado por rol y versión. Las 70/70 pruebas previas usaron API local y Supabase real: no acreditan despliegue ni participación de Leo. |
| Actualizar estado e issues | Autor de cada tarea o su agente | Geovanny | Fecha, commit/URL, resultado y límites; no requiere esperar a Henry. |
| Administración de GitHub | HDZaid para transferencia inicial | Administradores de la organización, cuando existan | Transferencia y verificación de Admin para Jenny y Pablo. Aún no realizadas. |

`config/*`, `access_policy.py` y `docs/openapi.yaml` dejan de ser exclusivos de Henry.
Los cambios funcionales respetan RBAC; delegar trabajo no concede privilegios a
usuarios de la aplicación. OpenAPI se genera una vez por cambio de contrato con
`--validate --fail-on-warn`. Trabajar en la rama del área e integrar revisiones en
develop; main conserva versiones estables. No esperar tareas vecinas sin una
dependencia técnica concreta. No reabrir BE-00/01/02/03/05/11 ni P-01 por textos históricos.

## Respuestas que faltan y a qué afectan

- Cuentas: nombres de titulares y rol de cada persona, proporcionados por Geovanny
  por un canal privado; nunca contraseñas ni datos personales en este repo público.
- Despliegue: proveedor, URL y persona con acceso para configurar el servicio.
- Correo: buzón receptor y servicio que enviará las consultas.

No bloquean edición de código, pruebas locales, integración revisada ni documentación.
Una aprobación para P-02 no autoriza borrar otros datos reales o desactivar cuentas.

## Dar administración a Jenny y Pablo

HDZaid es una cuenta personal. GitHub permite propietario y colaboradores en estos
repositorios, no múltiples administradores. La cuenta conectada tiene escritura,
pero no administración. Para compartir administración:

1. Crear una organización del equipo e invitar a los integrantes. Aceptar antes
   del traslado ayuda a conservar las asignaciones de issues.
2. Henry, con HDZaid y permiso para crear repositorios en esa organización, abre
   Settings > General > Danger Zone > Transfer y selecciona la organización.
3. En el repositorio transferido: Settings > Collaborators & teams / Manage access;
   asignar Admin a `Jeidy25Saquic` (Jenny) y `PabloZ7-425` (Pablo).
4. Verificar accesos, asignaciones e integraciones y actualizar origin en los clones.
   Admin de GitHub no concede acceso a Supabase ni al hosting.

Fuentes: [permisos de GitHub](https://docs.github.com/en/get-started/learning-about-github/access-permissions-on-github),
[transferencia](https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository),
[roles de organización](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization).
