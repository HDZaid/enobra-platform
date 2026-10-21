# Reglas obligatorias de trabajo compartido

Acuerdo del equipo, actualizado el 21 de octubre de 2026. Se mantienen solamente dos
ramas de trabajo, ambas creadas desde el develop con la integración actual.

## Personas y ramas

| Equipo | Integrantes | Rama compartida | Área |
| --- | --- | --- | --- |
| Frontend | Leo, Geo y Jennifer (solicitante) | `frontend-dev` | `frontend/` |
| Backend | Juan, Pablo y Henry | `backend-dev` | `backend/` |
| Colaboración autorizada | Pablo también participa en frontend | `frontend-dev` para interfaz; `backend-dev` para backend | Panel Administrador del frontend, coordinado con Jennifer y conservando sus módulos existentes. |

**Todo el equipo de cada área trabaja en la misma rama que le corresponde. No crear
ramas alternas**, personales, por integrante, módulo, feature, fix, integración o
respaldo. No hacer worktrees para eludir ese acuerdo. No borrar ni recrear las ramas
compartidas por cuenta propia. Las ramas retiradas de la entrega anterior son historia;
estas dos nuevas ramas compartidas comienzan desde la integración vigente de develop.

`develop` recibe los avances de ambos equipos mediante integración revisada.
`main` se reserva para versiones estables; no publicar ahí el trabajo diario.

## Advertencia para cambios de frontend

**Juan, Henry y cualquier integrante sin participación autorizada en frontend: antes
de tocar `frontend/`, deténganse y coordinen el cambio con el equipo frontend.**
Pablo es la excepción expresamente autorizada: trabaja su parte de interfaz desde
`frontend-dev`, sin mezclarla con commits de backend-dev. Su módulo asignado es el **Administrador del frontend**. Debe coordinar con Jennifer
y conservar la base de login, noticias, mensajes y permisos ya integrada. No reemplazar
el trabajo existente sin revisar y acordar los cambios.

Avisar en la coordinación habitual qué módulo se va a tocar, motivo y archivos
compartidos afectados. Leer los cambios ya publicados. No cambiar router, layouts,
estilos globales, apiClient, contratos o dependencias sin revisar sus consumidores.
Los cambios de backend se coordinan con Juan, Pablo y Henry y se realizan en backend-dev.
Documentación compartida puede acompañar la rama del área afectada.

## Sincronizar antes de empezar: siempre revisar a los compañeros

Desde un árbol limpio, frontend utiliza:

```bash
git status --short
git fetch --prune origin
git switch frontend-dev
git log --oneline HEAD..origin/frontend-dev
git diff --stat HEAD..origin/frontend-dev
git diff HEAD..origin/frontend-dev
git merge origin/frontend-dev -m "merge(frontend): sincronizar cambios del equipo"
```

Backend utiliza lo mismo reemplazando frontend-dev por backend-dev y el mensaje por
`merge(backend): sincronizar cambios del equipo`. Si la rama ya tiene seguimiento,
se usa la local existente. Si es el primer uso, `git switch` toma la rama remota
existente; no inventar otro nombre. Para Pablo, elegir la rama según el área del cambio.

**No basta con descargar:** leer commits y diff, entender qué cambió y verificar si
modifica el módulo que se va a trabajar. Si no está claro, coordinar con el compañero
antes de editar. Si hay cambios locales, conservarlos primero mediante un commit
propio revisado; no descartar archivos ni mover cambios ajenos a otra rama.

## Commits convencionales y cambios pequeños

Usar `tipo(alcance): descripción`, por ejemplo:

```text
feat(frontend): agregar filtro de noticias
fix(backend): validar correo de contacto
test(frontend): verificar formulario de visita
docs(equipo): actualizar pendientes de catálogos
merge(backend): sincronizar cambios del equipo
```

Tipos permitidos por el hook: feat, fix, docs, style, refactor, perf, test, build,
ci, chore, revert y merge. Alcance opcional; `!` indica un cambio incompatible y
requiere explicarlo en el cuerpo del commit. No hacer commits vacíos o mezclar
cambios ajenos para conseguir un push. Revisar `git diff` y `git diff --cached`.

## Sincronizar otra vez antes de publicar

Después del commit propio y con el árbol limpio:

1. Ejecutar `git fetch --prune origin`.
2. Leer `git log --oneline HEAD..origin/<rama-del-equipo>` y el diff con esa rama.
3. Integrar los cambios del compañero mediante merge con mensaje convencional.
   No resolver conflictos borrando una de las dos contribuciones completas.
4. Ejecutar las pruebas del área y revisar el resultado unido.
5. Publicar con `git push origin frontend-dev` o `git push origin backend-dev`.
6. Si el push es rechazado porque alguien publicó mientras tanto, repetir la revisión
   y sincronización. **Nunca forzar el push ni hacer rebase de la rama compartida.**

No usar `git reset --hard`, `git clean` o borrados de archivos para quitar cambios de
compañeros. No crear una rama alterna para esquivar un conflicto.

## Comprobaciones

- Frontend: `npm --prefix frontend run lint`, `npm --prefix frontend run test` y
  `npm --prefix frontend run build`. Instalar con `npm --prefix frontend ci` cuando
  cambien las dependencias o en un clon nuevo.
- Backend: desde backend, `python manage.py check` y
  `python manage.py test tests --settings=config.test_settings`. Si cambia el contrato,
  regenerar OpenAPI con `--validate --fail-on-warn` y revisar sus consumidores.
- Integración: seguir [integracion-backend-frontend.md](integracion-backend-frontend.md).
  No confundir una prueba local con validación de Supabase o de producción.
- Los catálogos siguen en construcción; mantener documentados los límites reales.

## Avisos y validación local de commits

Cada persona debe activar los hooks de este repositorio en su propio clon:

```bash
git config core.hooksPath .githooks
```

Primero comprobar `git config --get core.hooksPath` y los hooks previos de su clon;
si tiene personalizaciones, coordinarlas en lugar de sobrescribirlas. Git no activa
los hooks de otros clones cuando se hace push. Git Bash incluye el shell requerido.

- pre-commit muestra una advertencia si backend-dev prepara cambios de frontend,
  indicando el reparto y la excepción de Pablo; también avisa del caso inverso.
- commit-msg rechaza asuntos que no sean convencionales, incluidos los merges sin
  mensaje adecuado. El aviso de área no bloquea ni identifica al autor: obliga a
  revisar la coordinación, no convierte Git config en autenticación.
- AGENTS.md expone estas reglas a los asistentes que trabajan en el repositorio.

Estos mecanismos no envían correos o mensajes privados ni cambian permisos de GitHub.
Una restricción real por persona/carpeta requeriría controles adicionales del servidor;
esta entrega establece ramas, instrucciones y avisos locales para el equipo.
