# Consolidación de la integración en develop

La integración validada de React y Django (`frontend-dev`, `4d3ea14`) se incorpora
mediante merge a `develop`, conservando commits y autores. `main` no se modifica.
Las funcionalidades pendientes permanecen descritas en
[integración backend/frontend](integracion-backend-frontend.md); la promoción no
significa que los catálogos estén terminados ni que se haya desplegado producción.

## Criterio de limpieza

| Rama | Decisión | Evidencia |
| --- | --- | --- |
| develop | Conservar como destino de integración | Recibe todo el historial de frontend-dev. |
| main | Conservar sin cambios | Rama principal existente; no recibe esta fusión. |
| frontend-dev | Retirar después de publicar el merge | HEAD revisado: 4d3ea145eab46edb3f30fc13a7805435b84400f7. Queda como ancestro de develop. |
| feature/projects-&-real-estates | Retirar después de publicar el merge | HEAD revisado: da2d292e64f4feed256352d06674788f7d65aed6. Ya incorporado mediante merge a frontend-dev y, por tanto, a develop. |
| frontend/news-admin-contact | Conservar | Diez commits exclusivos respecto a la integración. El frontend se incorporó selectivamente; quedan diagnóstico/configuración backend y documentación no adoptados. No equivale a una rama fusionada por completo. |
| fix/db-connection-diagnostics | Conservar | Un commit exclusivo (a79493d); contiene comandos/pruebas de diagnóstico todavía no incorporados. Sus dependencias deben revisarse junto con los cambios de la otra rama. |

La eliminación se condiciona al SHA revisado de cada referencia remota y se solicita
como una operación atómica: si una rama avanzó, no se borra con esos valores antiguos.
No se reescribe ningún historial ni se eliminan ramas con trabajo exclusivo pendiente.
La rama local frontend-dev se elimina únicamente cuando Git confirma su incorporación.

## Respaldo y validación

Antes de modificar las ramas se creó y verificó un bundle Git completo, conservado
fuera del checkout en el entorno de trabajo:
`/workspace/repository-backups/enobra-before-develop-cleanup.bundle`.
Contiene el historial completo y las referencias anteriores a la limpieza. No se
crearon ramas temporales ni de respaldo. Los commits de las ramas retiradas siguen
siendo accesibles también como ancestros de develop.

El árbol de la fusión se comprobó idéntico al de frontend-dev antes de actualizar
estas notas y las referencias de documentación. No hubo conflictos de código.

Validación en el resultado de la fusión:

- Backend: 38 pruebas aprobadas en SQLite aislada; system checks correctos.
- Frontend: 76 pruebas aprobadas, lint y build correctos.
- OpenAPI estricto: correcto, sin diferencias con el esquema versionado.
- Recorrido de navegador contra Django real: contacto/bandeja, JWT, noticias CRUD,
  imágenes, permisos y lecturas básicas de catálogos correctos en base desechable.
- Se conserva la limitación de no haber validado Supabase desde este entorno.
- Revisión de whitespace del código correcta; los archivos de licencia originales
  inter-OFL.txt y outfit-OFL.txt traen un espacio final heredado en la línea 21.
  Se conservaron sus bytes y se excluyeron únicamente esos dos archivos del chequeo
  del diff de fusión; no se modificaron licencias para cambiar el resultado del control.

La limpieza de esta entrega se limita a referencias Git incorporadas. No se ejecutan
`git clean`, borrados de contenido, migraciones ni cambios a datos/archivos locales.
