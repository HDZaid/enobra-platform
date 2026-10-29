-- HISTORICO: NO EJECUTAR. Sustituido por limpieza desde backend a los 90 dias.
CREATE OR REPLACE FUNCTION public.limpiar_proyectos_inactivos()
 RETURNS TABLE(marcados bigint, eliminados bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_marcados BIGINT := 0;
    v_eliminados BIGINT := 0;
BEGIN
    UPDATE public.proyecto
    SET
        estado_limpieza = 'PENDIENTE_ELIMINACION',
        fecha_marcado_eliminacion = NOW()
    WHERE publicado = FALSE
      AND destacado = FALSE
      AND estado_limpieza = 'ACTIVO'
      AND fecha_ultima_actividad <= NOW() - INTERVAL '8 months';

    GET DIAGNOSTICS v_marcados = ROW_COUNT;

    DELETE FROM public.proyecto
    WHERE publicado = FALSE
      AND destacado = FALSE
      AND estado_limpieza = 'PENDIENTE_ELIMINACION'
      AND fecha_marcado_eliminacion <= NOW() - INTERVAL '30 days'
      AND fecha_ultima_actividad <= fecha_marcado_eliminacion;

    GET DIAGNOSTICS v_eliminados = ROW_COUNT;

    RETURN QUERY SELECT v_marcados, v_eliminados;
END;
$function$
