# INT-01: integración del frontend

24 de octubre de 2026, Guatemala. Integración técnica de frontend completada;
aceptación funcional conjunta pendiente de INT-02/03/04.

Se integró `frontend-dev` en `develop` preservando sus commits y autores:
- Origen revisado: `1ecb60a`.
- Base remota de develop: `4e6e959`.
- Merge sin conflictos: `9c4f706`.

Incluye Proyectos, Bienes Raíces, Noticias, Mensajes, Roles, Usuarios, Papelera,
Historial y el kit de UI/subidas. No se modificaron los archivos de backend frente
a la base de develop. No se fusionó backend-dev, no se regeneró OpenAPI ni se
modificó main. Se conservan las ramas compartidas; esta integración no autoriza
borrarlas. Los informes de limpiezas anteriores son históricos.

## Evidencia

- Lint aprobado, 181 pruebas aprobadas y build aprobado.
- Se comprobó que frontend/ del merge es idéntico al origen validado, por lo que
  los resultados corresponden al mismo código integrado.
- Vite informa un bundle principal de 533.61 kB (158.89 kB gzip). Es una advertencia
  de rendimiento; la división de código puede abordarse después sin mezclarla aquí.
- Chromium, API simulada: ocho perfiles, botones por permiso, conteos y guardado
  sin cambiar publicación (`frontend/tests/browser/admin-permissions.cjs`).
- Chromium, Django real con SQLite/medios temporales: crear proyecto con dos fotos,
  reordenar, verificar sitio público, editar conservando slug, despublicar, editar
  borrador, cancelar salida con cambios y formulario móvil de 390 px
  (`frontend/tests/browser/admin-projects.cjs`, adaptador temporal del runner aislado).
- Sin operaciones contra Supabase. Las pruebas anteriores no certifican roles de
  Supabase ni reemplazan el recorrido integrado de todos los módulos.

## Pendientes para cierre de entrega

1. Henry: INT-02, integrar backend-dev (permisos, papelera, historial, usuarios,
   fábricas y protecciones), ejecutar sus comprobaciones sobre el merge.
2. Henry: INT-03, regenerar y validar OpenAPI tras la integración del backend.
3. Geo y Leo: INT-04, matriz por Ingeniero/Arquitecta/Empleado de todos los flujos,
   incluida subida de imágenes, papelera, restauración, borrado y roles.
4. Jennifer: verificar Proyectos con ese backend; `PROJECT_TRASH_ENABLED` sigue
   false para evitar usar DELETE definitivo del backend anterior. Activarlo solo
   después de comprobar el flujo restaurable en el entorno integrado.
5. Geo: INT-05, consolidar reportes y tablero. Hay casillas históricas pendientes
   aunque existan implementaciones; no se certificaron tareas ajenas por su commit.

FE-08/09 permanecen en backlog. Las tablas propuestas de imágenes y el almacenamiento
persistente no forman parte de esta integración. No se acredita despliegue ni cierre
funcional de toda la entrega con este merge técnico.
