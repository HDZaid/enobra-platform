-- PROPUESTA PARA REVISION. NO EJECUTADA EN SUPABASE.
-- Leer ../propuesta-tablas-imagenes.md antes de cualquier aplicacion posterior.
-- Requiere coordinar BE-04, limpieza SQL, DEC-09 y acceso/RLS con Henry y Juan.
-- Idempotente al repetir esta propuesta; no reconcilia esquemas divergentes.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS public.proyecto_imagen (
    id_imagen bigserial,
    id_proyecto bigint NOT NULL,
    tipo_imagen varchar(20) NOT NULL DEFAULT 'photo',
    r2_key varchar(500),
    url_publica varchar(700) NOT NULL,
    titulo varchar(200),
    texto_alternativo varchar(250),
    es_portada boolean NOT NULL DEFAULT false,
    orden integer NOT NULL DEFAULT 0,
    fecha_creacion timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT proyecto_imagen_pkey PRIMARY KEY (id_imagen),
    CONSTRAINT fk_proyecto_imagen_proyecto FOREIGN KEY (id_proyecto)
        REFERENCES public.proyecto (id_proyecto) ON UPDATE NO ACTION ON DELETE RESTRICT,
    CONSTRAINT chk_proyecto_imagen_tipo CHECK (tipo_imagen IN ('photo', 'render')),
    CONSTRAINT chk_proyecto_imagen_orden CHECK (orden >= 0),
    CONSTRAINT chk_proyecto_imagen_url CHECK (length(btrim(url_publica)) > 0),
    CONSTRAINT chk_proyecto_imagen_key CHECK (r2_key IS NULL OR length(btrim(r2_key)) > 0)
);

CREATE TABLE IF NOT EXISTS public.propiedad_imagen (
    id_imagen bigserial,
    id_propiedad bigint NOT NULL,
    tipo_imagen varchar(20) NOT NULL DEFAULT 'photo',
    r2_key varchar(500),
    url_publica varchar(700) NOT NULL,
    titulo varchar(200),
    texto_alternativo varchar(250),
    es_portada boolean NOT NULL DEFAULT false,
    orden integer NOT NULL DEFAULT 0,
    fecha_creacion timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT propiedad_imagen_pkey PRIMARY KEY (id_imagen),
    CONSTRAINT fk_propiedad_imagen_propiedad FOREIGN KEY (id_propiedad)
        REFERENCES public.propiedad (id_propiedad) ON UPDATE NO ACTION ON DELETE RESTRICT,
    CONSTRAINT chk_propiedad_imagen_tipo CHECK (tipo_imagen IN ('photo', 'render')),
    CONSTRAINT chk_propiedad_imagen_orden CHECK (orden >= 0),
    CONSTRAINT chk_propiedad_imagen_url CHECK (length(btrim(url_publica)) > 0),
    CONSTRAINT chk_propiedad_imagen_key CHECK (r2_key IS NULL OR length(btrim(r2_key)) > 0)
);

-- El prefijo del indice compuesto tambien sirve para buscar por propietario.
-- id_imagen desempata ordenes iguales; orden no es una posicion unica.
CREATE INDEX IF NOT EXISTS idx_proyecto_imagen_proyecto_orden
    ON public.proyecto_imagen (id_proyecto, orden, id_imagen);
CREATE INDEX IF NOT EXISTS idx_propiedad_imagen_propiedad_orden
    ON public.propiedad_imagen (id_propiedad, orden, id_imagen);
-- Cero o una portada por entidad, entre TODOS los tipos de imagen.
CREATE UNIQUE INDEX IF NOT EXISTS uq_proyecto_imagen_portada
    ON public.proyecto_imagen (id_proyecto) WHERE es_portada;
CREATE UNIQUE INDEX IF NOT EXISTS uq_propiedad_imagen_portada
    ON public.propiedad_imagen (id_propiedad) WHERE es_portada;

-- Columnas opcionales: no rellenar ni reinterpretar el JSON existente.
ALTER TABLE public.servicio
    ADD COLUMN IF NOT EXISTS imagen_r2_key varchar(500),
    ADD COLUMN IF NOT EXISTS imagen_url varchar(700);
ALTER TABLE public.noticia
    ADD COLUMN IF NOT EXISTS imagen_r2_key varchar(500),
    ADD COLUMN IF NOT EXISTS imagen_url varchar(700);
ALTER TABLE public.contenido_pagina
    ADD COLUMN IF NOT EXISTS imagen_r2_key varchar(500),
    ADD COLUMN IF NOT EXISTS imagen_url varchar(700);
ALTER TABLE public.configuracion_sitio
    ADD COLUMN IF NOT EXISTS logo_r2_key varchar(500),
    ADD COLUMN IF NOT EXISTS logo_url varchar(700);

COMMIT;
