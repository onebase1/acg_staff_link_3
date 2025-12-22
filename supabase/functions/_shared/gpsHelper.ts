/**
 * 📍 GPS HELPER
 * 
 * Centralized logic for determining if a shift requires GPS clock-in/out.
 * Uses hybrid approach: shift-level override > client default
 * 
 * Logic:
 * - shift.requires_gps = TRUE  → GPS required (override)
 * - shift.requires_gps = FALSE → No GPS needed (override)
 * - shift.requires_gps = NULL  → Inherit from client.geofence_enabled
 * - client.geofence_enabled = FALSE → No GPS needed
 * - client.geofence_enabled = TRUE/NULL → GPS required (default)
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ShiftWithGPS {
  id: string;
  requires_gps?: boolean | null;
  client_id?: string;
}

export interface ClientWithGeofence {
  id?: string;
  geofence_enabled?: boolean | null;
}

/**
 * Determine if a shift requires GPS clock-in/out
 * 
 * @param shift - The shift object (must have requires_gps field)
 * @param client - The client object (must have geofence_enabled field)
 * @returns boolean - true if GPS is required, false otherwise
 */
export function shiftRequiresGPS(
  shift: ShiftWithGPS,
  client?: ClientWithGeofence | null
): boolean {
  // Shift-level override wins (explicit TRUE or FALSE)
  if (shift.requires_gps === true) {
    return true;
  }
  if (shift.requires_gps === false) {
    return false;
  }
  
  // Fall back to client setting
  // If client has geofence_enabled = false, no GPS needed
  // Otherwise (true or null/undefined), GPS is required (safe default)
  if (client?.geofence_enabled === false) {
    return false;
  }
  
  // Default: GPS required
  return true;
}

/**
 * Fetch shift with GPS requirement and client info
 * Returns the shift plus whether GPS is required
 */
export async function getShiftWithGPSRequirement(
  supabase: SupabaseClient,
  shiftId: string
): Promise<{ shift: any; requiresGPS: boolean } | null> {
  const { data: shift, error } = await supabase
    .from('shifts')
    .select(`
      *,
      clients!inner (
        id,
        name,
        geofence_enabled,
        latitude,
        longitude,
        geofence_radius
      )
    `)
    .eq('id', shiftId)
    .single();

  if (error || !shift) {
    console.error('❌ [GPS Helper] Failed to fetch shift:', error);
    return null;
  }

  const requiresGPS = shiftRequiresGPS(shift, shift.clients);
  
  return { shift, requiresGPS };
}

/**
 * Log GPS decision for debugging
 */
export function logGPSDecision(
  shiftId: string,
  shiftRequiresGpsFlag: boolean | null | undefined,
  clientGeofenceEnabled: boolean | null | undefined,
  finalDecision: boolean
): void {
  const shiftOverride = shiftRequiresGpsFlag === null || shiftRequiresGpsFlag === undefined
    ? 'inherit'
    : shiftRequiresGpsFlag;
  
  console.log(`📍 [GPS Helper] Shift ${shiftId}: ` +
    `shift.requires_gps=${shiftOverride}, ` +
    `client.geofence_enabled=${clientGeofenceEnabled ?? 'default'} → ` +
    `GPS ${finalDecision ? 'REQUIRED' : 'NOT REQUIRED'}`);
}

