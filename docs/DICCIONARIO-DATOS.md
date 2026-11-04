# Diccionario de datos de los modelos existentes

<!-- enobra-documentacion-vigente -->
> Guía vigente. Revisión documental: 3-nov-2026.
> [Base y límites técnicos](BASE-DOCUMENTACION-TECNICA.md). Las evidencias no se reinterpretan como nuevas ejecuciones.
<!-- /enobra-documentacion-vigente -->
Fuente: backend/persistence/models del corte funcional 7d0dd21. Se documentan
veinte tablas mapeadas por Django, sin consultar filas ni modificar Supabase.
Los tipos indicados son tipos Django; no sustituyen un inventario completo de
PostgreSQL. managed=False significa que Django no administra estas tablas.
Confirmar tipos/índices/constraints reales antes de diseñar cambios de esquema.
La [validación BE-10](BE-10-validacion-supabase.md) es evidencia fechada con límites.

No se incluyen propuestas SQL como si estuvieran aplicadas. No hay valores de
contraseñas, correos de cuentas, secretos ni datos de usuarios en este diccionario.

## categoria_noticia

Modelo `CategoriaNoticia`. Clave primaria declarada: `id_categoria_noticia`.

| Columna | Atributo ORM | Tipo Django | Admite NULL | Referencia |
| --- | --- | --- | --- | --- |
| `id_categoria_noticia` | `id` | BigAutoField | No | — |
| `nombre` | `nombre` | CharField(80) | No | — |
| `estado` | `estado` | BooleanField | No | — |
| `fecha_creacion` | `fecha_creacion` | DateTimeField | No | — |

Restricciones declaradas: `categoria_noticia_nombre_key`: unicidad de `nombre`.

## categoria_proyecto

Modelo `CategoriaProyecto`. Clave primaria declarada: `id_categoria`.

| Columna | Atributo ORM | Tipo Django | Admite NULL | Referencia |
| --- | --- | --- | --- | --- |
| `id_categoria` | `id` | BigAutoField | No | — |
| `nombre` | `nombre` | CharField(100) | No | — |
| `descripcion` | `descripcion` | CharField(300) | Sí | — |
| `estado` | `estado` | BooleanField | No | — |
| `fecha_creacion` | `fecha_creacion` | DateTimeField | No | — |

Restricciones declaradas: `categoria_proyecto_nombre_key`: unicidad de `nombre`.

## configuracion_sitio

Modelo `ConfiguracionSitio`. Clave primaria declarada: `id_configuracion`.

| Columna | Atributo ORM | Tipo Django | Admite NULL | Referencia |
| --- | --- | --- | --- | --- |
| `id_configuracion` | `id` | BigAutoField | No | — |
| `nombre_empresa` | `nombre_empresa` | CharField(150) | Sí | — |
| `responsable` | `responsable` | CharField(150) | Sí | — |
| `direccion` | `direccion` | CharField(300) | Sí | — |
| `telefono` | `telefono` | CharField(30) | Sí | — |
| `telefono_adicional` | `telefono_adicional` | CharField(30) | Sí | — |
| `whatsapp` | `whatsapp` | CharField(30) | Sí | — |
| `correo` | `correo` | CharField(150) | Sí | — |
| `dominio` | `dominio` | CharField(255) | Sí | — |
| `fecha_actualizacion` | `fecha_actualizacion` | DateTimeField | No | — |
| `actualizado_por` | `actualizado_por` | ForeignKey | Sí | usuario.id_usuario |

## contenido_pagina

Modelo `ContenidoPagina`. Clave primaria declarada: `id_contenido`.

| Columna | Atributo ORM | Tipo Django | Admite NULL | Referencia |
| --- | --- | --- | --- | --- |
| `id_contenido` | `id` | BigAutoField | No | — |
| `clave` | `clave` | CharField(100) | No | — |
| `titulo` | `titulo` | CharField(250) | Sí | — |
| `contenido` | `contenido` | TextField | Sí | — |
| `visible` | `visible` | BooleanField | No | — |
| `orden` | `orden` | IntegerField | No | — |
| `fecha_actualizacion` | `fecha_actualizacion` | DateTimeField | No | — |
| `actualizado_por` | `actualizado_por` | ForeignKey | Sí | usuario.id_usuario |

