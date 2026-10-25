# ADR 0001: Roles en la base de datos; fábrica solo para publicaciones

- **Estado:** aceptada e implementada (BE-01, BE-02, BE-03, BE-05).
- **Fecha:** 25 de octubre de 2026.
- **Responsable:** Henry.
- **Detalle técnico:** [RBAC](../RBAC.md) y [arquitectura](../arquitectura.md).

## Contexto

El ingeniero pidió poder crear roles con permisos distintos (Ingeniero, Arquitecta,
Empleado y los que surjan). Se propuso aplicar el patrón Abstract Factory y decoradores
a los roles, y un compañero advirtió que eso podía generar deuda técnica.

Al revisar el repositorio:

- Ya existían las tablas `rol`, `permiso`, `rol_permiso` y `usuario_rol`, la API de roles y
  un seed, y los permisos se calculaban en cada petición.
- Solo Bienes Raíces usaba permisos finos; los demás módulos exigían `admin.all`.
- Propiedades, Proyectos y Noticias repetían la misma estructura (repositorio, permisos,
  papelera, historial), pero solo Propiedades la tenía completa.

## Decisión

1. **Los permisos viven en código; los roles viven en la base de datos.** Un permiso es
   una acción que el código comprueba, así que su nombre es parte del contrato y se
   define en el catálogo. Un rol es solo un nombre con una lista de permisos: se crea y
   se edita desde el panel, sin desplegar.
2. **Una sola clase de permiso, configurada por vista** (`ResourcePermission` con
   `permission_map`), en lugar de una clase o decorador por rol o por módulo. La vista
   declara qué permiso exige cada método; nunca pregunta por el nombre del rol.
3. **Abstract Factory solo para los tipos de publicación.** Cada tipo tiene una fábrica
   que entrega su kit (repositorio, permisos, papelera, módulo de historial) y un
   registro reúne los kits. De ahí salen el catálogo de permisos, los tipos de la
   papelera unificada y las etiquetas del historial.
4. **Seed no destructivo.** Crea lo que falta y no pisa los roles editados desde el panel;
   reconciliar exige `--sync` (DEC-02).

## Por qué no una fábrica (o clase) por rol

- **Cada rol nuevo exigiría código y despliegue.** El ingeniero no podría crear "Auditor"
  desde el panel; tendría que pedirlo a un programador. Eso es justamente la deuda
  técnica que advirtió el compañero: tenía razón respecto a modelar roles como código.
- **No hay comportamiento que variar.** Abstract Factory sirve para crear familias de
  objetos distintos. Dos roles no se comportan distinto: solo tienen distintos permisos.
  Un dato (una fila) lo representa sin clases.
- **Las comprobaciones por nombre de rol se rompen.** `if role == "Arquitecta"` deja de
  funcionar al renombrar o duplicar un rol. Comprobar permisos no depende del nombre.
- **Ya estaba hecho.** Las tablas, la API y el cálculo por petición existían; reemplazarlos
  añadía riesgo sin beneficio.

## Por qué sí una fábrica para las publicaciones

- Los tipos de publicación **sí** son familias de objetos que varían juntos: repositorio,
  permisos con la misma forma, papelera opcional y módulo de historial.
- Sin fábrica, cada tipo nuevo obligaba a copiar los permisos, la papelera y las reglas de
  Propiedades. Con la fábrica, un tipo nuevo es una subclase que declara su clave y su
  nombre, más una línea en `config/bindings.py`. La prueba de "terrenos" lo demuestra.
- La fábrica vive en código porque agregar un tipo de publicación **sí** requiere código
  (modelo, vistas, serializers). No resta nada a la flexibilidad de los roles.

## Alternativas descartadas

| Alternativa | Por qué no |
| --- | --- |
| Una clase o fábrica por rol | Rol nuevo = código nuevo; comprobaciones por nombre. |
| Decorador por vista con el nombre del rol (`@solo_roles("Ingeniero")`) | Mismo problema: los roles se vuelven código. |
| Grupos y permisos de `django.contrib.auth` | El esquema real de Supabase ya tiene sus propias tablas (`rol`, `permiso`) y los modelos son `managed=False`; habría dos fuentes de verdad. |
| Mantener solo `admin.all` en los módulos nuevos | Arquitecta y Empleado no podían subir imágenes ni trabajar fuera de Bienes Raíces. |

## Consecuencias

- Crear, editar o desactivar roles no requiere desplegar; los cambios aplican en la
  siguiente petición.
- Agregar un **permiso** sí requiere código, una prueba y ejecutar el seed: es lo
  correcto, porque alguien debe programar la comprobación.
- Los 32 nombres de permiso quedan congelados: renombrarlos rompería roles guardados y el
  frontend.
- Como los roles son datos, la seguridad depende de quién puede editarlos. Queda pendiente
  impedir que `roles.manage` otorgue permisos que el editor no tiene (ver
  [RBAC, límites conocidos](../RBAC.md#decisiones-pendientes-y-límites-conocidos)).
