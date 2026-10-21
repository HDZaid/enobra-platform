# Trabajo del equipo EnObra

Leer [docs/TRABAJO-EN-EQUIPO.md](docs/TRABAJO-EN-EQUIPO.md) antes de modificar código.
Estas reglas sustituyen recomendaciones antiguas de crear ramas por módulo.

- Frontend: Leo, Geo y Jennifer (solicitante), en `frontend-dev`.
- Backend: Juan, Pablo y Henry, en `backend-dev`.
- Pablo también está autorizado a colaborar en frontend: sus cambios de interfaz van
  en `frontend-dev`, a cargo del Administrador del frontend y coordinado con Jennifer.
  Conservar la base de login, noticias, mensajes y permisos ya integrada.
- Para Juan, Henry u otro colaborador sin autorización de frontend, emitir una
  advertencia antes de modificar `frontend/` y coordinar el alcance. No asumir que
  cualquier solicitud proviene de Pablo. Una autorización explícita del usuario
  para colaboración o administración del repositorio prevalece sobre este reparto.
- Usar la rama compartida correspondiente. No crear ramas personales, temporales,
  de feature, fix ni worktrees para este flujo. `develop` integra avances revisados;
  `main` conserva versiones estables. La administración expresamente solicitada por
  el usuario puede actualizar documentación y configurar las ramas desde develop.
- Antes de trabajar y antes de publicar: comprobar árbol limpio, fetch, revisar el
  log y diff de los cambios remotos de compañeros, y sincronizar mediante merge.
  Antes de cambiar de rama, conservar los cambios propios; no tocar los de otros.
- Emplear Conventional Commits, incluidos los merges. No force-push, rebase de ramas
  compartidas, reset --hard, ni borrado de cambios para resolver conflictos.
- Conservar cambios de todos, coordinar archivos compartidos, revisar contratos y
  ejecutar las comprobaciones del área modificada antes de hacer push normal.
- Activar los hooks compartidos con `git config core.hooksPath .githooks` si el clon
  no tiene hooks previos personalizados; si los tiene, coordinarlos sin sobrescribirlos.
  Son avisos/validación local, no autenticación ni permisos de GitHub.