Restricciones declaradas: `contenido_pagina_clave_key`: unicidad de `clave`.

## historial_actividad

Modelo `HistorialActividad`. Clave primaria declarada: `id_historial`.

| Columna | Atributo ORM | Tipo Django | Admite NULL | Referencia |
| --- | --- | --- | --- | --- |
| `id_historial` | `id` | BigAutoField | No | — |
| `id_usuario` | `usuario` | ForeignKey | No | usuario.id_usuario |
| `accion` | `accion` | CharField(50) | No | — |
| `modulo` | `modulo` | CharField(60) | No | — |
| `id_registro` | `id_registro` | BigIntegerField | Sí | — |
| `nombre_registro` | `nombre_registro` | CharField(250) | Sí | — |
| `descripcion` | `descripcion` | CharField(500) | Sí | — |
| `fecha` | `fecha` | DateTimeField | No | — |

## mensaje_contacto

Modelo `MensajeContacto`. Clave primaria declarada: `id_mensaje`.

| Columna | Atributo ORM | Tipo Django | Admite NULL | Referencia |
| --- | --- | --- | --- | --- |
| `id_mensaje` | `id` | BigAutoField | No | — |
| `nombre` | `nombre` | CharField(150) | No | — |
| `correo` | `correo` | CharField(150) | Sí | — |
| `telefono` | `telefono` | CharField(30) | Sí | — |
| `asunto` | `asunto` | CharField(200) | Sí | — |
| `tipo_consulta` | `tipo_consulta` | CharField(100) | Sí | — |
| `mensaje` | `mensaje` | TextField | No | — |
| `origen` | `origen` | CharField(30) | No | — |
| `id_proyecto` | `proyecto` | ForeignKey | Sí | proyecto.id_proyecto |
| `id_propiedad` | `propiedad` | ForeignKey | Sí | propiedad.id_propiedad |
| `fecha_preferida` | `fecha_preferida` | DateField | Sí | — |
| `estado` | `estado` | CharField(20) | No | — |
| `fecha_recepcion` | `fecha_recepcion` | DateTimeField | No | — |
| `atendido_por` | `atendido_por` | ForeignKey | Sí | usuario.id_usuario |
| `fecha_atencion` | `fecha_atencion` | DateTimeField | Sí | — |

Restricciones declaradas: `chk_mensaje_estado`: condición declarada en el modelo; `chk_mensaje_origen`: condición declarada en el modelo.

## noticia

Modelo `Noticia`. Clave primaria declarada: `id_noticia`.

| Columna | Atributo ORM | Tipo Django | Admite NULL | Referencia |
| --- | --- | --- | --- | --- |
| `id_noticia` | `id` | BigAutoField | No | — |
| `id_categoria_noticia` | `categoria` | ForeignKey | No | categoria_noticia.id_categoria_noticia |
| `titulo` | `titulo` | CharField(220) | No | — |
| `slug` | `slug` | CharField(240) | No | — |
| `resumen` | `resumen` | CharField(500) | Sí | — |
| `contenido` | `contenido` | TextField | Sí | — |
| `publicado` | `publicado` | BooleanField | No | — |
| `destacado` | `destacado` | BooleanField | No | — |
| `fecha_publicacion` | `fecha_publicacion` | DateTimeField | Sí | — |
| `fecha_creacion` | `fecha_creacion` | DateTimeField | No | — |
| `fecha_actualizacion` | `fecha_actualizacion` | DateTimeField | Sí | — |
| `creado_por` | `creado_por` | ForeignKey | Sí | usuario.id_usuario |
| `actualizado_por` | `actualizado_por` | ForeignKey | Sí | usuario.id_usuario |

Restricciones declaradas: `noticia_slug_key`: unicidad de `slug`.

## permiso

Modelo `Permiso`. Clave primaria declarada: `id_permiso`.

