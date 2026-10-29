# BE-04: papelera y limpieza SQL de proyectos

> Estado vigente, 29-oct: [P-02 y papelera de 90 días](P02-papelera-90-dias.md). P-01 cerrado; función SQL antigua retirada de Supabase y ausencia verificada. La nueva limpieza corre desde el backend después de más de 90 días en papelera. Código y pruebas listos; falta activar/verificar el Cron Job en Render (Juan, respaldo Pablo). Los bloqueos anteriores por decidir P-01/P-02 y las políticas de inactividad de 3/8 meses quedan sustituidos. Jenny puede validar la habilitación del frontend con la versión integrada; no requiere otro OK de Henry.

> Actualización del 26 de octubre de 2026: P-01/P-02 de la issue #16 sustituyen
> la propuesta de conservar actividad y marcas al restaurar descrita en este
> informe histórico. Crear, editar y restaurar actualizan actividad; restaurar
> reinicia las marcas SQL. La función debe permanecer sin ejecutar hasta resolver
> su compatibilidad. Véase [decisiones de Pablo](decisiones-pablo-issue-16.md).
> Esto no acredita desactivación ni validación de la función real en Supabase.

Fecha: 23 de octubre de 2026 (Guatemala). Rama: `backend-dev`.
Estado: lógica local implementada y probada; integración y convivencia SQL pendientes.

## Alcance y evidencia

Se conservaron los cambios locales de BE-04 que ya estaban presentes al iniciar:
`persistence/catalog.py`, interfaces, vistas y URLs de proyectos, app publications
y pruebas. Esta revisión añadió cuatro pruebas de compatibilidad, relaciones y
atomicidad en `backend/tests/test_trash.py`, y corrigió el texto del esquema de la
vista unificada. No se atribuye la implementación previa a esta revisión.

Se leyeron el plan maestro (§6.2, DEC-04/05/07/08), la ficha BE-04 del plan backend
y las reglas del equipo. `git fetch origin` terminó correctamente; el log y diff
`HEAD..origin/backend-dev` estaban vacíos. No se hizo merge porque el árbol ya tenía
cambios locales; no se hicieron commits, push ni cambios de rama. No se alteraron
los planes, configuración, catálogo RBAC, frontend ni el informe BE-10 previo.

El comportamiento de `public.limpiar_proyectos_inactivos()` se analiza según la
descripción aportada por el solicitante: tres meses de inactividad para marcar,
30 días antes de poder borrar, solo proyectos no publicados y no destacados,
sin consultar el JSON de papelera. No se leyó ni ejecutó su cuerpo, ni se certifican
sus detalles de fechas, auditoría interna, seguridad o ejecución concurrente.
Que pg_cron esté disponible pero no instalado no demuestra ausencia de llamadas
manuales, programadores externos u otros invocadores.

## Compatibilidad y conflictos

Hay dos ciclos independientes: BE-04 usa `admin.projects.<pk>` en
`contenido_pagina`, con `trash.trashed_at`, `trashed_by` y `was_published`;
SQL usa `estado_limpieza`, `fecha_ultima_actividad` y
`fecha_marcado_eliminacion`. El identificador público sigue siendo el slug.

| Situación | Consecuencia actual |
| --- | --- |
| SQL marca un proyecto sin JSON de papelera | No aparece en la papelera de BE-04; sigue siendo un borrador normal para el administrador. No se convierte automáticamente en borrado lógico. |
| BE-04 envía un proyecto antiguo a papelera | Lo despublica; si no está destacado podría cumplir las condiciones SQL. El plazo SQL no empieza necesariamente en `trashed_at` y podría vencer antes de los 30 días desde el borrado lógico. |
| Restauración de un proyecto antes publicado | Recupera `was_published=true`; según las condiciones descritas deja de ser candidato mientras siga publicado, pero no se reconcilia su marca SQL. |
| Restauración de un borrador antiguo | Recupera `published=false`; conserva actividad y marca SQL, por lo que podría eliminarse en una llamada posterior. |
| SQL elimina una fila con JSON de papelera | El JSON queda potencialmente huérfano; el listado no lo muestra porque exige fila existente. Restaurar o borrar definitivamente devuelve 404. No se puede reconstruir el proyecto desde ese JSON. |
| API y SQL compiten por una fila | La API usa transacciones y bloqueo de fila; eso no impone una política común a llamadas SQL posteriores. SQLite no acredita concurrencia PostgreSQL. |

La API registra `PAPELERA`, `RESTAURAR` y `ELIMINAR_PERMANENTE` con módulo
`projects`, id numérico y título. Auditoría, JSON y operación de negocio comparten
transacción. Un fallo de escritura revierte todo. El historial no tiene FK al
proyecto y sobrevive a su eliminación. `audit()` requiere un actor existente;
no se crea una identidad automática ni un actor ficticio para la función SQL.
Un DELETE SQL no atraviesa este helper; no puede garantizarse la misma auditoría
sin revisar y acordar el mecanismo de base de datos. No se inventan eventos a
posteriori ni se limpia JSON huérfano automáticamente.

## Claves foráneas reales: comprobación de solo lectura

