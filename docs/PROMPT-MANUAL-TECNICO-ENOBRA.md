# Plantilla para elaborar el Manual Técnico de EnObra

<!-- enobra-documentacion-vigente -->
> Plantilla para una próxima tarea; no ejecutada en esta revisión. Revisión documental: 3-nov-2026.
> [Base y límites técnicos](BASE-DOCUMENTACION-TECNICA.md). Las evidencias no se reinterpretan como nuevas ejecuciones.
<!-- /enobra-documentacion-vigente -->
Esta plantilla prepara una próxima tarea de redacción. Leerla como fuente no
ordena generar Word, ejecutar comandos, cambiar datos ni publicar documentos.
La actualización actual deja preparada la base Markdown; no genera DOCX/PDF.

## Fuentes que debe usar la próxima redacción

- [Base técnica](BASE-DOCUMENTACION-TECNICA.md): alcance, versiones y límites.
- [Inventario](INVENTARIO-DOCUMENTACION.md): fuentes vigentes y documentos retirados.
- [Diccionario de datos](DICCIONARIO-DATOS.md): veinte modelos/tablas, sin filas reales.
- [Estado](estado-proyecto.md), [operación](operacion-produccion.md), [OpenAPI](openapi.yaml).
- README de aplicaciones, arquitectura, política fija, usuarios, medios, auditoría,
  papelera y evidencias fechadas. No usar planes de octubre retirados como estado actual.

## Encargo propuesto

Redactar en español el Manual Técnico del sistema EnObra a partir de código y
fuentes verificadas. Distinguir contratos, funcionalidades implementadas,
configuración desplegada, resultados probados y pendientes. No inventar versiones,
endpoints, tablas, responsables, capturas o resultados. Marcar lo no acreditado.

El repositorio contiene Django/DRF y React/Vite; Supabase con veinte tablas
existentes, R2 privado y Render/Cloudflare Pages activos. La fábrica es de
publicaciones; los roles humanos siguen una política fija en código. No hay
personalización de roles. Ingeniero es alias de Administrador.

## Índice de trabajo

1. Portada, control de versiones y responsables aprobados.
2. Introducción, objetivos, alcance y público técnico.
3. Requisitos de desarrollo/cliente; versiones resueltas verificadas.
4. Arquitectura general, capas, registro de interfaces y fábrica de publicaciones.
5. Estructura del monorepo y responsabilidades de cada módulo.
6. Base de datos, diagrama entidad-relación y diccionario basado en modelos existentes.
7. API REST, rutas/métodos, validaciones y formato de errores.
8. JWT, sesión por actividad, permisos efectivos y protecciones de usuarios.
9. Sitio público y panel, con límites de cada módulo.
10. Publicaciones, R2 privado, vistas previas y protección de medios en uso.
11. Papelera, auditoría y limpieza diaria P-02 en GitHub Actions.
12. Instalación local, variables por nombre/propósito y pruebas aisladas.
13. Despliegue Pages/Render, CORS, Gunicorn, diagnóstico y arranque Free.
14. Pruebas y evidencia: separar SQLite, Supabase y URL desplegada.
15. Mantenimiento, respaldos, incidencias, pendientes y depuración futura de cuentas.
16. Glosario, referencias y anexos.

## Figuras y formato

Preparar diagramas de arquitectura, fábrica, datos, autenticación, entrega de
imágenes y despliegue a partir de sus fuentes. Las capturas de demostración deben
identificarse como ficticias; no usarlas como prueba de producción. No capturar
credenciales, correos personales, DSN, JWT o firmas de vistas previas.

Si se pide reproducir el formato del manual de usuario, usar el archivo de
referencia que facilite el usuario. Portada, integrantes y carnés deben provenir
de una fuente aprobada; están pendientes. No inventar ni buscarlos en Supabase.
La futura salida puede ubicarse en docs/manual-tecnico/ con figuras y archivos
Markdown/DOCX/PDF, cuando se solicite esa elaboración y se disponga de la referencia.

## Criterios para revisar el manual

- Las URL del sitio/API ya están verificadas; no marcarlas como inexistentes.
- El contrato contiene 38 rutas y 55 operaciones; Servicios/búsqueda siguen con 501.
- Correo, pruebas reales por rol y subida desde el panel conservan sus pendientes.
- R2 se mantiene privado; no proponer dominio público como requisito de activación.
- La depuración de cuentas será después de la exposición del 4-nov-2026; correos
  de las dos cuentas humanas por definir. No afirmar que se ejecutó ni suponer IDs.
- No ejecutar propuestas SQL, migraciones, seeds o limpiezas para completar el texto.
- No copiar secretos desde archivos locales. Variables de ejemplo por nombre y
  propósito; versiones desde lockfiles, no desde rangos de instalación.
- Validar enlaces, numeración, figuras y correspondencia con el código. Enumerar
  pendientes concretos y su evidencia faltante; no declarar funcionalidades cerradas
  solo porque un documento anterior las llamó completas.
