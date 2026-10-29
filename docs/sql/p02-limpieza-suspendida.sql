-- Aplicada por autorizacion explicita de Geovanny el 29-oct-2026.
CREATE OR REPLACE FUNCTION public.limpiar_proyectos_inactivos()
 RETURNS TABLE(marcados bigint, eliminados bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- P-02: suspendida por autorizacion de Geovanny, 2026-10-29.
    -- No reactivar sin validar papelera, historial y metadatos.
    RETURN QUERY SELECT 0::bigint, 0::bigint;
END;
$function$
