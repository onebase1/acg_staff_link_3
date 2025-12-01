/**
 * Google Sheets Apps Script for Timesheet Validation
 *
 * Setup:
 * 1. Open your Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Paste this code
 * 4. Save and run 'onOpen' to add menu
 */

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Timesheet Validation')
    .addItem('Validate All Timesheets', 'validateAllTimesheets')
    .addItem('Match Against Expected Shifts', 'matchExpectedShifts')
    .addItem('Flag Issues', 'flagIssues')
    .addItem('Export Approved Timesheets', 'exportApproved')
    .addToUi();
}

/**
 * Main validation function
 */
function validateAllTimesheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const extractedSheet = ss.getSheetByName('Extracted');
  const expectedSheet = ss.getSheetByName('Expected');
  const validationSheet = ss.getSheetByName('Validation');

  // Get data
  const extractedData = extractedSheet.getDataRange().getValues();
  const expectedData = expectedSheet.getDataRange().getValues();

  // Skip header row
  const extracted = extractedData.slice(1);
  const expected = expectedData.slice(1);

  // Clear validation sheet (keep headers)
  if (validationSheet.getLastRow() > 1) {
    validationSheet.getRange(2, 1, validationSheet.getLastRow() - 1, validationSheet.getLastColumn()).clearContent();
  }

  const validationResults = [];

  // Process each extracted timesheet row
  extracted.forEach((row, index) => {
    const result = validateTimesheetRow(row, expected);
    validationResults.push(result);
  });

  // Write results to validation sheet
  if (validationResults.length > 0) {
    validationSheet.getRange(2, 1, validationResults.length, validationResults[0].length)
      .setValues(validationResults);
  }

  // Apply conditional formatting
  applyConditionalFormatting(validationSheet);

  SpreadsheetApp.getUi().alert(`Validated ${validationResults.length} timesheet rows`);
}

/**
 * Validate a single timesheet row against expected shifts
 */
function validateTimesheetRow(extractedRow, expectedData) {
  // Extract columns from extracted timesheet row
  const [
    timesheetId, uploadTimestamp, staffName, staffTitle, employerNumber,
    jobTitle, clientRaw, clientMatched, clientConfidence, weekBeginning,
    rowNumber, shiftDate, shiftDateParsed, startTime, endTime,
    breakMinutes, hoursCalculated, hoursClaimed, hoursDiscrepancy,
    overtimeHours, employeeSignature, supervisorPresent, supervisorDate,
    validationStatus, needsReview, validationNotes, documentUrl
  ] = extractedRow;

  // Find matching expected shift
  const match = findMatchingShift(extractedRow, expectedData);

  if (!match.found) {
    return [
      timesheetId, rowNumber, staffName, employerNumber, shiftDateParsed,
      startTime, endTime, breakMinutes, hoursCalculated, hoursClaimed,
      clientMatched, clientConfidence,
      'NO_MATCH', '', '', '', '',
      '❌ NO MATCH', '❌', '❌', '❌', '❌',
      true, 'No matching shift found in database - possible fraud or incorrect date'
    ];
  }

  // Perform detailed validation
  const validation = performDetailedValidation(extractedRow, match.shift);

  return [
    timesheetId, rowNumber, staffName, employerNumber, shiftDateParsed,
    startTime, endTime, breakMinutes, hoursCalculated, hoursClaimed,
    clientMatched, clientConfidence,
    match.shift[0], // shift_id
    match.shift[5], // expected_client
    match.shift[7], // expected_start
    match.shift[8], // expected_end
    match.shift[9], // expected_duration
    validation.overallStatus,
    validation.matchDate,
    validation.matchTime,
    validation.matchClient,
    validation.matchHours,
    validation.needsReview,
    validation.notes
  ];
}

/**
 * Find matching shift in expected shifts
 */
function findMatchingShift(extractedRow, expectedData) {
  const employerNumber = extractedRow[4];
  const shiftDateParsed = extractedRow[12];

  for (let i = 0; i < expectedData.length; i++) {
    const expectedShift = expectedData[i];
    const expectedEmployerNum = expectedShift[3];
    const expectedDate = expectedShift[7];

    if (employerNumber === expectedEmployerNum && shiftDateParsed === expectedDate) {
      return { found: true, shift: expectedShift };
    }
  }

  return { found: false, shift: null };
}

/**
 * Perform detailed validation checks
 */
