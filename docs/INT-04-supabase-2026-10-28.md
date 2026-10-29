# Pruebas por rol con Supabase — 28 de octubre de 2026

Ejecutadas por el agente a solicitud de Geovanny. Se autorizó usar la base actual para crear, publicar temporalmente y eliminar datos ficticios. Código de partida: `develop` en `3aad1c1`, más la corrección UTF-8 del generador del informe. Responsabilidad de seguimiento: Geo y Leo.

## Resultado de la API

**70 comprobaciones aprobadas, 0 fallos.** [Resultados por comprobación](qa/INT-04-supabase-2026-10-28.json).

| Identidad | Comprobaciones | Resultado |
| --- | --- | --- |
| Ingeniero | 20 | Todas aprobadas |
| Arquitecta | 22 | Todas aprobadas |
| Empleado | 26 | Todas aprobadas; se usó un segundo Empleado para comprobar acceso a datos ajenos |
| Sin sesión | 2 | Accesos rechazados como corresponde |

Se comprobó inicio/cierre de sesión, subida de imágenes, creación de borradores, publicación, visibilidad y edición propia/ajena, envío a papelera, restauración, eliminación definitiva, historial y CSV, administración de roles y acceso a usuarios, creación de proyectos y noticias. Las respuestas 401/403/404 esperadas son comprobaciones aprobadas.

Además, con un proyecto ficticio en Supabase se comprobó P-01: editar renueva la actividad sin borrar las marcas SQL; enviar a papelera y restaurar funciona; restaurar deja `estado_limpieza=ACTIVO` y `fecha_marcado_eliminacion=NULL`. No se ejecutó la función SQL de limpieza.

## Panel en Chromium

- Inicio de sesión real con los tres roles y menús correspondientes: Ingeniero ve las nueve secciones administrativas; Arquitecta y Empleado ven Resumen, Bienes raíces y Papelera.
- Roles, Usuarios e Historial muestran el aviso de acceso restringido para Arquitecta y Empleado. La navegación de estas comprobaciones se realizó dentro de la sesión de React.
- Arquitecta dispone de «Guardar y publicar»; Empleado dispone únicamente de «Guardar borrador».
- Ingeniero y Arquitecta guardaron y publicaron una propiedad ficticia con una foto desde el formulario, con regreso al listado y título confirmado.
- Empleado guardó una propiedad ficticia con foto como borrador desde el formulario. Se verificó en Supabase que los tres formularios conservaron el estado esperado (publicadas Ingeniero/Arquitecta; borrador Empleado).
- En los controles de menú y acceso no se observaron errores de consola; hubo una advertencia de React Router provocada por la navegación sintética del propio ensayo.

## Entorno y alcance

API y panel locales conectados a PostgreSQL real en Supabase. Imágenes guardadas en disco local. Se crearon cuatro cuentas ficticias con contraseñas aleatorias guardadas solo localmente. Los registros de cada pasada recibieron un prefijo único para restringir la limpieza a estos datos.

Antes de las escrituras se generó un respaldo nuevo de `public` mediante `pg_dump`, en formato custom: `enobra-antes-qa-20261028-public.dump` (91 016 bytes), guardado fuera del repositorio. No es un respaldo de los servicios auth/storage de Supabase ni se comprobó su restauración en esta sesión.

La primera pasada completó las peticiones pero falló al guardar el JSON por la codificación predeterminada de Windows. Se corrigió la escritura para usar UTF-8 y se repitió la matriz completa; el resultado 70/70 corresponde a esa repetición. El script original se adaptó localmente con nombres únicos, plazos de petición y limpieza posterior; sigue desaconsejado ejecutarlo directamente en una base compartida sin esos controles.

Limpieza final comprobada: **0 publicaciones ficticias restantes, 0 metadatos de imágenes ficticias restantes y las 4 cuentas de prueba desactivadas**. Se eliminaron los archivos locales de esas imágenes mediante el almacenamiento del backend. Se revocaron las sesiones de esas cuentas. Los roles auxiliares de prueba quedaron inactivos y sin permisos. Se conserva el historial; las cuentas no se borraron porque está relacionado con ellas. Las cuentas reales preexistentes y los tres roles principales se conservaron. Los servidores locales y el navegador del ensayo se cerraron.

Estos resultados permiten a Juan continuar las validaciones de papelera e historial, pero no cierran toda la issue #15: siguen pendientes el despliegue público, almacenamiento persistente, correo y P-02/invocadores de limpieza, entre otros puntos. No habilitan la papelera de proyectos en la base real para uso general. El recorrido de restauración se limitó a un proyecto ficticio autorizado.
