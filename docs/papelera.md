# Papelera de proyectos y propiedades

<!-- enobra-documentacion-vigente -->
> Guía vigente. Revisión documental: 3-nov-2026.
> [Base y límites técnicos](BASE-DOCUMENTACION-TECNICA.md). Las evidencias no se reinterpretan como nuevas ejecuciones.
<!-- /enobra-documentacion-vigente -->
Implementación vigente en CatalogRepository y kits de publicaciones; rutas en
apps/publications y endpoints por módulo. [OpenAPI](openapi.yaml),
[roles fijos](politica-roles-fijos.md) y [limpieza activa](P02-limpieza-activa.md).
Noticias mantiene eliminación directa y no participa en la papelera unificada.

## Estados y transiciones

| Estado y operación | Resultado |
| --- | --- |
| Publicar/despublicar contenido activo | Cambia publicado según permiso; no altera el plazo de una papelera inexistente. |
| DELETE autorizado de proyecto/propiedad | Conserva fila; publicado=False y metadatos trash con estado previo. |
| Restaurar desde papelera | Recupera was_published, conserva imágenes/slug y retira trash. |
| Eliminar permanentemente desde papelera | Borra fila y metadatos; registra ELIMINAR_PERMANENTE. No es restaurable por API. |

Los listados normales públicos/administrativos excluyen papelera, incluidos años
de proyectos. Restaurar o eliminar un ID ausente/fuera de papelera devuelve 404.
Las transiciones exitosas de restauración devuelven el registro; comprobar códigos
y campos completos por endpoint en OpenAPI. Guardar y restaurar requieren permisos.

## Datos y transacciones

Los JSON de admin.projects.<id> y admin.properties.<id> viven en contenido_pagina.
El slug HTTP no es la clave primaria usada por los metadatos. trash conserva
trashed_at (fecha con zona), trashed_by y was_published junto al resto del contenido.
No se guardan bytes de imágenes dentro de esos JSON.

Cambios de negocio, metadatos e historial se realizan en una transacción, con
bloqueos/recomprobaciones del estado. Un fallo de auditoría revierte el borrado.
El evento conserva referencias y texto; no es una copia íntegra para recuperar
registros eliminados. SQL externo no pasa automáticamente por esos controles.

## API y permisos

GET admin/trash/ permite listado unificado. Cada tipo ofrece admin/projects/trash/
o admin/properties/trash/, POST <id>/restore/ y DELETE <id>/permanent/.
Administrador puede borrar definitivamente; Arquitecto enviar/restaurar;
Empleado no tiene acceso a papelera. La autorización de propiedad/acción se
resuelve en Django, no a partir de un rol enviado por el navegador.

## Retención de más de noventa días

P-02 usa trash.trashed_at, no fecha de creación ni última edición. Exactamente 90
días aún se conserva. Fechas inválidas o sin zona no se purgan. Restaurar cancela
la candidatura; reenviar inicia otro plazo. El comando bloquea y vuelve a comprobar
cada candidato antes de eliminar, atribuyendo actor y motivo en el historial.

El workflow diario de GitHub Actions es la programación existente; no activar
render-cleanup.yaml ni otro Cron Job. La función SQL antigua fue retirada y su
copia en docs/sql/archive es material histórico no ejecutable por esta guía.
La evidencia de ejecución y el SHA fijado están en P02-limpieza-activa.md.

## Imágenes y límites

Enviar/restaurar conserva referencias. El borrado definitivo de una publicación
no debe destruir un archivo compartido por otras publicaciones. MediaStorage
rechaza borrar un medio referenciado, incluidos borradores/papelera. Esto no
implementa un recolector automático de archivos huérfanos; sigue siendo trabajo
separado. R2 privado y controles de entrega: [guía R2](R2-configuracion.md).

Pruebas de papelera, retención, permisos y rollback forman parte de las 238 pruebas
backend aisladas. Las pruebas locales no acreditan concurrencia de PostgreSQL ni
un recorrido de borrado desde el panel desplegado. No usar datos reales para
reproducir eliminación definitiva sin alcance previamente autorizado.
