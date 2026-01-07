-- Fix for 42883 error: function public.auto_assign_shift(uuid) does not exist
-- The trigger was calling the function with a single argument, but the function requires (shift_id, agency_id, exclusions)

CREATE OR REPLACE FUNCTION public.execute_auto_assignment_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Call the RPC function with both required arguments
    PERFORM public.auto_assign_shift(NEW.id, NEW.agency_id);
    RETURN NEW;
END;
$function$;
