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
 * Determine if a shift is a day or night shift based on start time
 * @param {string} startTime - ISO timestamp or time string
 * @returns {'Day' | 'Night'}
 */
export function getShiftType(startTime) {
  if (!startTime) return 'Day';
  
  try {
    // Extract hour from timestamp
    const date = new Date(startTime);
    const hour = date.getHours();
    
    // Night shift: 8pm (20:00) to 8am (08:00)
    // Day shift: 8am (08:00) to 8pm (20:00)
    return (hour >= 20 || hour < 8) ? 'Night' : 'Day';
  } catch (error) {
    console.error('Error parsing shift time:', startTime, error);
    return 'Day';
  }
}

/**
 * Format time from ISO timestamp to 12-hour format (e.g., "8am", "8pm")
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Formatted time like "8am" or "2:30pm"
 */
export function formatTime12Hour(timestamp) {
  if (!timestamp) return '';
  
  try {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    // Convert to 12-hour format
    const hour12 = hours % 12 || 12;
    const ampm = hours >= 12 ? 'pm' : 'am';
    
    // Only show minutes if not on the hour
    if (minutes === 0) {
      return `${hour12}${ampm}`;
    }
    return `${hour12}:${minutes.toString().padStart(2, '0')}${ampm}`;
  } catch (error) {
    console.error('Error formatting time:', timestamp, error);
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

