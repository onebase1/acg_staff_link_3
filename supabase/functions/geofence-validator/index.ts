import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * TIER 3A: Geofence Validator
 *
 * Validates staff GPS location against client geofence
 * Uses Haversine formula for accurate distance calculation
 *
 * Returns: validation result + distance in meters
 *
 * ROLLBACK: Feature can be disabled per-client (geofence_enabled = false)
 */

// CORS headers for mobile browser support
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { staff_location, client_id, timesheet_id } = await req.json();

        if (!staff_location || !client_id) {
            return new Response(JSON.stringify({
                success: false,
                error: 'staff_location {latitude, longitude} and client_id required'
            }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        console.log(`📍 [Geofence Validator] Checking location for client ${client_id}`);

        // Get client details
        const { data: clients } = await supabase
            .from("clients")
            .select("*")
            .eq("id", client_id);

        if (!clients || clients.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Client not found'
            }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const client = clients[0];

        // 🛡️ [Verified Arrival] Always calculate distance if coordinates are available
        let distanceMeters = null;
        let isWithinGeofence = null;
        const geofenceRadius = client.geofence_radius_meters || 100; // Default 100m

        if (client.location_coordinates?.latitude && client.location_coordinates?.longitude) {
            const toRadians = (degrees: number) => degrees * (Math.PI / 180);

            const lat1 = staff_location.latitude;
            const lon1 = staff_location.longitude;
            const lat2 = client.location_coordinates.latitude;
            const lon2 = client.location_coordinates.longitude;

            const R = 6371000; // Earth's radius in meters
            const φ1 = toRadians(lat1);
            const φ2 = toRadians(lat2);
            const Δφ = toRadians(lat2 - lat1);
            const Δλ = toRadians(lon2 - lon1);

            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                      Math.cos(φ1) * Math.cos(φ2) *
                      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            distanceMeters = Math.round(R * c);
            isWithinGeofence = distanceMeters <= geofenceRadius;
            console.log(`📏 [Distance Check] ${client.name}: ${distanceMeters}m from site (radius: ${geofenceRadius}m)`);
        }

        // Check if geofencing is enabled for this client (Enforcement Step)
        if (client.geofence_enabled === false) {
            console.log(`⏭️  [Client: ${client.name}] Geofencing NOT ENFORCED (Policy Bypass)`);

            // Update timesheet (always save distance if we have it)
            if (timesheet_id) {
                await supabase
                    .from("timesheets")
                    .update({
                        geofence_validated: true, // Policy bypass
                        geofence_distance_meters: distanceMeters,
                        geofence_violation_reason: distanceMeters !== null 
                            ? (isWithinGeofence ? 'Verified on-site (enforcement off)' : `Staff was ${distanceMeters}m away (enforcement off)`)
                            : 'Geofencing disabled - no coordinates'
                    })
                    .eq("id", timesheet_id);
            }

            return new Response(JSON.stringify({
                success: true,
                validated: true,
                is_on_site: isWithinGeofence, // New flag for visibility logic
                distance_meters: distanceMeters,
                reason: 'geofence_disabled',
                message: 'Geofencing is disabled for this client (Policy Pass)'
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // --- ENFORCEMENT LOGIC (Only reached if geofence_enabled is true) ---

        // Check if client has coordinates (if enabled, this is a soft fail)
        if (!client.location_coordinates?.latitude || !client.location_coordinates?.longitude) {
            console.log(`⚠️  [Client: ${client.name}] No GPS coordinates set`);

            if (timesheet_id) {
                await supabase
                    .from("timesheets")
                    .update({
                        geofence_validated: true, // Policy pass due to missing client coordinates
                        geofence_distance_meters: distanceMeters,
                        geofence_violation_reason: 'Client location not configured'
                    })
                    .eq("id", timesheet_id);
            }

            return new Response(JSON.stringify({
                success: true,
                validated: true,
                is_on_site: isWithinGeofence,
                distance_meters: distanceMeters,
                reason: 'no_client_coordinates',
                message: 'Client GPS coordinates not configured - validation skipped',
                warning: 'Please set client coordinates in Client settings'
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        console.log(`🛡️  [Enforcement] geofence_enabled = TRUE. Result: ${isWithinGeofence ? 'PASS' : 'FAIL'}`);

        // Update timesheet if provided
        if (timesheet_id) {
            const updateData = {
                geofence_validated: isWithinGeofence,
                geofence_distance_meters: distanceMeters,
                location_verified: isWithinGeofence
            };

            if (!isWithinGeofence) {
                updateData.geofence_violation_reason = `Staff was ${distanceMeters}m away (limit: ${geofenceRadius}m)`;
            }

            await supabase
                .from("timesheets")
                .update(updateData)
                .eq("id", timesheet_id);
        }

        return new Response(JSON.stringify({
            success: true,
            validated: isWithinGeofence,
            is_on_site: isWithinGeofence,
            distance_meters: distanceMeters,
            geofence_radius_meters: geofenceRadius,
            client_name: client.name,
            client_address: client.address ? `${client.address.line1}, ${client.address.postcode}` : 'N/A',
            gps_accuracy: staff_location.accuracy || null,
            reason: isWithinGeofence ? 'within_geofence' : 'outside_geofence',
            message: isWithinGeofence
                ? `✅ Verified: ${distanceMeters}m from ${client.name}`
                : `❌ Too far: ${distanceMeters}m from ${client.name} (limit: ${geofenceRadius}m)`,
            recommended_action: !isWithinGeofence
                ? 'Contact staff to confirm location. If legitimate, admin can override in timesheet approval.'
                : null
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('❌ [Geofence Validator] Fatal error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
