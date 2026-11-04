# Pruebas HTTP con Postman

<!-- enobra-documentacion-vigente -->
> Guía vigente. Revisión documental: 3-nov-2026.
> [Base y límites técnicos](../BASE-DOCUMENTACION-TECNICA.md). Las evidencias no se reinterpretan como nuevas ejecuciones.
<!-- /enobra-documentacion-vigente -->
La fuente vigente es [openapi.yaml](../openapi.yaml): 38 rutas y 55 operaciones,
con roles fijos y R2 privado. Las colecciones JSON conservadas se generaron en
cortes anteriores; no se actualizaron sus scripts/aserciones en esta tarea documental.
No presentarlas como una matriz completa validada del contrato actual.

## Archivos conservados

- [EnObra.postman_collection.json](EnObra.postman_collection.json).
- [EnObra-RBAC.postman_collection.json](EnObra-RBAC.postman_collection.json).
- [Entorno local sin credenciales](EnObra-local.postman_environment.json).
- [PNG para pruebas](fixtures/catalogo-prueba.png).

El entorno usa base_url sin /api/v1 final. Completar credenciales solamente en una
copia local privada. No versionar exportaciones con tokens, contraseñas o IDs de
pruebas reales. Las variables de un ejemplo no crean cuentas en la base.

## Compatibilidad que debe revisarse

- admin/roles/, admin/roles/{id}/ y admin/permissions/ se retiraron y responden 404.
  La administración dinámica de roles de una colección antigua no aplica.
- Ingeniero equivale a Administrador; Arquitecta a Arquitecto. Empleado puede
  editar/publicar contenido ajeno y no tiene papelera. Usar [política vigente](../politica-roles-fijos.md).
- Selector actual: GET admin/users/roles/, con IDs existentes. No inventar role_id.
- Servicios y búsqueda siguen devolviendo 501; una aserción antigua que espera
  datos implementados no describe el estado real.
- La imagen de producción se entrega por API desde R2 privado; no asumir URL S3
  pública ni /media/uploads local para todas las configuraciones.

## Preparar una prueba actual

Importar OpenAPI o construir las peticiones desde sus rutas vigentes. Revisar las
aserciones contra serializers y política fija antes de automatizar una colección.
Postman CLI está disponible según la configuración del equipo; comprobar su ayuda
local para los parámetros de ejecución. Esta guía no declara una corrida nueva.

Comenzar con health y lecturas públicas, luego login/auth/me en un entorno autorizado.
El backend acepta Bearer. No fijar Content-Type manual al enviar multipart de medios.
Para crear/borrar datos usar cuentas y objetos de prueba con alcance definido.
Las colecciones contienen escrituras, cambios de estado y borrados; no ejecutarlas
completas contra Supabase compartido por seguir este documento.

[Pruebas aisladas](../probar-admin.md), [operación](../operacion-produccion.md) y
[evidencias vigentes](../estado-proyecto.md). Queda pendiente actualizar las
colecciones/aserciones al contrato actual antes de usarlas como evidencia de entrega.
