// ============================================
// FINAL BULLETPROOF: Handles ALL structures
// ============================================

const out = [];
const allItems = $input.all();

for (const item of allItems) {
  try {
    // Extract raw text
    let raw = '';
    if (item.json?.['0']?.content?.[0]?.text) {
      raw = item.json['0'].content[0].text;
    } else if (item.json?.content?.[0]?.text) {
      raw = item.json.content[0].text;
    } else if (item.json?.text) {
      raw = item.json.text;
    } else if (typeof item.json === 'string') {
      raw = item.json;
    } else {
      throw new Error('No text found');
    }

    // AGGRESSIVE CLEANING
    let cleaned = raw
      .trim()
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .replace(/\\"n\s+/g, '')
      .replace(/\\n/g, ' ')
      .replace(/\s*\n\s*/g, ' ')
      .replace(/\r/g, '')
      .replace(/\t/g, ' ')
      .replace(/^[^{]*/g, '')
      .replace(/[^}]*$/g, '')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/\s{2,}/g, ' ')
      .trim();

    // Parse JSON
    let data;
    try {
      data = JSON.parse(cleaned);
    } catch (e) {
      out.push({
        json: {
          error: true,
          error_type: 'JSON_PARSE_FAILED',
          error_message: e.message,
          cleaned_preview: cleaned.substring(0, 600)
        }
      });
      continue;
    }

    // ===== FIND METADATA AND SHIFTS =====
    let metadata = {};
    let shifts = [];

    // Case 1: Standard nested (timesheetMetadata + shifts at root)
    if (data.timesheetMetadata && data.shifts) {
      metadata = data.timesheetMetadata;
      shifts = Array.isArray(data.shifts) ? data.shifts : [data.shifts];
    }
    // Case 2: Shifts INSIDE timesheetMetadata (OCR mistake)
    else if (data.timesheetMetadata && data.timesheetMetadata.shifts) {
      metadata = data.timesheetMetadata;
      shifts = Array.isArray(metadata.shifts) ? metadata.shifts : [metadata.shifts];
      delete metadata.shifts; // Remove from metadata
    }
    // Case 3: Semi-flat (shifts array at root, metadata fields at root)
    else if (data.shifts && Array.isArray(data.shifts)) {
      metadata = data;
      shifts = data.shifts;
    }
    // Case 4: Completely flat (no shifts array, single shift at root)
    else if (data.employerName || data.staffName || data.shiftDate || data.date) {
      metadata = data;
      shifts = [{
        rowNumber: 1,
        shiftDate: data.shiftDate || data.date || '',
        shiftDateParsed: data.shiftDateParsed || data.dateParsed || '',
        startTime: data.startTime || data.start || '',
        endTime: data.endTime || data.end || '',
        breakMinutes: data.breakMinutes || data.break || 0,
        hoursCalculated: data.hoursCalculated || data.hours || 0,
        hoursClaimed: data.hoursClaimed || data.hours || 0,
        hoursDiscrepancy: data.hoursDiscrepancy || 0,
        overtimeHours: data.overtimeHours || 0
      }];
    }
    else {
      out.push({
        json: {
          error: true,
          error_type: 'UNKNOWN_STRUCTURE',
          error_message: 'Could not find metadata or shifts',
          keys: Object.keys(data).join(', ')
        }
      });
      continue;
    }

    // Generate IDs
    const tsId = 'TS_' + Date.now();
    const timestamp = new Date().toISOString();

    // Create flat rows
    for (let i = 0; i < shifts.length; i++) {
      const shift = shifts[i];

      out.push({
        json: {
          timesheet_id: tsId,
          upload_timestamp: timestamp,
          staff_name_raw: String(metadata.employerName || metadata.staffName || ''),
          staff_title: String(metadata.staffTitle || metadata.title || ''),
          employer_number: String(metadata.employerNumber || metadata.employeeNumber || ''),
          job_title_raw: String(metadata.jobTitle || metadata.role || ''),
          client_name_raw: String(metadata.placeOfWorkRaw || metadata.placeOfWork || ''),
          client_name_matched: String(metadata.placeOfWorkMatched || metadata.placeOfWork || ''),
          client_match_confidence: Number(metadata.clientMatchConfidence || 100),
          week_beginning: String(metadata.weekBeginning || ''),
          employee_signature: String(metadata.employeeSignature || ''),
          supervisor_signature_present: Boolean(metadata.supervisorSignaturePresent),
          supervisor_signature_date: String(metadata.supervisorSignatureDate || ''),
          row_number: Number(shift.rowNumber || (i + 1)),
          shift_date: String(shift.shiftDate || shift.date || ''),
          shift_date_parsed: String(shift.shiftDateParsed || shift.dateParsed || ''),
          start_time: String(shift.startTime || shift.start || ''),
          end_time: String(shift.endTime || shift.end || ''),
          break_minutes: Number(shift.breakMinutes || shift.break || 0),
          hours_calculated: Number(shift.hoursCalculated || shift.hours || 0),
          hours_claimed: Number(shift.hoursClaimed || shift.hours || 0),
          hours_discrepancy: Number(shift.hoursDiscrepancy || 0),
          overtime_hours: Number(shift.overtimeHours || 0),
          validation_status: 'PENDING',
          needs_review: false,
          validation_notes: '',
          original_document_url: ''
        }
      });
    }

  } catch (error) {
    out.push({
      json: {
        error: true,
        error_type: 'UNEXPECTED_ERROR',
        error_message: error.message,
        error_stack: error.stack
      }
    });
  }
}

return out;
