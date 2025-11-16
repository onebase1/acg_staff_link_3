/**
 * Shift Helper Utilities
 * Common functions for working with shifts across the application
 */

/**
 * Determine shift type from start_time
 * Day shift: 06:00-18:00, Night shift: 18:00-06:00
 * @param {string} startTime - ISO timestamp or time string
 * @returns {string} 'day' or 'night'
 */
export function determineShiftType(startTime) {
  if (!startTime) return 'day'; // Default fallback
  
  const hour = new Date(startTime).getHours();
  return (hour >= 6 && hour < 18) ? 'day' : 'night';
}

/**
 * Extract shift type from role key
 * Role key format: "nurse_day" or "care_assistant_night"
 * @param {string} roleKey - Role key with shift type suffix
 * @returns {string} 'day' or 'night'
 */
export function extractShiftTypeFromRoleKey(roleKey) {
  if (!roleKey) return 'day'; // Default fallback
  
  return roleKey.endsWith('_day') ? 'day' : 'night';
}

/**
 * Get shift times from client preferences and shift type
 * @param {Object} client - Client object with shift time preferences
 * @param {string} shiftType - 'day' or 'night'
 * @returns {Object} { start: 'HH:MM', end: 'HH:MM' }
 */
export function getShiftTimes(client, shiftType) {
  const defaults = {
    day: { start: '08:00', end: '20:00' },
    night: { start: '20:00', end: '08:00' }
  };
  
  if (!client) return defaults[shiftType] || defaults.day;
  
  if (shiftType === 'day') {
    return {
      start: client.day_shift_start || '08:00',
      end: client.day_shift_end || '20:00'
    };
  } else {
    return {
      start: client.night_shift_start || '20:00',
      end: client.night_shift_end || '08:00'
    };
  }
}

/**
 * Format shift type for display
 * @param {string} shiftType - 'day' or 'night'
 * @returns {string} 'Day' or 'Night'
 */
export function formatShiftType(shiftType) {
  if (!shiftType) return 'Day';
  return shiftType.charAt(0).toUpperCase() + shiftType.slice(1);
}

/**
 * Get shift type badge variant
 * @param {string} shiftType - 'day' or 'night'
 * @returns {Object} { variant, className }
 */
export function getShiftTypeBadge(shiftType) {
  if (shiftType === 'night') {
    return {
      variant: 'outline',
      className: 'bg-indigo-50 text-indigo-700'
    };
  }
  return {
    variant: 'outline',
    className: 'bg-amber-50 text-amber-700'
  };
}

