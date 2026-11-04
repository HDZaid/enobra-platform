# P-02: limpieza diaria activa y gratuita

<!-- enobra-documentacion-vigente -->
> Guía vigente. Revisión documental: 3-nov-2026.
> [Base y límites técnicos](BASE-DOCUMENTACION-TECNICA.md). Las evidencias no se reinterpretan como nuevas ejecuciones.
<!-- /enobra-documentacion-vigente -->
Estado verificado el 29 de octubre de 2026. Geovanny eligió GitHub Actions para
evitar el costo de un Cron Job de Render y autorizó guardar la conexión de Supabase
como secreto cifrado y crear una cuenta técnica limitada. No se creó ningún
servicio en Render.

## Resultado y evidencia

- [Simulación aprobada](https://github.com/HDZaid/enobra-platform/actions/runs/40956777269).
- [Ejecución real aprobada](https://github.com/HDZaid/enobra-platform/actions/runs/40956888020):
  **0 Proyectos y 0 Propiedades eliminadas**, porque no había candidatos vencidos.
- Programación diaria: 09:00 UTC, **03:00 de Guatemala**. GitHub puede retrasar el
  inicio; no se promete un borrado en el segundo exacto de cumplir el plazo.
- Workflow en la rama predeterminada main: commit `f41e968`. Solo se añadió la
  configuración de automatización a main; no se adelantó allí la entrega completa.
- El workflow descarga la revisión de backend probada
  `3b126aa3935defe6e79f24c47d1630366408ac6d`. Para actualizar el código ejecutado,
  revisar y probar la nueva versión y cambiar ese SHA en el workflow de main y develop.
- La primera prueba con una referencia corta falló al descargar el código; se
  corrigió a SHA completo y las dos comprobaciones siguientes fueron satisfactorias.

## Acceso y funcionamiento

`.github/workflows/purge-expired-trash.yml` usa ubuntu-latest, permisos de lectura
del repositorio, acciones fijadas por SHA, un máximo de diez minutos y una sola
ejecución de limpieza a la vez. No se ejecuta con eventos de pull request.

Secretos de repositorio configurados: `ENOBRA_DATABASE_URL` y
`ENOBRA_CLEANUP_ACTOR_ID`. Sus valores no se guardan en archivos versionados.
El proceso genera una clave Django temporal; no crea ni utiliza sesiones del panel.
Los colaboradores con escritura pueden usar secretos mediante workflows: revisar
sus cambios antes de ejecutarlos.

La cuenta técnica está activa para atribuir el historial, tiene contraseña
inutilizable y un rol dedicado con únicamente `projects.delete_permanently` y
`properties.delete_permanently`. No tiene admin.all ni permiso para publicar,
restaurar, modificar roles o administrar usuarios. No compartir ni habilitar una
contraseña para esta cuenta.

Para ejecutar a mano: Actions > Limpieza diaria de papelera > Run workflow.
Por defecto solo simula; activar execute aplica el borrado. El horario automático
aplica la limpieza. Solo elimina publicaciones con **más de 90 días en papelera**;
restaurar cancela su candidatura y volver a enviarlas reinicia el plazo. El borrado
y sus metadatos comparten transacción con el historial. No borra archivos compartidos.

## Mantenimiento y cierre

P-02 y la activación operativa están completas. Seguimiento: [issue #19](https://github.com/HDZaid/enobra-platform/issues/19).
Pablo mantiene el backend y el workflow; Juan es respaldo. Jenny puede completar
la habilitación de las acciones de Proyectos y su prueba en frontend sin esperar
una nueva decisión de Henry. Esta automatización no despliega la API web ni activa
la constante PROJECT_TRASH_ENABLED del frontend.

GitHub puede desactivar las programaciones tras 60 días sin actividad en un repo
público. Si ocurre, un colaborador con escritura puede reactivar el workflow.
Revisar Actions ante fallos, rotaciones de la conexión o cambios de permisos de la
cuenta técnica. Si el repo se traslada de dueño u organización, verificar los
secretos y una ejecución. Si pasa a privado, revisar las cuotas gratuitas.

Esta solución usa runners estándar gratuitos para repositorios públicos y no
añade almacenamiento de artifacts ni cache. Fuentes oficiales:
[costo](https://docs.github.com/en/billing/concepts/product-billing/github-actions),
[programación y límites](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows),
[secretos](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets).

## Retirada del SQL y controles de retención

La función public.limpiar_proyectos_inactivos fue retirada con RESTRICT, sin CASCADE
ni borrado de publicaciones reales; consulta posterior confirmó su ausencia.
[Evidencia SQL](qa/P02-funcion-retirada-2026-10-29.json). La copia original en
sql/archive/p02-original-no-ejecutar.sql se conserva como archivo histórico, no
como comando a ejecutar. No activar render-cleanup.yaml.

El plazo se cuenta desde trash.trashed_at. Exactamente noventa días se conserva;
fechas inválidas o sin zona no se purgan. Antes de borrar se bloquea la publicación
y se vuelve a comprobar estado/fecha. Restaurar cancela la candidatura y reenviar
reinicia el plazo. Las pruebas de retención usan datos aislados, no publicaciones
reales borradas para demostrar el comportamiento.

La depuración de cuentas humanas se decidirá después de la exposición. La cuenta
técnica no inicia sesión y mantiene FK de historial/actor del workflow: no suponer
que deba eliminarse junto con cuentas de demostración. No se cambió su configuración.
