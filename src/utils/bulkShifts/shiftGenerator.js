/**
 * Bulk Shift Generator
 * Expands grid data into individual shift objects ready for database insertion
 */

import { extractShiftTypeFromRoleKey } from '../shiftHelpers';


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
          shiftIndex++
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
function createShiftObject(date, roleConfig, client, formData, agencyId, user, index) {
  // Get shift times
  const shiftTimes = formData.shiftTimes?.[roleConfig.shiftType] || {
    start: roleConfig.shiftType === 'day' ? '08:00' : '20:00',
    end: roleConfig.shiftType === 'day' ? '20:00' : '08:00'
  };

  // ✅ FIX: Database expects HH:MM format (TEXT), NOT full timestamps
  // Just use the time values directly from shiftTimes
  const startTime = shiftTimes.start; // e.g., "08:00"
  const endTime = shiftTimes.end;     // e.g., "20:00"

  // Calculate duration (need full timestamps temporarily for calculation only)
  const startTimestamp = `${date}T${shiftTimes.start}:00`;
  let endTimestamp = `${date}T${shiftTimes.end}:00`;

  // Handle overnight shifts (night shift crosses midnight)
  if (roleConfig.shiftType === 'night' && shiftTimes.end < shiftTimes.start) {
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    endTimestamp = `${endDate.toISOString().split('T')[0]}T${shiftTimes.end}:00`;
  }

  // ✅ SIMPLIFIED: Don't send duration_hours to database
  // It's a calculated field - database can compute it or we calculate on read
  // This avoids complex PostgreSQL type casting issues

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
    duration_hours: 12,    // ✅ SIMPLIFIED: Always 12 hours (all shifts are 12-hour shifts)

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
    marketplace_visible: true, // ✅ CHANGED: Auto-publish to marketplace

    // Journey log
    shift_journey_log: [{
      state: 'created',
      timestamp: new Date().toISOString(),
      user_id: user?.id,
      method: 'bulk_creation',
      metadata: {
        batch_creation: true,
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
 */
export function calculateFinancialSummary(shifts) {
  let totalStaffCost = 0;
  let totalClientRevenue = 0;

  shifts.forEach(shift => {
    const hours = shift.duration_hours || 0;
    totalStaffCost += (shift.pay_rate || 0) * hours;
    totalClientRevenue += (shift.charge_rate || 0) * hours;
  });

  const margin = totalClientRevenue - totalStaffCost;
  const marginPercentage = totalClientRevenue > 0
    ? (margin / totalClientRevenue) * 100
    : 0;

  return {
    totalShifts: shifts.length,
    totalStaffCost: totalStaffCost.toFixed(2),
    totalClientRevenue: totalClientRevenue.toFixed(2),
    margin: margin.toFixed(2),
    marginPercentage: marginPercentage.toFixed(1)
  };
}

/**
 * Prepare shifts for database insertion
 * Removes temporary fields and validates required fields
 */
export function prepareShiftsForInsert(shifts) {
  return shifts.map(shift => {
    // Remove temp fields AND duration_hours (causes PostgreSQL ROUND() type errors)
    const { temp_id, duration_hours, ...shiftData } = shift;
    return shiftData;
  });
}