| Columna | Atributo ORM | Tipo Django | Admite NULL | Referencia |
| --- | --- | --- | --- | --- |
| `id_permiso` | `id` | BigAutoField | No | — |
| `nombre` | `nombre` | CharField(100) | No | — |
| `descripcion` | `descripcion` | CharField(250) | Sí | — |
| `fecha_creacion` | `fecha_creacion` | DateTimeField | No | — |

Restricciones declaradas: `permiso_nombre_key`: unicidad de `nombre`.

## propiedad

Modelo `Propiedad`. Clave primaria declarada: `id_propiedad`.

| Columna | Atributo ORM | Tipo Django | Admite NULL | Referencia |
| --- | --- | --- | --- | --- |
| `id_propiedad` | `id` | BigAutoField | No | — |
| `id_tipo_propiedad` | `tipo_propiedad` | ForeignKey | No | tipo_propiedad.id_tipo_propiedad |
| `id_tipo_operacion` | `tipo_operacion` | ForeignKey | No | tipo_operacion.id_tipo_operacion |
| `titulo` | `titulo` | CharField(200) | No | — |
| `slug` | `slug` | CharField(220) | No | — |
| `descripcion_corta` | `descripcion_corta` | CharField(500) | Sí | — |
| `descripcion` | `descripcion` | TextField | Sí | — |
| `zona` | `zona` | CharField(100) | Sí | — |
| `ciudad` | `ciudad` | CharField(120) | Sí | — |
| `pais` | `pais` | CharField(100) | Sí | — |
| `precio` | `precio` | DecimalField | Sí | — |
| `superficie_m2` | `superficie_m2` | DecimalField | Sí | — |
| `habitaciones` | `habitaciones` | IntegerField | Sí | — |
| `banos` | `banos` | IntegerField | Sí | — |
| `parqueos` | `parqueos` | IntegerField | Sí | — |
| `condiciones_comerciales` | `condiciones_comerciales` | TextField | Sí | — |
| `publicado` | `publicado` | BooleanField | No | — |
| `destacado` | `destacado` | BooleanField | No | — |
| `fecha_publicacion` | `fecha_publicacion` | DateTimeField | Sí | — |
| `fecha_creacion` | `fecha_creacion` | DateTimeField | No | — |
| `fecha_actualizacion` | `fecha_actualizacion` | DateTimeField | Sí | — |
| `creado_por` | `creado_por` | ForeignKey | Sí | usuario.id_usuario |
| `actualizado_por` | `actualizado_por` | ForeignKey | Sí | usuario.id_usuario |

Restricciones declaradas: `propiedad_slug_key`: unicidad de `slug`; `chk_propiedad_precio`: condición declarada en el modelo; `chk_propiedad_superficie`: condición declarada en el modelo; `chk_propiedad_habitaciones`: condición declarada en el modelo; `chk_propiedad_banos`: condición declarada en el modelo; `chk_propiedad_parqueos`: condición declarada en el modelo.

## propiedad_video

Modelo `PropiedadVideo`. Clave primaria declarada: `id_video`.

| Columna | Atributo ORM | Tipo Django | Admite NULL | Referencia |
| --- | --- | --- | --- | --- |
| `id_video` | `id` | BigAutoField | No | — |
| `id_propiedad` | `propiedad` | ForeignKey | No | propiedad.id_propiedad |
| `url_youtube` | `url_youtube` | CharField(500) | No | — |
| `titulo` | `titulo` | CharField(200) | Sí | — |
| `orden` | `orden` | IntegerField | No | — |
| `fecha_creacion` | `fecha_creacion` | DateTimeField | No | — |

## proyecto

Modelo `Proyecto`. Clave primaria declarada: `id_proyecto`.

