# Prompt para generar el Manual Técnico del sistema EnObra

> **Cómo usarlo:** abre Codex o Claude Code en la raíz de tu clon del repositorio
> **Proyecto EnObra**, copia el ejemplo `MANUAL DE USUARIO DEL SISTEMA ENOBRA.docx`
> dentro de la carpeta `docs/manual-tecnico/referencia/` (créala si no existe) y pega
> todo el bloque de abajo como mensaje para el agente.

---

```text
Actúa como redactor técnico senior y como desarrollador del proyecto EnObra. Tu tarea es
generar el MANUAL TÉCNICO DEL SISTEMA ENOBRA V 1.0, con calidad profesional de entrega
universitaria, a partir del código y la documentación reales de este repositorio.

## 0. Reglas obligatorias antes de empezar

1. Lee primero AGENTS.md, docs/TRABAJO-EN-EQUIPO.md y docs/responsables-y-cierres.md y
   respétalos. Esta tarea es SOLO de documentación: no modifiques código de backend/ ni
   de frontend/, no crees ramas nuevas, no hagas commit ni push sin que yo lo pida.
2. Todo dato técnico debe salir del repositorio (código, README, docs/, openapi.yaml,
   requirements, package.json, render.yaml, .github/workflows). No inventes versiones,
   tablas, endpoints, URLs ni cifras. Si algo no se puede verificar, escribe
   «[PENDIENTE: qué falta y quién debe confirmarlo]» y añádelo a la lista final.
3. NUNCA copies secretos: ni valores de .env, contraseñas, tokens, claves de Supabase,
   Cloudflare R2, Render o GitHub. Las variables de entorno se documentan solo por nombre
   y propósito, tomándolas de los archivos .env.example.
4. Redacta en español formal, tercera persona e impersonal («se ejecuta», «se configura»),
   igual que el manual de usuario de referencia.

## 1. Formato a imitar (manual de referencia)

Analiza docs/manual-tecnico/referencia/MANUAL DE USUARIO DEL SISTEMA ENOBRA.docx
(estilos, márgenes, fuentes, tamaños, colores, numeración y encabezados/pies) y reproduce
el mismo formato en el manual técnico. Su estructura es:

- Portada: «MANUAL TÉCNICO DEL SISTEMA» / «“ENOBRA” V 1.0», subtítulo
  «Sitio web y panel de administración», bloque «Integrantes:» con los mismos nombres y
  carnés de la portada del manual de usuario (cópialos de allí, en el mismo orden),
  y al pie «Quetzaltenango, noviembre 2026».
- «ÍNDICE GENERAL» automático (campo TOC de Word) con niveles 1, 2 y 3.
- Títulos numerados con los estilos Título 1 (1.), Título 2 (1.1) y Título 3 (1.1.1).
- Párrafos explicativos cortos seguidos de la figura que ilustran, y viñetas con el estilo
  «Párrafo de lista». Requerimientos con incisos a), b)…
- Notas destacadas con el formato «Nota: …».
- Añade, como corresponde a un manual técnico: «ÍNDICE DE FIGURAS» después del índice
  general, pie de figura numerado («Figura N. Descripción») y, en tablas,
  «Tabla N. Descripción». Bloques de código en fuente monoespaciada con fondo gris claro.
- Encabezado con «Manual Técnico – EnObra» y pie con número de página (la portada sin
  número).

## 2. Contenido requerido

Usa esta tabla de contenidos (puedes subdividir más, no quitar secciones):

1. Introducción — qué es EnObra (empresa constructora y de bienes raíces de
   Quetzaltenango), qué resuelve el sistema y relación con el Manual de Usuario.
2. Objetivo del manual.
3. Dirigido a — desarrolladores, personal técnico y administradores del sistema.
4. Conocimientos previos — Python/Django, JavaScript/React, Git, SQL/PostgreSQL, HTTP/REST.
5. Especificaciones técnicas
   5.1 Requerimientos de hardware (desarrollo y cliente).
   5.2 Requerimientos de software (Python 3.12+, Node.js según "engines" de
       frontend/package.json, navegadores, Git) con versiones tomadas del repo.
6. Descripción general y arquitectura
   6.1 Monorepo: backend/ (Django 5.2 + Django REST Framework) y frontend/ (React + Vite +
       Tailwind CSS), comunicados por HTTP en /api/v1/.
   6.2 Diagrama de arquitectura general (cliente, frontend, API, PostgreSQL en Supabase,
       almacenamiento de imágenes en Cloudflare R2, hosting en Render, GitHub Actions).
   6.3 Arquitectura del backend por capas: interfaces, registro (apps/common/registry.py),
       acople (config/bindings.py) e implementaciones (persistence/). Basarse en
       docs/arquitectura.md e incluir sus diagramas Mermaid renderizados como imagen.
   6.4 Patrones de diseño usados (p. ej. la fábrica de publicaciones / Abstract Factory,
       repositorios), con un fragmento de código real de ejemplo para cada uno.
7. Tecnologías y dependencias — tabla con tecnología, versión y uso, a partir de
   backend/requirements.in, requirements.txt y frontend/package.json.
8. Estructura del proyecto — árbol de carpetas comentado y descripción de cada app de
   backend/apps (accounts, audit, common, company, inquiries, media, news, projects,
   properties, publications, search, services) y de frontend/src (app, components,
   features, services, styles).
9. Base de datos
   9.1 Motor y conexión (PostgreSQL en Supabase, modelos managed=False, dj-database-url).
   9.2 Diagrama entidad-relación de las tablas reales usadas por los modelos.
   9.3 Diccionario de datos: tabla por entidad con campo, tipo, restricciones y
       descripción.
   9.4 Scripts SQL de docs/sql y su propósito.
10. API REST
   10.1 Contrato docs/openapi.yaml y documentación generada con drf-spectacular.
   10.2 Tabla de endpoints por módulo: método, ruta, descripción, permiso requerido y si
        es pública o del panel.
   10.3 Ejemplo de petición y respuesta (JSON) de un endpoint público y uno protegido.
   10.4 Formato de errores y códigos HTTP (incluido 501 not_implemented).
   10.5 Colección de Postman de docs/postman, si existe.
11. Seguridad
   11.1 Autenticación con JWT (PyJWT): inicio de sesión, duración de la sesión y
        vencimiento.
   11.2 Control de acceso basado en roles (RBAC por datos): roles, permisos, matriz de
        roles (docs/RBAC.md, docs/INT-04-matriz-roles.md, docs/adr/0001-rbac-por-datos.md,
        docs/politica-roles-fijos.md).
   11.3 CORS, validación de archivos subidos (tipos, tamaño y cantidad) y protección de
        imágenes privadas servidas mediante la API.
12. Módulos del sistema — por cada módulo del Manual de Usuario (Resumen, Bienes raíces,
    Proyectos, Noticias, Papelera, Mensajes, Usuarios, Roles, Historial y el sitio público:
    contacto, buscador, etc.) explicar: objetivo, componentes de frontend, endpoints,
    tablas, permisos y reglas de negocio. Mantener los mismos nombres y numeración
    temática del Manual de Usuario para que ambos documentos se correspondan.
13. Almacenamiento de imágenes y medios (Cloudflare R2 privado, django-storages, flujo de
    subida y entrega; docs/R2-configuracion.md).
14. Papelera, auditoría y tareas programadas — papelera de 90 días, limpieza diaria con
    GitHub Actions (.github/workflows/purge-expired-trash.yml), historial de auditoría y
    exportación CSV (docs/papelera.md, docs/P02-limpieza-activa.md, docs/auditoria.md).
15. Instalación y configuración en entorno local — paso a paso para Windows (PowerShell)
    y notas para macOS/Linux, tal como en README.md: entorno virtual, dependencias,
    .env, `manage.py check`, `runserver`, `npm install`, `npm run dev`.
16. Variables de entorno — tabla con nombre, aplicación (backend/frontend), obligatoria
    sí/no y descripción. Solo nombres, nunca valores reales.
17. Pruebas y control de calidad — cómo ejecutar las pruebas de backend (backend/tests)
    y de frontend (`npm run test`, `npm run lint`, `npm run build`), y la carpeta docs/qa.
18. Despliegue en producción — Render (render.yaml, gunicorn.conf.py), workflow
    backend-production.yml, compilación del frontend, verificación posterior
    (docs/BE-14-produccion.md, docs/Render-backend.md, docs/infraestructura.md).
    Las URLs de producción se marcan [PENDIENTE] si aún no están validadas.
19. Control de versiones y flujo de trabajo — ramas main, develop, backend-dev y
    frontend-dev; Conventional Commits; hooks de .githooks; reglas de sincronización.
20. Mantenimiento y solución de problemas — tabla «Problema / Causa probable / Solución»
    con casos reales (sesión vencida, error de CORS, fallo de conexión a la base de datos,
    imagen que no carga, 501 en módulos no implementados, etc.).
21. Glosario de términos técnicos.
22. Anexos — referencias a los documentos de docs/ usados como fuente.

## 3. Figuras

- Incluye como mínimo: diagrama de arquitectura general, diagrama de capas del backend,
  diagrama de la fábrica de publicaciones, diagrama entidad-relación, diagrama de flujo
  de autenticación, diagrama del flujo de subida de imágenes y diagrama de despliegue.
- Genera los diagramas en Mermaid y renderízalos a PNG (por ejemplo con
  @mermaid-js/mermaid-cli mediante npx); si no es posible, déjalos como imagen
  pendiente con un recuadro «[FIGURA PENDIENTE: …]».
- Añade capturas reales de: estructura de carpetas en el editor, fragmentos de código
  clave, terminal ejecutando backend y frontend, documentación de la API en el
  navegador y, si está disponible, el panel de Supabase/Render SIN datos sensibles
  (difumina o recorta claves, correos y URLs privadas).
- Guarda las imágenes en docs/manual-tecnico/figuras/ con nombres numerados
  (fig-01-arquitectura.png, …).

## 4. Entregables

Guarda todo en docs/manual-tecnico/:

1. MANUAL-TECNICO-ENOBRA.md — fuente completa en Markdown.
2. MANUAL TÉCNICO DEL SISTEMA ENOBRA.docx — documento final con el formato del manual de
   referencia (usa python-docx o pandoc con el .docx de referencia como
   --reference-doc para heredar sus estilos; después ajusta portada, índices,
   encabezados y pies). El índice debe actualizarse al abrir el archivo en Word.
3. Opcional: exportación a PDF si hay LibreOffice o Word disponibles.
4. figuras/ con todas las imágenes.

## 5. Verificación final

Antes de terminar:

- Revisa que cada sección del índice exista y tenga contenido, que todas las figuras y
  tablas estén numeradas y citadas en el texto, y que los nombres de módulos coincidan
  con el Manual de Usuario.
- Comprueba que los comandos documentados existen (scripts de package.json, rutas de
  archivos, nombres de workflows) y que no aparece ningún secreto (busca «KEY»,
  «SECRET», «PASSWORD», «TOKEN», «postgres://» en los entregables).
- Muéstrame un resumen con: archivos generados, número de páginas aproximado, figuras
  incluidas y la lista completa de elementos [PENDIENTE] para completarlos con el equipo.
```
