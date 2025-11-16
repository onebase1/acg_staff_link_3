/**
 * ✅ CLIENT HELPER UTILITIES
 * 
 * Centralized functions for working with client data:
 * - Extract enabled roles
 * - Get shift times based on window configuration
 * - Get rates for specific role/shift combinations
 * - Normalize role names
 */

import { normalizeRole } from '@/constants/staffRoles';

/**
 * Get list of enabled roles for a client
 * A role is enabled if it has a charge_rate > 0
 * 
 * @param {Object} client - Client object from database
 * @returns {string[]} Array of enabled role values (canonical names)
 */
export function getEnabledRoles(client) {
  if (!client) return [];
  
  // Check enabled_roles field first (new approach)
  if (client.enabled_roles && typeof client.enabled_roles === 'object') {
    return Object.keys(client.enabled_roles)
      .filter(role => client.enabled_roles[role] === true)
      .map(role => normalizeRole(role));
  }
  
  // Fallback: derive from rates_by_role (legacy)
  const rates = client.contract_terms?.rates_by_role || {};
  return Object.keys(rates)
    .filter(role => {
      const rate = rates[role];
      return rate && (rate.charge_rate > 0 || rate.pay_rate > 0);
    })
    .map(role => normalizeRole(role));
}

/**
 * Get shift times based on client's shift window configuration
 * 
 * @param {Object} client - Client object from database
 * @param {string} shiftType - 'day' or 'night'
 * @returns {Object} { start: 'HH:MM', end: 'HH:MM', hours: number }
 */
export function getShiftTimes(client, shiftType = 'day') {
  const defaults = {
    '8_to_8': {
      day: { start: '08:00', end: '20:00', hours: 12 },
      night: { start: '20:00', end: '08:00', hours: 12 }
    },
    '7_to_7': {
      day: { start: '07:00', end: '19:00', hours: 12 },
      night: { start: '19:00', end: '07:00', hours: 12 }
    }
  };
  
  if (!client) {
    return defaults['8_to_8'][shiftType] || defaults['8_to_8'].day;
  }
  
  // Use client's shift_window_type if available
  const windowType = client.shift_window_type || '8_to_8';
  const times = defaults[windowType]?.[shiftType] || defaults['8_to_8'].day;
  
  // Override with client's custom times if set
  if (shiftType === 'day' && client.day_shift_start && client.day_shift_end) {
    return {
      start: client.day_shift_start,
      end: client.day_shift_end,
      hours: 12
    };
  }
  
  if (shiftType === 'night' && client.night_shift_start && client.night_shift_end) {
    return {
      start: client.night_shift_start,
      end: client.night_shift_end,
      hours: 12
    };
  }
  
  return times;
}

/**
 * Get rates for a specific role and shift type
 * Handles both simple and advanced rate models
 * 
 * @param {Object} client - Client object from database
 * @param {string} role - Role value (will be normalized)
 * @param {string} shiftType - 'day' or 'night'
 * @param {Date} date - Date of shift (for weekend/bank holiday detection)
 * @returns {Object} { pay_rate: number, charge_rate: number }
 */
export function getClientRates(client, role, shiftType = 'day', date = new Date()) {
  if (!client) return { pay_rate: 0, charge_rate: 0 };

  const normalizedRole = normalizeRole(role);

  // Check if advanced rate card is enabled
  const advancedCard = client.contract_terms?.advanced_rate_card;
  if (advancedCard?.enabled && advancedCard.rate_structure) {
    return getAdvancedRate(advancedCard.rate_structure, normalizedRole, shiftType, date);
  }

  // Fallback to simple rates
  // Try normalized role first (e.g., 'healthcare_assistant')
  let simpleRates = client.contract_terms?.rates_by_role?.[normalizedRole];

  // If not found, try common aliases (e.g., 'hca', 'care_worker')
  if (!simpleRates) {
    const ratesByRole = client.contract_terms?.rates_by_role || {};

    // For healthcare_assistant, also check 'hca' and 'care_worker'
    if (normalizedRole === 'healthcare_assistant') {
      simpleRates = ratesByRole['hca'] || ratesByRole['care_worker'];
    }
    // For other roles, check if the original role exists
    else if (!simpleRates) {
      simpleRates = ratesByRole[role];
    }
  }

  if (simpleRates) {
    return {
      pay_rate: simpleRates.pay_rate || 0,
      charge_rate: simpleRates.charge_rate || 0
    };
  }

  return { pay_rate: 0, charge_rate: 0 };
}

/**
 * Get rate from advanced rate card
 * @private
 */
function getAdvancedRate(rateStructure, role, shiftType, date) {
  const roleRates = rateStructure[role];
  if (!roleRates) return { pay_rate: 0, charge_rate: 0 };
  
  // Determine rate type based on date and shift type
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const isBankHoliday = false; // TODO: Implement bank holiday detection
  
  let rateType;
  if (isBankHoliday) {
    rateType = 'bank_holiday';
  } else if (isWeekend) {
    rateType = shiftType === 'day' ? 'weekend_day' : 'weekend_night';
  } else {
    rateType = shiftType === 'day' ? 'weekday_day' : 'weekday_night';
  }
  
  const rates = roleRates[rateType];
  return {
    pay_rate: rates?.pay_rate || 0,
    charge_rate: rates?.charge_rate || 0
  };
}

/**
 * Check if a role is enabled for a client
 * 
 * @param {Object} client - Client object from database
 * @param {string} role - Role value to check
 * @returns {boolean} True if role is enabled
 */
export function isRoleEnabled(client, role) {
  const enabledRoles = getEnabledRoles(client);
  const normalizedRole = normalizeRole(role);
  return enabledRoles.includes(normalizedRole);
}

