/**
 * Test Shift Time Formatter Utility
 * 
 * Quick test to verify the time formatting functions work correctly
 */

import { formatShiftTimeRange, formatTodayShiftTime, getShiftType, formatTime12Hour } from '../src/utils/shiftTimeFormatter.js';

console.log('🧪 Testing Shift Time Formatter...\n');

// Test 1: Get Shift Type
console.log('Test 1: Get Shift Type');
console.log('  8am start:', getShiftType('2025-11-13T08:00:00+00:00')); // Should be "Day"
console.log('  8pm start:', getShiftType('2025-11-13T20:00:00+00:00')); // Should be "Night"
console.log('  2pm start:', getShiftType('2025-11-13T14:00:00+00:00')); // Should be "Day"
console.log('  11pm start:', getShiftType('2025-11-13T23:00:00+00:00')); // Should be "Night"
console.log('');

// Test 2: Format Time 12 Hour
console.log('Test 2: Format Time 12 Hour');
console.log('  8:00am:', formatTime12Hour('2025-11-13T08:00:00+00:00')); // Should be "8am"
console.log('  8:30am:', formatTime12Hour('2025-11-13T08:30:00+00:00')); // Should be "8:30am"
console.log('  8:00pm:', formatTime12Hour('2025-11-13T20:00:00+00:00')); // Should be "8pm"
console.log('  5:15pm:', formatTime12Hour('2025-11-13T17:15:00+00:00')); // Should be "5:15pm"
console.log('');

// Test 3: Format Shift Time Range (Basic)
console.log('Test 3: Format Shift Time Range (Basic)');
const dayShift = {
  start_time: '2025-11-13T08:00:00+00:00',
  end_time: '2025-11-13T20:00:00+00:00'
};
console.log('  Day shift:', formatTodayShiftTime(dayShift)); // Should be "Day 8am-8pm"

const nightShift = {
  start_time: '2025-11-13T20:00:00+00:00',
  end_time: '2025-11-14T08:00:00+00:00'
};
console.log('  Night shift:', formatTodayShiftTime(nightShift)); // Should be "Night 8pm-8am"

const afternoonShift = {
  start_time: '2025-11-13T14:00:00+00:00',
  end_time: '2025-11-13T22:00:00+00:00'
};
console.log('  Afternoon shift:', formatTodayShiftTime(afternoonShift)); // Should be "Day 2pm-10pm"
console.log('');

// Test 4: Format Shift Time Range (With Date)
console.log('Test 4: Format Shift Time Range (With Date)');
const shiftWithDate = {
  date: '2025-11-25',
  start_time: '2025-11-25T08:00:00+00:00',
  end_time: '2025-11-25T20:00:00+00:00'
};
console.log('  With date:', formatShiftTimeRange(
  shiftWithDate.start_time,
  shiftWithDate.end_time,
  { showType: true, showDate: true, date: shiftWithDate.date }
)); // Should be "Monday 25 November Day 8am-8pm"
console.log('');

// Test 5: Real Data from Database
console.log('Test 5: Real Data from Database');
const realShift1 = {
  start_time: '2025-11-13T09:00:00+00:00',
  end_time: '2025-11-13T17:00:00+00:00'
};
console.log('  9am-5pm shift:', formatTodayShiftTime(realShift1)); // Should be "Day 9am-5pm"

const realShift2 = {
  start_time: '2025-11-13T18:00:00+00:00',
  end_time: '2025-11-13T22:00:00+00:00'
};
console.log('  6pm-10pm shift:', formatTodayShiftTime(realShift2)); // Should be "Day 6pm-10pm"
console.log('');

console.log('✅ All tests complete!');
console.log('');
console.log('Expected Output:');
console.log('  - Day shifts show "Day" prefix');
console.log('  - Night shifts show "Night" prefix');
console.log('  - Times in 12-hour format (8am, 2:30pm, etc.)');
console.log('  - Dates in natural language (Monday 25 November)');

