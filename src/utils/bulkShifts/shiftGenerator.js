/**
 * Bulk Shift Generator
 * Expands grid data into individual shift objects ready for database insertion
 */

import { extractShiftTypeFromRoleKey } from '../shiftHelpers';
import { calculateFinancialSummary as centralizedCalc } from '../shiftCalculations';


/**
 * Generate individual shift objects from grid data
 * @param {Object} gridData - { 'YYYY-MM-DD': { roleKey: quantity } }
 * @param {Array} activeRoles - Array of role configurations
 * @param {Object} client - Client object with defaults
 * @param {Object} formData - Additional form data
 * @param {string} agencyId - Current agency ID
 * @param {Object} user - Current user object
 * @returns {Array} Array of shift objects
 */
export function expandGridToShifts(gridData, activeRoles, client, formData, agencyId, user) {
  const shifts = [];
  let shiftIndex = 0;

  // ✅ Generate batch_id for all shifts in this bulk creation
  // This allows us to track which shifts belong together and detect batch completion
  const batchId = crypto.randomUUID();

  // Iterate through each date in grid
  Object.entries(gridData).forEach(([date, roleQuantities]) => {
    // For each role/shift type combination
    Object.entries(roleQuantities).forEach(([roleKey, quantity]) => {
      if (!quantity || quantity <= 0) return;

      // Find role configuration
      const roleConfig = activeRoles.find(r => r.key === roleKey);
      if (!roleConfig) return;

      // Generate individual shift objects (quantity times)
      for (let i = 0; i < quantity; i++) {
        const shift = createShiftObject(
          date,
          roleConfig,
          client,
          formData,
          agencyId,
          user,
          shiftIndex++,
          batchId  // ✅ Pass batch_id to each shift
        );
        shifts.push(shift);
      }
    });
  });

  return shifts;
}

/**
 * Create a single shift object
 */
function createShiftObject(date, roleConfig, client, formData, agencyId, user, index, batchId) {
  // Get shift times
  const shiftTimes = formData.shiftTimes?.[roleConfig.shiftType] || {
    start: roleConfig.shiftType === 'day' ? '08:00' : '20:00',
    end: roleConfig.shiftType === 'day' ? '20:00' : '08:00'
  };

  // ✅ FIX: Database expects HH:MM format (TEXT), NOT full timestamps
  // Just use the time values directly from shiftTimes
  const startTime = shiftTimes.start; // e.g., "08:00"
  const endTime = shiftTimes.end;     // e.g., "20:00"

  // ✅ FIX: Calculate actual duration from times (not hardcoded)
  // Parse start and end times
  const [startHour, startMin] = shiftTimes.start.split(':').map(Number);
  const [endHour, endMin] = shiftTimes.end.split(':').map(Number);

  let durationHours;
  if (endHour < startHour || (endHour === startHour && endMin < startMin)) {
    // Overnight shift: end time is next day
    // e.g., 22:00 to 08:00 = (24 - 22) + 8 = 10 hours
    durationHours = (24 - startHour - startMin/60) + (endHour + endMin/60);
  } else {
    // Same day shift
    // e.g., 08:00 to 20:00 = 12 hours
    durationHours = (endHour + endMin/60) - (startHour + startMin/60);
  }

  // Round to 2 decimal places
  durationHours = Math.round(durationHours * 100) / 100;

  return {
    // Temporary ID for preview (will be removed before insert)
    temp_id: `temp-${date}-${roleConfig.key}-${index}`,

    // Core fields
    client_id: client.id,
    agency_id: agencyId,
    role_required: roleConfig.role,
    shift_type: roleConfig.shiftType, // ✅ NEW: Explicit shift_type from role config
    date: date,
    start_time: startTime, // ✅ FIXED: Send HH:MM only (e.g., "08:00")
    end_time: endTime,     // ✅ FIXED: Send HH:MM only (e.g., "20:00")
    duration_hours: durationHours, // ✅ FIXED: Calculated from actual times (not hardcoded)

    // ✅ BATCH TRACKING: Assign booking_id to track which shifts belong together
    booking_id: batchId,

    // Rates
    pay_rate: roleConfig.payRate || 0,
    charge_rate: roleConfig.chargeRate || 0,

    // Additional fields
    break_duration_minutes: formData.break_duration_minutes || 0,
    work_location_within_site: formData.work_location_within_site || '',
    urgency: formData.urgency || 'normal',
    notes: formData.notes || '',

    // Status
    status: 'open',
    marketplace_visible: false, // ✅ FIXED: Manual approval required (admin toggles in UI)

    // Journey log
    shift_journey_log: [{
      state: 'created',
      timestamp: new Date().toISOString(),
      user_id: user?.id,
      method: 'bulk_creation',
      metadata: {
        batch_creation: true,
        batch_id: batchId,  // ✅ Track batch_id in journey log
        role_config: roleConfig.key
      }
    }],

    // Metadata
    created_date: new Date().toISOString(),
    created_by: user?.email
  };
}

/**
 * Group shifts by date for preview display
 */
export function groupShiftsByDate(shifts) {
  const grouped = {};

  shifts.forEach(shift => {
    if (!grouped[shift.date]) {
      grouped[shift.date] = {
        date: shift.date,
        shifts: [],
        totalCount: 0,
        byRole: {}
      };
    }

    grouped[shift.date].shifts.push(shift);
    grouped[shift.date].totalCount++;

    // Group by role - use shift_type from shift object
    const roleKey = `${shift.role_required}_${shift.shift_type || 'day'}`;
    if (!grouped[shift.date].byRole[roleKey]) {
      grouped[shift.date].byRole[roleKey] = {
        role: shift.role_required,
        shiftType: shift.shift_type || 'day',
        count: 0,
        shifts: []
      };
    }

    grouped[shift.date].byRole[roleKey].count++;
    grouped[shift.date].byRole[roleKey].shifts.push(shift);
  });

  return grouped;
}

/**
 * Calculate financial summary
 * Updated to use centralized calculation functions that account for break time
 */
export function calculateFinancialSummary(shifts) {
  return centralizedCalc(shifts);
}

/**
 * Prepare shifts for database insertion
 * Removes temporary/display-only fields that don't exist in the database schema
 */
export function prepareShiftsForInsert(shifts) {
  return shifts.map(shift => {
    // Remove fields that don't exist in database or cause issues:
    // - temp_id: preview-only identifier
    // - shift_cost, client_charge: display-only calculated fields (not in DB)
    // - role: legacy field (use role_required instead)
    // NOTE: duration_hours is NOW included (calculated in generateShift)
    const {
      temp_id,
      _tempId,
      shift_cost,
      client_charge,
      role,  // Remove if role_required is present (role is legacy)
      ...shiftData
    } = shift;
    return shiftData;
  });
}
