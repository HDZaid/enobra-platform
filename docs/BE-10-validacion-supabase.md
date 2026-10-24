# BE-10: validación real de Supabase

Fecha: viernes 23 de octubre de 2026 (Guatemala).
Estado: VALIDACIÓN EJECUTADA; esquema coincidente, configuración de roles pendiente.

## Alcance y método

Se usó el entorno backend/.venv y la configuración existente, sin mostrar ni copiar credenciales. Rama: backend-dev. No se cambió de rama ni se sincronizó mediante merge; docs/plan/ y este informe ya figuraban sin seguimiento. No se modificaron esos documentos ni archivos de compañeros.

Se ejecutaron las pruebas aisladas y el comando existente mediante call_command, capturando su salida para no publicar información de conexión. Las consultas reales usaron default_transaction_read_only=on, SET TRANSACTION READ ONLY y statement_timeout de 10 segundos. SHOW transaction_read_only confirmó on. Las consultas adicionales fueron SELECT de information_schema.columns, rol, permiso y rol_permiso. No se consultaron cuentas de usuarios ni datos personales.

## Evidencia de diagnóstico

- `python -B manage.py test tests.test_db_diagnostics --settings=config.test_settings`: 9 pruebas aprobadas; sin problemas de system check. Son pruebas aisladas de diagnóstico; no equivalen a la suite completa.
- `check_database`: terminó sin excepción ni salida de error y confirmó 20 tablas. Se ejecutó con los settings normales y la conexión PostgreSQL real.
- El comando existente comprueba presencia de tablas/columnas; el contraste adicional cubrió tipos, longitudes, precisión/escala y nulabilidad de las 166 columnas.
- Los 20 modelos mantienen managed=False.

## Esquema: coincide

20 tablas esperadas y consultadas; 166 columnas esperadas y 166 encontradas. No se detectaron columnas ausentes o adicionales en esas tablas ni otras tablas visibles en public. No hubo diferencias de tipo, longitud, precisión/escala o nulabilidad frente a los modelos locales.

| Tabla | Columnas modelo | Columnas reales |
| --- | ---: | ---: |
| rol | 5 | 5 |
| permiso | 4 | 4 |
| usuario | 7 | 7 |
| usuario_rol | 3 | 3 |
| rol_permiso | 2 | 2 |
| historial_actividad | 8 | 8 |
| servicio | 10 | 10 |
| contenido_pagina | 8 | 8 |
| configuracion_sitio | 11 | 11 |
| red_social | 9 | 9 |
| categoria_proyecto | 5 | 5 |
| proyecto | 19 | 19 |
| proyecto_video | 6 | 6 |
| tipo_propiedad | 4 | 4 |
| tipo_operacion | 4 | 4 |
| propiedad | 23 | 23 |
| propiedad_video | 6 | 6 |
| mensaje_contacto | 15 | 15 |
| categoria_noticia | 4 | 4 |
| noticia | 13 | 13 |

Se normalizaron los nombres equivalentes character varying/varchar y los espacios de la declaración SQL. numeric(12, 2) y numeric(12,2) representan el mismo tipo; la precisión y escala se confirmaron en una segunda consulta. No son diferencias de esquema.

## Evidencia de las cinco tablas exigidas

Cada línea muestra columna, tipo/longitud real y nulabilidad; coincide con el modelo Django.

### historial_actividad

- `id_historial: bigint; nullable=NO`
- `id_usuario: bigint; nullable=NO`
- `accion: character varying(50); nullable=NO`
- `modulo: character varying(60); nullable=NO`
- `id_registro: bigint; nullable=YES`
- `nombre_registro: character varying(250); nullable=YES`
- `descripcion: character varying(500); nullable=YES`
- `fecha: timestamp with time zone; nullable=NO`

### contenido_pagina

- `id_contenido: bigint; nullable=NO`
- `clave: character varying(100); nullable=NO`
- `titulo: character varying(250); nullable=YES`
- `contenido: text; nullable=YES`
- `visible: boolean; nullable=NO`
- `orden: integer; nullable=NO`
- `fecha_actualizacion: timestamp with time zone; nullable=NO`
- `actualizado_por: bigint; nullable=YES`

### proyecto

- `id_proyecto: bigint; nullable=NO`
- `id_categoria: bigint; nullable=NO`
- `titulo: character varying(200); nullable=NO`
- `slug: character varying(220); nullable=NO`
- `descripcion_corta: character varying(500); nullable=YES`
- `descripcion: text; nullable=YES`
- `anio: smallint; nullable=YES`
- `ubicacion: character varying(200); nullable=YES`
- `pais: character varying(100); nullable=YES`
- `publicado: boolean; nullable=NO`
- `destacado: boolean; nullable=NO`
- `fecha_publicacion: timestamp with time zone; nullable=YES`
- `fecha_creacion: timestamp with time zone; nullable=NO`
- `fecha_actualizacion: timestamp with time zone; nullable=YES`
- `fecha_ultima_actividad: timestamp with time zone; nullable=NO`
- `estado_limpieza: character varying(30); nullable=NO`
- `fecha_marcado_eliminacion: timestamp with time zone; nullable=YES`
- `creado_por: bigint; nullable=YES`
- `actualizado_por: bigint; nullable=YES`

