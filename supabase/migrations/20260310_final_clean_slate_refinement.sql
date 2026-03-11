-- Final refinement of Clean Slate functions to ensure NO orphans
-- Updates delete_agency_shifts and reset_agency_data

OR REPLACE FUNCTION public.delete_agency_shifts(p_agency_id uuid)
RETURNS void AS $$
BEGIN
    -- Delete related records first to avoid foreign key violations
    DELETE FROM admin_workflows WHERE agency_id = p_agency_id;
    DELETE FROM interaction_logs WHERE agency_id = p_agency_id;
    
    -- Sub-child records of shifts
    DELETE FROM bookings WHERE shift_id IN (SELECT id FROM shifts WHERE agency_id = p_agency_id);
    DELETE FROM client_ratings WHERE shift_id IN (SELECT id FROM shifts WHERE agency_id = p_agency_id);
    DELETE FROM operational_costs WHERE shift_id IN (SELECT id FROM shifts WHERE agency_id = p_agency_id);
    DELETE FROM disputes WHERE shift_id IN (SELECT id FROM shifts WHERE agency_id = p_agency_id);
    DELETE FROM staff_match_scores WHERE shift_id IN (SELECT id FROM shifts WHERE agency_id = p_agency_id);
    DELETE FROM timesheets WHERE shift_id IN (SELECT id FROM shifts WHERE agency_id = p_agency_id);
    
    -- Finally delete shifts
    DELETE FROM shifts WHERE agency_id = p_agency_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

OR REPLACE FUNCTION public.reset_agency_data(p_agency_id uuid)
RETURNS void AS $$
BEGIN
    -- 1. Full shift cleanup (using helper above)
    PERFORM public.delete_agency_shifts(p_agency_id);
    
    -- 2. Staff related cleanup
    DELETE FROM staff_compliance WHERE staff_id IN (SELECT id FROM staff WHERE agency_id = p_agency_id);
    DELETE FROM staff_availability WHERE staff_id IN (SELECT id FROM staff WHERE agency_id = p_agency_id);
    
    -- 3. Invoices and related
    DELETE FROM invoices WHERE agency_id = p_agency_id;
    
    -- 4. Clients relative to agency
    DELETE FROM clients WHERE agency_id = p_agency_id;
    
    -- 5. Staff relative to agency (except admins)
    DELETE FROM staff WHERE agency_id = p_agency_id AND role != 'agency_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
