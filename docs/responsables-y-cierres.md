# Responsables y condiciones de cierre

<!-- enobra-documentacion-vigente -->
> Guía vigente. Revisión documental: 17-nov-2026.
> [Base y límites técnicos](BASE-DOCUMENTACION-TECNICA.md). Las evidencias no se reinterpretan como nuevas ejecuciones.
<!-- /enobra-documentacion-vigente -->
> Estado final del 29-oct: [limpieza diaria activa](P02-limpieza-activa.md) en GitHub Actions, gratuita para este repo público. Simulación y ejecución real aprobadas (0 publicaciones vencidas). P-02 y su automatización están completas. La tarea programada se mantiene en GitHub Actions. Mantenimiento: Pablo, respaldo Juan.

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
| Limpieza de papelera P-02 tras más de 90 días | Pablo; el agente de Geovanny ejecuta el cambio autorizado | Juan | Retirar función SQL antigua, implementar limpieza en backend con historial y probarla; Programación y ejecución verificadas en GitHub Actions; mantener la cuenta técnica y los secretos. Véase [P-02](P02-limpieza-activa.md). |
| Cuentas permanentes de la aplicación | Pablo | Juan | Geovanny identifica titulares y roles; quien tenga acceso crea cuentas y verifica login/permisos. Los roles ya existen. |
| Despliegue, imágenes persistentes y correo | Juan | Pablo | Geovanny confirma destino/proveedor y acceso; registrar URL, versión, imagen recuperable tras reinicio/despliegue y prueba de correo. Cerrar cada comprobación por separado. |
| Pruebas en URL desplegada | Geovanny y Leo | Jenny para interfaz; Juan para API | Resultado por rol y versión. Las 70/70 pruebas previas usaron API local y Supabase real: no acreditan despliegue ni participación de Leo. |
| Actualizar estado e issues | Autor de cada tarea o su agente | Geovanny | Fecha, commit/URL, resultado y límites; no requiere esperar a Henry. |
| Preparación de producción BE-14 | Pablo y Juan | Henry | Perfil, despliegue y lecturas HTTPS comprobados. El recorrido autenticado se registra por separado. Ver [informe](Render-validacion-2026-11-03.md). |

`config/*`, `access_policy.py` y `docs/openapi.yaml` dejan de ser exclusivos de Henry.
Los cambios funcionales respetan RBAC; delegar trabajo no concede privilegios a
usuarios de la aplicación. OpenAPI se genera una vez por cambio de contrato con
`--validate --fail-on-warn`. Trabajar en la rama del área e integrar revisiones en
develop; main conserva versiones estables. No esperar tareas vecinas sin una
dependencia técnica concreta. No reabrir BE-00/01/02/03/05/11 ni P-01 por textos históricos.

## Verificaciones pendientes de evidencia

- Panel: registrar el recorrido autenticado por rol y la subida/publicación
  desde las URL desplegadas. El sitio y la API respondieron el 17-nov.
- Imágenes: R2 privado y persistencia de una imagen comprobados. La recuperación
  de cuatro originales quedó aplazada.
- Correo: confirmar remitente, proveedor y buzón y acreditar recepción de una
  consulta. Ver [estado](estado-proyecto.md).

## Transferencia a una organización: descartada para la entrega

Geovanny retiró esta tarea el 29-oct. Se conserva el repositorio personal actual y
los accesos existentes. No pedir una organización ni nuevos Admin para trabajar,
integrar o completar producción. Esto sustituye las instrucciones anteriores de
transferencia. No hubo cambios de propietario ni permisos en esta sesión.

## Cuentas definitivas y manual técnico

El usuario definirá los correos de Admin e Ingeniero. La política vigente trata
Ingeniero como alias de Administrador. Revisar las relaciones del historial y
el actor técnico de P-02 antes de una depuración. La base y el inventario
vigentes reúnen las fuentes para redactar el manual.