### propiedad

- `id_propiedad: bigint; nullable=NO`
- `id_tipo_propiedad: bigint; nullable=NO`
- `id_tipo_operacion: bigint; nullable=NO`
- `titulo: character varying(200); nullable=NO`
- `slug: character varying(220); nullable=NO`
- `descripcion_corta: character varying(500); nullable=YES`
- `descripcion: text; nullable=YES`
- `zona: character varying(100); nullable=YES`
- `ciudad: character varying(120); nullable=YES`
- `pais: character varying(100); nullable=YES`
- `precio: numeric(12,2); nullable=YES`
- `superficie_m2: numeric(10,2); nullable=YES`
- `habitaciones: integer; nullable=YES`
- `banos: integer; nullable=YES`
- `parqueos: integer; nullable=YES`
- `condiciones_comerciales: text; nullable=YES`
- `publicado: boolean; nullable=NO`
- `destacado: boolean; nullable=NO`
- `fecha_publicacion: timestamp with time zone; nullable=YES`
- `fecha_creacion: timestamp with time zone; nullable=NO`
- `fecha_actualizacion: timestamp with time zone; nullable=YES`
- `creado_por: bigint; nullable=YES`
- `actualizado_por: bigint; nullable=YES`

### mensaje_contacto

- `id_mensaje: bigint; nullable=NO`
- `nombre: character varying(150); nullable=NO`
- `correo: character varying(150); nullable=YES`
- `telefono: character varying(30); nullable=YES`
- `asunto: character varying(200); nullable=YES`
- `tipo_consulta: character varying(100); nullable=YES`
- `mensaje: text; nullable=NO`
- `origen: character varying(30); nullable=NO`
- `id_proyecto: bigint; nullable=YES`
- `id_propiedad: bigint; nullable=YES`
- `fecha_preferida: date; nullable=YES`
- `estado: character varying(20); nullable=NO`
- `fecha_recepcion: timestamp with time zone; nullable=NO`
- `atendido_por: bigint; nullable=YES`
- `fecha_atencion: timestamp with time zone; nullable=YES`

## Roles y permisos: diferencias detectadas

Los conteos visibles para la conexión fueron: 1 fila en rol, 31 filas en permiso y 0 filas en rol_permiso. No se publican nombres de otros roles ni datos personales.

| Rol requerido | Encontrado | Permisos asignados comprobables |
| --- | --- | --- |
| Ingeniero | No | No: rol ausente |
| Arquitecta | No | No: rol ausente |
| Empleado | No | No: rol ausente |

Se comprobó por nombre exacto y también con lower(btrim(nombre)); no hubo coincidencias. Al no existir estos roles ni asignaciones visibles, no se acredita la política de acceso prevista. Los resultados describen lo visible para la conexión utilizada; no se auditó RLS ni permisos del usuario de conexión.

El código local contiene 12 permisos en PERMISSION_CATALOG, mientras el H0 del plan exige 32. En la base se contaron 31 permisos, pero ese conteo no demuestra equivalencia de nombres ni asignación correcta. No se ha certificado la reconciliación del catálogo completo de BE-01. Henry debe revisar esa tarea y la configuración real antes de cualquier corrección acordada. No se ejecutó seed.

## Criterios de aceptación

| Criterio | Resultado |
| --- | --- |
| Pruebas de diagnóstico con config.test_settings | Cumplido: 9/9 |
| check_database real, solo lectura | Cumplido |
| Contraste de 20 tablas y 166 columnas | Cumplido: coincide |
| Tipos y longitudes de las cinco tablas exigidas | Cumplido; se extendió a las 20 tablas |
| Revisar roles requeridos y permisos | Revisión cumplida; configuración esperada no satisfecha |
| Informe sin credenciales ni datos personales | Cumplido |
| Informar diferencias al equipo el viernes | Evidencia entregada al solicitante; coordinación del equipo pendiente |

BE-10 cumple la ejecución de la validación y su informe de diferencias, pero no debe marcarse como coincidencia integral ni como cierre backend sin pendientes: faltan los tres roles y sus asignaciones esperadas en los datos visibles. El criterio de cierre global del plan exige BE-10 sin diferencias de esquema pendientes; no se encontraron diferencias estructurales, pero debe resolverse o aceptarse explícitamente la diferencia de roles.

## Límites y próximos pasos

Se detuvo el trabajo de corrección en este punto: no se necesita cambiar código para informar los resultados, y no se autorizan escrituras en Supabase. Coordinar con Henry el catálogo de permisos, la visibilidad de datos y la creación/asignación de roles por el mecanismo acordado; después repetir las lecturas. No ejecutar seeds automáticamente.

No se validaron constraints, índices, defaults, secuencias, políticas RLS, concurrencia ni operaciones de negocio; no forman parte de esta evidencia de tipos/longitudes. No se ejecutaron migraciones, seeds, INSERT, UPDATE, DELETE ni cambios de esquema. Único archivo actualizado: este informe. No hubo commits ni push.