| Columna | Atributo ORM | Tipo Django | Admite NULL | Referencia |
| --- | --- | --- | --- | --- |
| `id_proyecto` | `id` | BigAutoField | No | — |
| `id_categoria` | `categoria` | ForeignKey | No | categoria_proyecto.id_categoria |
| `titulo` | `titulo` | CharField(200) | No | — |
| `slug` | `slug` | CharField(220) | No | — |
| `descripcion_corta` | `descripcion_corta` | CharField(500) | Sí | — |
| `descripcion` | `descripcion` | TextField | Sí | — |
| `anio` | `anio` | SmallIntegerField | Sí | — |
| `ubicacion` | `ubicacion` | CharField(200) | Sí | — |
| `pais` | `pais` | CharField(100) | Sí | — |
| `publicado` | `publicado` | BooleanField | No | — |
| `destacado` | `destacado` | BooleanField | No | — |
| `fecha_publicacion` | `fecha_publicacion` | DateTimeField | Sí | — |
| `fecha_creacion` | `fecha_creacion` | DateTimeField | No | — |
| `fecha_actualizacion` | `fecha_actualizacion` | DateTimeField | Sí | — |
| `fecha_ultima_actividad` | `fecha_ultima_actividad` | DateTimeField | No | — |
| `estado_limpieza` | `estado_limpieza` | CharField(30) | No | — |
| `fecha_marcado_eliminacion` | `fecha_marcado_eliminacion` | DateTimeField | Sí | — |
| `creado_por` | `creado_por` | ForeignKey | Sí | usuario.id_usuario |
| `actualizado_por` | `actualizado_por` | ForeignKey | Sí | usuario.id_usuario |

Restricciones declaradas: `proyecto_slug_key`: unicidad de `slug`; `chk_proyecto_anio`: condición declarada en el modelo; `chk_proyecto_estado_limpieza`: condición declarada en el modelo.

## proyecto_video

Modelo `ProyectoVideo`. Clave primaria declarada: `id_video`.

| Columna | Atributo ORM | Tipo Django | Admite NULL | Referencia |
| --- | --- | --- | --- | --- |
| `id_video` | `id` | BigAutoField | No | — |
| `id_proyecto` | `proyecto` | ForeignKey | No | proyecto.id_proyecto |
| `url_youtube` | `url_youtube` | CharField(500) | No | — |
| `titulo` | `titulo` | CharField(200) | Sí | — |
| `orden` | `orden` | IntegerField | No | — |
| `fecha_creacion` | `fecha_creacion` | DateTimeField | No | — |

## red_social

Modelo `RedSocial`. Clave primaria declarada: `id_red_social`.

| Columna | Atributo ORM | Tipo Django | Admite NULL | Referencia |
| --- | --- | --- | --- | --- |
| `id_red_social` | `id` | BigAutoField | No | — |
| `id_configuracion` | `configuracion` | ForeignKey | No | configuracion_sitio.id_configuracion |
| `nombre` | `nombre` | CharField(60) | No | — |
| `url` | `url` | CharField(700) | No | — |
| `icono` | `icono` | CharField(100) | Sí | — |
| `visible` | `visible` | BooleanField | No | — |
| `orden` | `orden` | IntegerField | No | — |
| `fecha_creacion` | `fecha_creacion` | DateTimeField | No | — |
| `fecha_actualizacion` | `fecha_actualizacion` | DateTimeField | Sí | — |

Restricciones declaradas: `uq_red_social_configuracion_nombre`: unicidad de `configuracion`, `nombre`.

## rol

Modelo `Rol`. Clave primaria declarada: `id_rol`.

| Columna | Atributo ORM | Tipo Django | Admite NULL | Referencia |
| --- | --- | --- | --- | --- |
| `id_rol` | `id` | BigAutoField | No | — |
| `nombre` | `nombre` | CharField(60) | No | — |
| `descripcion` | `descripcion` | CharField(250) | Sí | — |
| `estado` | `estado` | BooleanField | No | — |
| `fecha_creacion` | `fecha_creacion` | DateTimeField | No | — |

Restricciones declaradas: `rol_nombre_key`: unicidad de `nombre`.

## rol_permiso

Modelo `RolPermiso`. Clave primaria declarada: `rol_id, permiso_id`.

| Columna | Atributo ORM | Tipo Django | Admite NULL | Referencia |
| --- | --- | --- | --- | --- |
| `id_rol` | `rol` | ForeignKey | No | rol.id_rol |
| `id_permiso` | `permiso` | ForeignKey | No | permiso.id_permiso |

## servicio

