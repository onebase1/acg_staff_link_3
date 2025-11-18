/**
 * Shift Time Formatter Utility
 * 
 * Handles display of shift times in a user-friendly format:
 * - For scheduled/upcoming shifts: Show "Day 8am-8pm" or "Night 8pm-8am"
 * - For completed shifts: Show actual clock-in/out times from timesheet
 * 
 * Database stores full ISO timestamps (e.g., "2025-11-13T09:00:00+00:00")
 * but we display them in a readable format for staff.
 */

import { format, parse } from 'date-fns';

/**
 * Parse time string (HH:MM or HH:MM:SS) to hour and minute
 * @param {string} timeStr - Time string like "08:00" or "20:00:00"
 * @returns {{hours: number, minutes: number}} Parsed time
 */
function parseTimeString(timeStr) {
  if (!timeStr) return { hours: 0, minutes: 0 };

  // Handle HH:MM or HH:MM:SS format
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;

  return { hours, minutes };
}

/**
 * Determine if a shift is a day or night shift based on start time
 * @param {string} startTime - Time string (HH:MM or HH:MM:SS) or ISO timestamp
 * @returns {'Day' | 'Night'}
 */
export function getShiftType(startTime) {
  if (!startTime) return 'Day';

  try {
    let hour;

    // Check if it's HH:MM or HH:MM:SS format (TEXT from database)
    if (typeof startTime === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(startTime)) {
      const { hours } = parseTimeString(startTime);
      hour = hours;
    } else {
      // Try parsing as ISO timestamp (fallback for old data)
      const date = new Date(startTime);
      if (isNaN(date.getTime())) {
        console.warn('Invalid time format:', startTime);
        return 'Day';
      }
      hour = date.getHours();
    }

    // Night shift: 8pm (20:00) to 8am (08:00)
    // Day shift: 8am (08:00) to 8pm (20:00)
    return (hour >= 20 || hour < 8) ? 'Night' : 'Day';
  } catch (error) {
    console.error('Error parsing shift time:', startTime, error);
    return 'Day';
  }
}

/**
 * Format time from HH:MM or ISO timestamp to 12-hour format (e.g., "8am", "8pm")
 * @param {string} timeStr - Time string (HH:MM or HH:MM:SS) or ISO timestamp
 * @returns {string} Formatted time like "8am" or "2:30pm"
 */
export function formatTime12Hour(timeStr) {
  if (!timeStr) return '';

  try {
    let hours, minutes;

    // Check if it's HH:MM or HH:MM:SS format (TEXT from database)
    if (typeof timeStr === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(timeStr)) {
      const parsed = parseTimeString(timeStr);
      hours = parsed.hours;
      minutes = parsed.minutes;
    } else {
      // Try parsing as ISO timestamp (fallback for old data)
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) {
        console.warn('Invalid time format:', timeStr);
        return '';
      }
      hours = date.getHours();
      minutes = date.getMinutes();
    }

    // Convert to 12-hour format
    const hour12 = hours % 12 || 12;
    const ampm = hours >= 12 ? 'pm' : 'am';

    // Only show minutes if not on the hour
    if (minutes === 0) {
      return `${hour12}${ampm}`;
    }
    return `${hour12}:${minutes.toString().padStart(2, '0')}${ampm}`;
  } catch (error) {
    console.error('Error formatting time:', timeStr, error);
    return '';
  }
}

/**
 * Format shift time range for display
 * @param {string} startTime - ISO timestamp
 * @param {string} endTime - ISO timestamp
 * @param {object} options - Formatting options
 * @param {boolean} options.showType - Show "Day" or "Night" prefix (default: true)
 * @param {boolean} options.showDate - Show date prefix like "Wednesday 25 November" (default: false)
 * @param {string} options.date - Date string for the shift (required if showDate is true)
 * @returns {string} Formatted time range
 */
export function formatShiftTimeRange(startTime, endTime, options = {}) {
  const {
    showType = true,
    showDate = false,
    date = null
  } = options;
  
  if (!startTime || !endTime) {
    return 'Time not set';
  }
  
  try {
    const shiftType = getShiftType(startTime);
    const startFormatted = formatTime12Hour(startTime);
    const endFormatted = formatTime12Hour(endTime);
    
    let result = '';
    
    // Add date if requested
    if (showDate && date) {
      try {
        const dateObj = new Date(date);
        const dayName = format(dateObj, 'EEEE');
        const dateFormatted = format(dateObj, 'd MMMM');
        result += `${dayName} ${dateFormatted} `;
      } catch (error) {
        console.error('Error formatting date:', date, error);
      }
    }
    
    // Add shift type if requested
    if (showType) {
      result += `${shiftType} `;
    }
    
    // Add time range
    result += `${startFormatted}-${endFormatted}`;
    
    return result;
  } catch (error) {
    console.error('Error formatting shift time range:', startTime, endTime, error);
    return `${startTime} - ${endTime}`;
  }
}

/**
 * Format shift time for "Today's Shifts" display
 * Shows just the time range with shift type
 * @param {object} shift - Shift object with start_time and end_time
 * @returns {string} Formatted time like "Day 8am-8pm"
 */
export function formatTodayShiftTime(shift) {
  return formatShiftTimeRange(shift.start_time, shift.end_time, {
    showType: true,
    showDate: false
  });
}

/**
 * Format shift time for upcoming shifts list
 * Shows date, day name, and time range
 * @param {object} shift - Shift object with date, start_time, and end_time
 * @returns {string} Formatted time like "Wednesday 25 November Day 8am-8pm"
 */
export function formatUpcomingShiftTime(shift) {
  return formatShiftTimeRange(shift.start_time, shift.end_time, {
    showType: true,
    showDate: true,
    date: shift.date
  });
}

/**
 * Format completed shift time (shows actual clock-in/out from timesheet)
 * @param {object} timesheet - Timesheet object with clock_in_time and clock_out_time
 * @returns {string} Formatted time like "8:15am-5:30pm (actual)"
 */
export function formatCompletedShiftTime(timesheet) {
  if (!timesheet.clock_in_time) {
    return 'Not clocked in';
  }
  
  const clockIn = formatTime12Hour(timesheet.clock_in_time);
  const clockOut = timesheet.clock_out_time ? formatTime12Hour(timesheet.clock_out_time) : 'In progress';
  
  return `${clockIn}-${clockOut} (actual)`;
}