Se consultó `pg_constraint` para **todas las FK entrantes a public.proyecto** y
`pg_trigger` para triggers de usuario de esa tabla. La transacción empleó
`SET TRANSACTION READ ONLY`, confirmado por `SHOW transaction_read_only = on`,
y `statement_timeout` de 10 segundos. No se consultaron filas de negocio.

| Tabla / constraint | Definición encontrada | Efecto de eliminar físicamente |
| --- | --- | --- |
| `proyecto_video` / `fk_proyecto_video_proyecto` | `FOREIGN KEY (id_proyecto) REFERENCES proyecto(id_proyecto) ON DELETE CASCADE` | Elimina también los registros de videos. |
| `mensaje_contacto` / `fk_mensaje_proyecto` | `FOREIGN KEY (id_proyecto) REFERENCES proyecto(id_proyecto) ON DELETE SET NULL` | Conserva el mensaje, pierde el vínculo al proyecto. |

No se encontraron otras FK entrantes ni triggers de usuario sobre `proyecto`
en esta consulta. Esas dos relaciones coinciden con los modelos Django
(`CASCADE` y `SET_NULL` respectivamente). Las FK salientes de proyecto hacia
categoría/usuarios no eliminan esas entidades al borrar el proyecto.
`contenido_pagina` enlaza por clave textual e `historial_actividad.id_registro`
es un entero sin FK: no reciben limpieza en cascada del DELETE SQL.
No se garantiza ausencia de referencias informales, archivos externos, políticas
RLS o lógica dentro de la función. No se borraron proyectos para validar estas FK.

## Integración propuesta y decisiones para Henry

1. Conservar DEC-05: papelera manual exclusivamente en JSON; no escribir ni
   reinterpretar los tres campos de limpieza desde BE-04. Mantener Noticias con
   borrado directo (DEC-04). No instalar pg_cron ni introducir tareas programadas.
2. Henry debe completar BE-00: registrar `apps.publications.urls` en
   `config/urls.py` y el registro de app que corresponda, sin duplicar las rutas.
   Actualmente la URL unificada solo está montada en el URLConf de pruebas.
   Regenerar OpenAPI es responsabilidad de Henry; no se modificó el artefacto.
3. Henry debe completar BE-01/02: catálogo/roles de proyectos y permisos finos de
   creación, edición y DELETE (propio/cualquiera). Las nuevas vistas de papelera
   ya verifican permisos por tipo y filtran propietario; sus pruebas usan
   `Principal` con permisos explícitos. Eso no acredita los roles reales.
4. Henry toma BE-05 después de BE-04: reemplazar el mapa explícito de repositorios
   de la vista unificada por fábricas. No adelantar esa arquitectura aquí.
   La carrera de autorización de borradores de BE-06b sigue con Pablo.
5. Henry + Juan + Ingeniero deben acordar si la limpieza automática se limita a
   borradores abandonados fuera de papelera o si se integra a una política común
   de retención. Acordar prioridad de restauración, reinicio de marcas/actividad,
   plazo de recuperación y tratamiento de proyectos destacados. Cualquier cambio
   de función o campos nativos exige aprobación posterior según DEC-05.
6. Antes de habilitar automatismos, acordar auditoría del actor de sistema,
   eliminación de videos, conservación de consultas, metadatos huérfanos y
   semántica de errores/concurrencia. Verificar invocadores existentes sin asumir
   que la ausencia de pg_cron desactiva la función. La coexistencia segura queda
   bloqueada hasta esa decisión; BE-04 no ofrece inmunidad frente al SQL actual.

Esta lista es documentación de coordinación; no se enviaron mensajes a Henry.

## Verificación y estado de BE-04

- Suite completa aislada: `python -B manage.py test tests --settings=config.test_settings`:
  **72 pruebas aprobadas**, sin incidencias de system check.
- Las pruebas de papelera cubren ciclo de proyectos publicados/borradores,
  preservación de propiedades y noticias, contrato unificado, permisos por tipo
  y propietario, paginación, exclusión pública/admin y de años, metadatos inválidos,
  y consultas constantes (una para metadatos, cinco para listado con 1 y 4 filas).
- Las cuatro pruebas añadidas verifican que no se reconcilian campos SQL,
  cascada de videos y mensajes conservados, rollback completo si falla el DELETE,
  y respuesta ante fila ausente con JSON huérfano. La simulación de ausencia usa
  únicamente SQLite en memoria; nunca llama a la función SQL.
- Estas pruebas no validan ejecución de la función, plazos reales, concurrencia
  PostgreSQL, roles de Supabase ni el endpoint unificado en el URLConf normal.

**Completo localmente:** repositorio genérico, métodos/interfaz de proyectos,
rutas de proyectos, vista unificada preparada, auditoría transaccional y pruebas.
**Pendiente/bloqueado para cierre integrado:** registro BE-00, permisos/roles
BE-01/02, OpenAPI por Henry y decisión de convivencia con limpieza automática.
No se marca BE-04 globalmente terminada en el tablero.

No se modificó, ejecutó ni eliminó la función; no se instaló pg_cron, no se
ejecutaron migraciones, seeds ni escrituras en datos reales.