Modelo `Servicio`. Clave primaria declarada: `id_servicio`.

| Columna | Atributo ORM | Tipo Django | Admite NULL | Referencia |
| --- | --- | --- | --- | --- |
| `id_servicio` | `id` | BigAutoField | No | — |
| `nombre` | `nombre` | CharField(150) | No | — |
| `slug` | `slug` | CharField(170) | No | — |
| `descripcion_corta` | `descripcion_corta` | CharField(500) | Sí | — |
| `descripcion` | `descripcion` | TextField | Sí | — |
| `orden` | `orden` | IntegerField | No | — |
| `visible` | `visible` | BooleanField | No | — |
| `fecha_creacion` | `fecha_creacion` | DateTimeField | No | — |
| `fecha_actualizacion` | `fecha_actualizacion` | DateTimeField | Sí | — |
| `actualizado_por` | `actualizado_por` | ForeignKey | Sí | usuario.id_usuario |

Restricciones declaradas: `servicio_slug_key`: unicidad de `slug`.

## tipo_operacion

Modelo `TipoOperacion`. Clave primaria declarada: `id_tipo_operacion`.

| Columna | Atributo ORM | Tipo Django | Admite NULL | Referencia |
| --- | --- | --- | --- | --- |
| `id_tipo_operacion` | `id` | BigAutoField | No | — |
| `nombre` | `nombre` | CharField(50) | No | — |
| `estado` | `estado` | BooleanField | No | — |
| `fecha_creacion` | `fecha_creacion` | DateTimeField | No | — |

Restricciones declaradas: `tipo_operacion_nombre_key`: unicidad de `nombre`.

## tipo_propiedad

Modelo `TipoPropiedad`. Clave primaria declarada: `id_tipo_propiedad`.

| Columna | Atributo ORM | Tipo Django | Admite NULL | Referencia |
| --- | --- | --- | --- | --- |
| `id_tipo_propiedad` | `id` | BigAutoField | No | — |
| `nombre` | `nombre` | CharField(80) | No | — |
| `estado` | `estado` | BooleanField | No | — |
| `fecha_creacion` | `fecha_creacion` | DateTimeField | No | — |

Restricciones declaradas: `tipo_propiedad_nombre_key`: unicidad de `nombre`.

## usuario

Modelo `Usuario`. Clave primaria declarada: `id_usuario`.

| Columna | Atributo ORM | Tipo Django | Admite NULL | Referencia |
| --- | --- | --- | --- | --- |
| `id_usuario` | `id` | BigAutoField | No | — |
| `nombre` | `nombre` | CharField(120) | No | — |
| `correo` | `correo` | CharField(150) | No | — |
| `password_hash` | `password_hash` | CharField(255) | No | — |
| `estado` | `estado` | CharField(20) | No | — |
| `fecha_creacion` | `fecha_creacion` | DateTimeField | No | — |
| `fecha_actualizacion` | `fecha_actualizacion` | DateTimeField | Sí | — |

Restricciones declaradas: `usuario_correo_key`: unicidad de `correo`; `chk_usuario_estado`: condición declarada en el modelo.

## usuario_rol

Modelo `UsuarioRol`. Clave primaria declarada: `usuario_id, rol_id`.

| Columna | Atributo ORM | Tipo Django | Admite NULL | Referencia |
| --- | --- | --- | --- | --- |
| `id_usuario` | `usuario` | ForeignKey | No | usuario.id_usuario |
| `id_rol` | `rol` | ForeignKey | No | rol.id_rol |
| `fecha_asignacion` | `fecha_asignacion` | DateTimeField | No | — |

## Datos auxiliares y límites

contenido_pagina almacena JSON auxiliar de catálogos, imágenes, estado de papelera
y sesiones revocables. No asumir que exista una tabla nueva por cada clave JSON.
Los bytes de imágenes se guardan en R2, no en la base. Las tablas de imágenes que
aparezcan en propuestas de docs/sql no están acreditadas por estos modelos.
El historial conserva actor/referencias; borrar usuarios requiere revisar sus FK
antes de la depuración posterior a la exposición. No se ejecutó esa depuración.