function performDetailedValidation(extractedRow, expectedShift) {
  const [
    , , , , ,
    , , clientMatched, clientConfidence, ,
    , , , startTime, endTime,
    breakMinutes, hoursCalculated, hoursClaimed, hoursDiscrepancy,
    overtimeHours, , supervisorPresent, ,
    , , validationNotes,
  ] = extractedRow;

  const [
    , , , , , expectedClient, , expectedStart, expectedEnd, expectedDuration, expectedBreak
  ] = expectedShift;

  const issues = [];
  let needsReview = false;

  // 1. Date validation (already matched, so always passes)
  const matchDate = '✓';

  // 2. Time validation (±15 min tolerance)
  const matchTime = validateTimes(startTime, endTime, expectedStart, expectedEnd) ? '✓' : '⚠';
  if (matchTime === '⚠') {
    issues.push('Time difference >15min from scheduled');
    needsReview = true;
  }

  // 3. Client validation
  const matchClient = (clientMatched === expectedClient) ? '✓' : '⚠';
  if (matchClient === '⚠' || clientConfidence < 70) {
    issues.push(`Client mismatch or low confidence (${clientConfidence}%)`);
    needsReview = true;
  }

  // 4. Hours validation
  const hoursDiff = Math.abs(hoursCalculated - expectedDuration + (breakMinutes / 60));
  const matchHours = hoursDiff <= 0.5 ? '✓' : '⚠';
  if (matchHours === '⚠') {
    issues.push(`Hours discrepancy: ${hoursDiff.toFixed(2)} hrs difference`);
    needsReview = true;
  }

  // 5. Signature validation
  if (!supervisorPresent) {
    issues.push('Missing supervisor signature');
    needsReview = true;
  }

  // 6. Calculation errors
  if (Math.abs(hoursDiscrepancy) > 0.5) {
    issues.push(`Staff miscalculated hours: claimed ${hoursClaimed} but actually ${hoursCalculated}`);
    needsReview = true;
  }

  // 7. Overtime check
  if (overtimeHours > 0) {
    issues.push(`Overtime detected: ${overtimeHours} hrs`);
    needsReview = true;
  }

  const overallStatus = needsReview ? 'NEEDS_REVIEW' : 'APPROVED';
  const notes = issues.length > 0 ? issues.join('; ') : 'All checks passed';

  return {
    overallStatus,
    matchDate,
    matchTime,
    matchClient,
    matchHours,
    needsReview,
    notes
  };
}

/**
 * Validate times with tolerance
 */
function validateTimes(actualStart, actualEnd, expectedStart, expectedEnd) {
  const tolerance = 15; // minutes

  const actualStartMin = timeToMinutes(actualStart);
  const actualEndMin = timeToMinutes(actualEnd);
  const expectedStartMin = timeToMinutes(expectedStart);
  const expectedEndMin = timeToMinutes(expectedEnd);

  const startDiff = Math.abs(actualStartMin - expectedStartMin);
  const endDiff = Math.abs(actualEndMin - expectedEndMin);

  return startDiff <= tolerance && endDiff <= tolerance;
}

/**
 * Convert HH:MM to minutes
 */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Apply conditional formatting to validation sheet
 */
function applyConditionalFormatting(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  // Highlight rows that need review (column 23)
  const needsReviewRange = sheet.getRange(2, 23, lastRow - 1, 1);
  const needsReviewRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('TRUE')
    .setBackground('#fff3cd')
    .setRanges([needsReviewRange])
    .build();

  // Highlight approved rows
  const statusRange = sheet.getRange(2, 18, lastRow - 1, 1);
  const approvedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('APPROVED')
    .setBackground('#d4edda')
    .setRanges([statusRange])
    .build();

  // Highlight no match rows
  const noMatchRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('❌ NO MATCH')
    .setBackground('#f8d7da')
    .setRanges([statusRange])
    .build();

  const rules = sheet.getConditionalFormatRules();
  rules.push(needsReviewRule, approvedRule, noMatchRule);
  sheet.setConditionalFormatRules(rules);
}

/**
 * Flag duplicate shifts (same staff, same date)
 */
function flagIssues() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const validationSheet = ss.getSheetByName('Validation');
  const data = validationSheet.getDataRange().getValues();

  const seen = new Set();
  const duplicates = [];

  for (let i = 1; i < data.length; i++) {
    const staffId = data[i][3];
    const shiftDate = data[i][4];
    const key = `${staffId}_${shiftDate}`;

    if (seen.has(key)) {
      duplicates.push(i + 1); // Row number (1-indexed)
    }
    seen.add(key);
  }

  if (duplicates.length > 0) {
    SpreadsheetApp.getUi().alert(
      `⚠️ FRAUD ALERT: Found ${duplicates.length} duplicate shifts (same staff, same date):\n\n` +
      `Rows: ${duplicates.join(', ')}\n\n` +
      `Staff cannot work at 2 places on the same day!`
    );
  } else {
    SpreadsheetApp.getUi().alert('✓ No duplicate shifts found');
  }
}

/**
 * Export approved timesheets to new sheet
 */
function exportApproved() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const validationSheet = ss.getSheetByName('Validation');
  const data = validationSheet.getDataRange().getValues();

  // Filter approved rows
  const approved = data.filter((row, index) => {
    if (index === 0) return true; // Keep header
    return row[17] === 'APPROVED'; // Column R (index 17)
  });

  // Create or clear approved sheet
  let approvedSheet = ss.getSheetByName('Approved_For_Database');
  if (!approvedSheet) {
    approvedSheet = ss.insertSheet('Approved_For_Database');
  } else {
    approvedSheet.clear();
  }

  // Write approved data
  if (approved.length > 0) {
    approvedSheet.getRange(1, 1, approved.length, approved[0].length)
      .setValues(approved);
  }

  SpreadsheetApp.getUi().alert(
    `✓ Exported ${approved.length - 1} approved timesheets to 'Approved_For_Database' sheet\n\n` +
    `These are ready to be imported into your database.`
  );
}
