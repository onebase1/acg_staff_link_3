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

        // Check if geofencing is enabled for this client
        if (client.geofence_enabled === false) {
            console.log(`⏭️  [Client: ${client.name}] Geofencing disabled`);

            // Update timesheet if provided (mark as validated by policy)
            if (timesheet_id) {
                await supabase
                    .from("timesheets")
                    .update({
                        geofence_validated: true,
                        geofence_distance_meters: null,
                        geofence_violation_reason: 'Geofencing disabled for this client'
                    })
                    .eq("id", timesheet_id);
            }

            return new Response(JSON.stringify({
                success: true,
                validated: true,
                reason: 'geofence_disabled',
                message: 'Geofencing is disabled for this client'
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Check if client has coordinates
        if (!client.location_coordinates?.latitude || !client.location_coordinates?.longitude) {
            console.log(`⚠️  [Client: ${client.name}] No GPS coordinates set`);

            if (timesheet_id) {
                await supabase
                    .from("timesheets")
                    .update({
                        geofence_validated: true,
                        geofence_distance_meters: null,
                        geofence_violation_reason: 'Client location not configured'
                    })
                    .eq("id", timesheet_id);
            }

            return new Response(JSON.stringify({
                success: true,
                validated: true,
                reason: 'no_client_coordinates',
                message: 'Client GPS coordinates not configured - validation skipped',
                warning: 'Please set client coordinates in Client settings'
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Haversine formula for distance calculation
        const toRadians = (degrees) => degrees * (Math.PI / 180);

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

        const distanceMeters = Math.round(R * c);

        const geofenceRadius = client.geofence_radius_meters || 100; // Default 100m
        const isWithinGeofence = distanceMeters <= geofenceRadius;

        console.log(`📏 [Distance Check] ${distanceMeters}m from client (limit: ${geofenceRadius}m) - ${isWithinGeofence ? 'PASS' : 'FAIL'}`);

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
