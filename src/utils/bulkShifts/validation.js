/**
 * Bulk Shift Validation
 * Validates shifts before database insertion
 */

/**
 * Validate all shifts
 * @param {Array} shifts - Array of shift objects
 * @param {Object} options - Validation options
 * @returns {Object} { errors: [], warnings: [], info: [], isValid: boolean }
 */
export function validateBulkShifts(shifts, options = {}) {
  const errors = [];
  const warnings = [];
  const info = [];

  // Check if array is empty
  if (!shifts || shifts.length === 0) {
    errors.push('No shifts to create. Please enter quantities in the calendar grid.');
    return { errors, warnings, info, isValid: false };
  }

  // Check for duplicates within the batch (INFO only - not blocking)
  const duplicates = findDuplicateShifts(shifts);
  if (duplicates.length > 0) {
    const uniqueDates = [...new Set(duplicates.map(d => d.date))];
    info.push(`Note: Creating multiple shifts for same role/time on ${uniqueDates.length} date(s). This is normal for shift scheduling.`);
  }

  // Validate each shift
  shifts.forEach((shift, index) => {
    // Required fields
    if (!shift.client_id) {
      errors.push(`Shift ${index + 1}: Missing client_id`);
    }
    if (!shift.agency_id) {
      errors.push(`Shift ${index + 1}: Missing agency_id`);
    }
    if (!shift.role_required) {
      errors.push(`Shift ${index + 1}: Missing role`);
    }
    if (!shift.date) {
      errors.push(`Shift ${index + 1}: Missing date`);
    }
    if (!shift.start_time || !shift.end_time) {
      errors.push(`Shift ${index + 1}: Missing start or end time`);
    }

    // Validate rates
    if (!shift.pay_rate || shift.pay_rate <= 0) {
      errors.push(`Shift ${index + 1}: Invalid pay rate`);
    }
    if (!shift.charge_rate || shift.charge_rate <= 0) {
      errors.push(`Shift ${index + 1}: Invalid charge rate`);
    }

    // NOTE: Past date validation removed - UI now blocks past date selection

    // Warnings for weekends
    if (shift.date && isWeekend(shift.date)) {
      const existing = warnings.find(w => w.includes('weekend'));
      if (!existing) {
        const weekendCount = shifts.filter(s => isWeekend(s.date)).length;
        warnings.push(`${weekendCount} shift(s) fall on weekends (check premium rates)`);
      }
    }
  });

  return {
    errors: [...new Set(errors)], // Remove duplicates
    warnings: [...new Set(warnings)],
    info: [...new Set(info)],
    isValid: errors.length === 0
  };
}

/**
 * Find duplicate shifts
 */
function findDuplicateShifts(shifts) {
  const seen = new Map();
  const duplicates = [];

  shifts.forEach(shift => {
    const key = `${shift.client_id}_${shift.date}_${shift.start_time}_${shift.role_required}`;

    if (seen.has(key)) {
      duplicates.push(shift);
    } else {
      seen.set(key, true);
    }
  });

  return duplicates;
}

/**
 * Check if date is weekend
 */
function isWeekend(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Check for existing shifts in database (async)
 * @param {Object} supabase - Supabase client
 * @param {string} clientId - Client ID
 * @param {Array} dates - Array of date strings
 * @returns {Promise<Object>} { info: [], datesWithShifts: [] }
 */
export async function checkExistingShifts(supabase, clientId, dates) {
  const info = [];
  const datesWithShifts = [];

  if (!supabase || !clientId || !dates || dates.length === 0) {
    return { info, datesWithShifts };
  }

  try {
    // Query existing shifts for this client in the date range
    const { data: existingShifts, error } = await supabase
      .from('shifts')
      .select('date, role_required, shift_type')
      .eq('client_id', clientId)
      .in('date', dates);

    if (error) {
      console.error('Error checking existing shifts:', error);
      return { info, datesWithShifts };
    }

    if (existingShifts && existingShifts.length > 0) {
      // Group by date
      const shiftsByDate = {};
      existingShifts.forEach(shift => {
        if (!shiftsByDate[shift.date]) {
          shiftsByDate[shift.date] = [];
        }
        shiftsByDate[shift.date].push(shift);
      });

      const datesWithExisting = Object.keys(shiftsByDate);
      datesWithShifts.push(...datesWithExisting);

      // Create helpful info message
      const dateList = datesWithExisting
        .slice(0, 5)
        .map(d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))
        .join(', ');

      const moreCount = datesWithExisting.length > 5 ? ` and ${datesWithExisting.length - 5} more` : '';

      info.push(
        `ℹ️ Client already has shifts on ${dateList}${moreCount}. ` +
        `Check /shifts calendar to avoid over-booking.`
      );
    }

    return { info, datesWithShifts };
  } catch (err) {
    console.error('Error in checkExistingShifts:', err);
    return { info, datesWithShifts };
  }
}

/**
 * Validate date range
 */
export function validateDateRange(startDate, endDate) {
  const errors = [];

  if (!startDate) {
    errors.push('Start date is required');
  }
  if (!endDate) {
    errors.push('End date is required');
  }

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      errors.push('End date must be after start date');
    }

    // Check if range is too large (> 30 days)
    const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
    if (daysDiff > 30) {
      errors.push('Date range cannot exceed 30 days');
    }
  }

  return { errors, isValid: errors.length === 0 };
}
