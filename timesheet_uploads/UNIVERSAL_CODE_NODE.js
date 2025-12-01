// ============================================
// UNIVERSAL: Works with ANY structure
// ============================================

const out = [];

for (const item of items) {
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
      throw new Error('No text found in input');
    }

    // AGGRESSIVE CLEANING
    let cleaned = raw
      .trim()
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .replace(/\\"n\s+/g, '')
      .replace(/\\n/g, '')
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
    } catch (e1) {
      const match = cleaned.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
      if (match) {
        try {
          data = JSON.parse(match[0]);
        } catch (e2) {
          out.push({
            json: {
              error: true,
              error_type: 'JSON_PARSE_FAILED',
              error_message: e2.message,
              cleaned_preview: cleaned.substring(0, 500)
            }
          });
          continue;
        }
      } else {
        out.push({
          json: {
            error: true,
            error_type: 'JSON_EXTRACT_FAILED',
            error_message: 'Could not extract JSON',
            raw_preview: raw.substring(0, 500)
          }
        });
        continue;
      }
    }

    // ===== HANDLE BOTH STRUCTURES =====
    let metadata;
    let shifts;

    // Check if data has nested structure (timesheetMetadata + shifts)
    if (data.timesheetMetadata && data.shifts) {
      // NESTED STRUCTURE
      metadata = data.timesheetMetadata;
      shifts = Array.isArray(data.shifts) ? data.shifts : [data.shifts];
    }
    // Check if data IS the metadata and has a shifts property
    else if (data.shifts) {
      // SEMI-FLAT STRUCTURE
      metadata = data;
      shifts = Array.isArray(data.shifts) ? data.shifts : [data.shifts];
    }
    // Otherwise assume it's a flat structure with shift data at root
    else if (data.employerName || data.staffName) {
      // COMPLETELY FLAT STRUCTURE - treat as single shift
      metadata = data;
      shifts = [{
        rowNumber: 1,
        shiftDate: data.shiftDate || data.date,
        shiftDateParsed: data.shiftDateParsed || data.dateParsed,
        startTime: data.startTime || data.start,
        endTime: data.endTime || data.end,
        breakMinutes: data.breakMinutes || data.break || 0,
        hoursCalculated: data.hoursCalculated || data.hours || 0,
        hoursClaimed: data.hoursClaimed || data.hours || 0,
        hoursDiscrepancy: data.hoursDiscrepancy || 0,
        overtimeHours: data.overtimeHours || data.overtime || 0
      }];
    }
    else {
      // Completely unknown structure
      out.push({
        json: {
          error: true,
          error_type: 'UNKNOWN_STRUCTURE',
          error_message: 'Could not identify data structure',
          keys_found: Object.keys(data).join(', '),
          data_sample: JSON.stringify(data).substring(0, 300)
        }
      });
      continue;
    }

    // Generate IDs
    const tsId = 'TS_' + Date.now();
    const timestamp = new Date().toISOString();

    // Create flat rows
    for (const shift of shifts) {
      out.push({
        json: {
          timesheet_id: tsId,
          upload_timestamp: timestamp,
          staff_name_raw: String(metadata.employerName || metadata.staffName || ''),
          staff_title: String(metadata.staffTitle || metadata.title || ''),
          employer_number: String(metadata.employerNumber || metadata.employeeNumber || ''),
          job_title_raw: String(metadata.jobTitle || metadata.role || ''),
          client_name_raw: String(metadata.placeOfWorkRaw || metadata.placeOfWork || metadata.client || ''),
          client_name_matched: String(metadata.placeOfWorkMatched || metadata.placeOfWork || metadata.client || ''),
          client_match_confidence: Number(metadata.clientMatchConfidence || metadata.confidence || 100),
          week_beginning: String(metadata.weekBeginning || ''),
          employee_signature: String(metadata.employeeSignature || metadata.signature || ''),
          supervisor_signature_present: Boolean(metadata.supervisorSignaturePresent || metadata.supervisorSigned || false),
          supervisor_signature_date: String(metadata.supervisorSignatureDate || metadata.supervisorDate || ''),
          row_number: Number(shift.rowNumber || shift.row || 1),
          shift_date: String(shift.shiftDate || shift.date || ''),
          shift_date_parsed: String(shift.shiftDateParsed || shift.dateParsed || ''),
          start_time: String(shift.startTime || shift.start || ''),
          end_time: String(shift.endTime || shift.end || ''),
          break_minutes: Number(shift.breakMinutes || shift.break || 0),
          hours_calculated: Number(shift.hoursCalculated || shift.hours || 0),
          hours_claimed: Number(shift.hoursClaimed || shift.hours || 0),
          hours_discrepancy: Number(shift.hoursDiscrepancy || 0),
          overtime_hours: Number(shift.overtimeHours || shift.overtime || 0),
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
