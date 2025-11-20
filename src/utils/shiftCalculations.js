/**
 * Shift Financial Calculations Utility
 * 
 * Centralized functions for calculating shift earnings, charges, and billable hours.
 * All calculations account for break time to ensure accurate financial reporting.
 * 
 * @module shiftCalculations
 */

/**
 * Calculate billable hours for a shift (accounting for breaks)
 * 
 * Uses actual break_duration_minutes if available, otherwise defaults to 60 minutes (1 hour).
 * Ensures billable hours never go negative.
 * 
 * @param {Object} shift - Shift object with duration_hours and break_duration_minutes
 * @param {number} shift.duration_hours - Total shift duration in hours
 * @param {number} [shift.break_duration_minutes=60] - Break duration in minutes (defaults to 60)
 * @returns {number} Billable hours (always >= 0)
 * 
 * @example
 * // 12-hour shift with 60-minute break
 * calculateBillableHours({ duration_hours: 12, break_duration_minutes: 60 })
 * // Returns: 11
 * 
 * @example
 * // 8-hour shift with no break specified (defaults to 60 mins)
 * calculateBillableHours({ duration_hours: 8 })
 * // Returns: 7
 */
export function calculateBillableHours(shift) {
  if (!shift || typeof shift.duration_hours !== 'number') {
    return 0;
  }

  const breakHours = (shift.break_duration_minutes || 60) / 60;
  const billableHours = shift.duration_hours - breakHours;
  
  // Ensure we never return negative hours
  return Math.max(0, billableHours);
}

/**
 * Calculate staff earnings for a shift
 * 
 * Calculates: billable_hours * pay_rate
 * 
 * @param {Object} shift - Shift object
 * @param {number} shift.duration_hours - Total shift duration in hours
 * @param {number} [shift.break_duration_minutes=60] - Break duration in minutes
 * @param {number} shift.pay_rate - Hourly pay rate for staff
 * @returns {number} Staff earnings amount
 * 
 * @example
 * // 12-hour shift at £15/hour with 60-minute break
 * calculateStaffEarnings({ duration_hours: 12, break_duration_minutes: 60, pay_rate: 15 })
 * // Returns: 165 (11 hours * £15)
 */
export function calculateStaffEarnings(shift) {
  if (!shift) {
    return 0;
  }

  const billableHours = calculateBillableHours(shift);
  const payRate = shift.pay_rate || 0;
  
  return billableHours * payRate;
}

/**
 * Calculate client charge for a shift
 * 
 * Calculates: billable_hours * charge_rate
 * 
 * @param {Object} shift - Shift object
 * @param {number} shift.duration_hours - Total shift duration in hours
 * @param {number} [shift.break_duration_minutes=60] - Break duration in minutes
 * @param {number} shift.charge_rate - Hourly charge rate for client
 * @returns {number} Client charge amount
 * 
 * @example
 * // 12-hour shift at £20/hour charge with 60-minute break
 * calculateClientCharge({ duration_hours: 12, break_duration_minutes: 60, charge_rate: 20 })
 * // Returns: 220 (11 hours * £20)
 */
export function calculateClientCharge(shift) {
  if (!shift) {
    return 0;
  }

  const billableHours = calculateBillableHours(shift);
  const chargeRate = shift.charge_rate || 0;
  
  return billableHours * chargeRate;
}

/**
 * Calculate margin for a shift
 * 
 * Calculates: client_charge - staff_earnings
 * 
 * @param {Object} shift - Shift object
 * @returns {number} Margin amount
 * 
 * @example
 * // 12-hour shift: £20 charge, £15 pay, 60-min break
 * calculateShiftMargin({ duration_hours: 12, break_duration_minutes: 60, charge_rate: 20, pay_rate: 15 })
 * // Returns: 55 (£220 - £165)
 */
export function calculateShiftMargin(shift) {
  const clientCharge = calculateClientCharge(shift);
  const staffEarnings = calculateStaffEarnings(shift);
  
  return clientCharge - staffEarnings;
}

/**
 * Calculate margin percentage for a shift
 * 
 * Calculates: (margin / client_charge) * 100
 * 
 * @param {Object} shift - Shift object
 * @returns {number} Margin percentage (0-100)
 * 
 * @example
 * // 12-hour shift: £20 charge, £15 pay, 60-min break
 * calculateShiftMarginPercentage({ duration_hours: 12, break_duration_minutes: 60, charge_rate: 20, pay_rate: 15 })
 * // Returns: 25 (£55 margin / £220 charge * 100)
 */
export function calculateShiftMarginPercentage(shift) {
  const clientCharge = calculateClientCharge(shift);
  
  if (clientCharge === 0) {
    return 0;
  }
  
  const margin = calculateShiftMargin(shift);
  return (margin / clientCharge) * 100;
}

/**
 * Calculate financial summary for multiple shifts
 * 
 * @param {Array<Object>} shifts - Array of shift objects
 * @returns {Object} Financial summary with totals and margins
 * 
 * @example
 * calculateFinancialSummary([shift1, shift2, shift3])
 * // Returns: { totalStaffCost, totalClientRevenue, margin, marginPercentage, totalShifts }
 */
export function calculateFinancialSummary(shifts) {
  if (!Array.isArray(shifts) || shifts.length === 0) {
    return {
      totalShifts: 0,
      totalStaffCost: '0.00',
      totalClientRevenue: '0.00',
      margin: '0.00',
      marginPercentage: '0.0'
    };
  }

  let totalStaffCost = 0;
  let totalClientRevenue = 0;

  shifts.forEach(shift => {
    totalStaffCost += calculateStaffEarnings(shift);
    totalClientRevenue += calculateClientCharge(shift);
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

