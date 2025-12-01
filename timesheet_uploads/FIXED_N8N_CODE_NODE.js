// ============================================
// N8N Compatible: Fixed for n8n syntax
// ============================================

const out = [];
const allItems = $input.all(); // FIX: Use n8n's $input.all()

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
      throw new Error('No text found in input');
    }

    // Log what we're working with
    console.log('RAW INPUT LENGTH:', raw.length);
    console.log('FIRST 200 CHARS:', raw.substring(0, 200));

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

    console.log('CLEANED JSON LENGTH:', cleaned.length);
    console.log('CLEANED PREVIEW:', cleaned.substring(0, 300));

    // Parse JSON
    let data;
    try {
      data = JSON.parse(cleaned);
    } catch (e1) {
      // Try regex extraction
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          data = JSON.parse(match[0]);
        } catch (e2) {
          out.push({
            json: {
              error: true,
              error_type: 'JSON_PARSE_FAILED',
              error_message: e2.message,
              position: e2.message.match(/position (\d+)/)?.[1] || 'unknown',
              cleaned_preview: cleaned.substring(0, 500),
              char_at_error: cleaned.charAt(parseInt(e2.message.match(/position (\d+)/)?.[1] || 0))
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

    console.log('PARSED DATA KEYS:', Object.keys(data).join(', '));
    console.log('HAS SHIFTS?', !!data.shifts);
    console.log('SHIFTS IS ARRAY?', Array.isArray(data.shifts));

    // ===== HANDLE MULTIPLE STRUCTURES =====
    let metadata = {};
    let shifts = [];

    // Strategy 1: Nested structure (timesheetMetadata + shifts)
    if (data.timesheetMetadata && data.shifts) {
      console.log('DETECTED: Nested structure');
      metadata = data.timesheetMetadata;
      shifts = Array.isArray(data.shifts) ? data.shifts : [data.shifts];
    }
    // Strategy 2: Semi-flat (metadata fields + shifts array at root)
    else if (data.shifts && Array.isArray(data.shifts)) {
      console.log('DETECTED: Semi-flat with shifts array');
      metadata = data;
      shifts = data.shifts;
    }
    // Strategy 3: Completely flat (all fields at root, create single shift)
    else {
      console.log('DETECTED: Flat structure - creating synthetic shift');
      metadata = data;

      // Try to find shift-related fields
      const shiftFields = {};

      // Look for date fields
      shiftFields.shiftDate = data.shiftDate || data.date || data.shift_date || '';
      shiftFields.shiftDateParsed = data.shiftDateParsed || data.date_parsed || data.dateParsed || '';

      // Look for time fields - MULTIPLE VARIATIONS
      shiftFields.startTime = data.startTime || data.start_time || data.start || data.clockIn || '';
      shiftFields.endTime = data.endTime || data.end_time || data.end || data.clockOut || '';

      // Look for break/hours fields
      shiftFields.breakMinutes = data.breakMinutes || data.break_minutes || data.break || 0;
      shiftFields.hoursCalculated = data.hoursCalculated || data.hours_calculated || data.hours || data.totalHours || 0;
      shiftFields.hoursClaimed = data.hoursClaimed || data.hours_claimed || data.hours || data.totalHours || 0;
      shiftFields.hoursDiscrepancy = data.hoursDiscrepancy || data.hours_discrepancy || 0;
      shiftFields.overtimeHours = data.overtimeHours || data.overtime_hours || data.overtime || 0;
      shiftFields.rowNumber = data.rowNumber || data.row_number || data.row || 1;

      console.log('CREATED SHIFT FIELDS:', JSON.stringify(shiftFields));

      shifts = [shiftFields];
    }

    console.log('FINAL SHIFTS COUNT:', shifts.length);

    // Generate IDs
    const tsId = 'TS_' + Date.now();
    const timestamp = new Date().toISOString();

    // Create flat rows
    for (let i = 0; i < shifts.length; i++) {
      const shift = shifts[i];

      console.log(`PROCESSING SHIFT ${i + 1}:`, JSON.stringify(shift).substring(0, 200));

      out.push({
        json: {
          timesheet_id: tsId,
          upload_timestamp: timestamp,

          // Staff info - try multiple field names
          staff_name_raw: String(
            metadata.employerName || metadata.staffName || metadata.name ||
            metadata.employee_name || metadata.staff_name || ''
          ),
          staff_title: String(
            metadata.staffTitle || metadata.title || metadata.employee_title || ''
          ),
          employer_number: String(
            metadata.employerNumber || metadata.employeeNumber || metadata.employee_number ||
            metadata.staff_id || metadata.id || ''
          ),
          job_title_raw: String(
            metadata.jobTitle || metadata.job_title || metadata.role || metadata.position || ''
          ),

          // Client info
          client_name_raw: String(
            metadata.placeOfWorkRaw || metadata.placeOfWork || metadata.place_of_work ||
            metadata.client || metadata.location || ''
          ),
          client_name_matched: String(
            metadata.placeOfWorkMatched || metadata.placeOfWork || metadata.place_of_work ||
            metadata.client || metadata.location || ''
          ),
          client_match_confidence: Number(
            metadata.clientMatchConfidence || metadata.client_match_confidence ||
            metadata.confidence || 100
          ),

          // Signatures
          week_beginning: String(metadata.weekBeginning || metadata.week_beginning || ''),
          employee_signature: String(
            metadata.employeeSignature || metadata.employee_signature ||
            metadata.signature || metadata.signed || ''
          ),
          supervisor_signature_present: Boolean(
            metadata.supervisorSignaturePresent || metadata.supervisor_signature_present ||
            metadata.supervisorSigned || metadata.supervisor_signed || false
          ),
          supervisor_signature_date: String(
            metadata.supervisorSignatureDate || metadata.supervisor_signature_date ||
            metadata.supervisorDate || metadata.supervisor_date || ''
          ),

          // Shift data - MULTIPLE FIELD NAME ATTEMPTS
          row_number: Number(shift.rowNumber || shift.row_number || shift.row || (i + 1)),
          shift_date: String(shift.shiftDate || shift.shift_date || shift.date || ''),
          shift_date_parsed: String(shift.shiftDateParsed || shift.shift_date_parsed || shift.date_parsed || shift.dateParsed || ''),
          start_time: String(shift.startTime || shift.start_time || shift.start || shift.clockIn || shift.clock_in || ''),
          end_time: String(shift.endTime || shift.end_time || shift.end || shift.clockOut || shift.clock_out || ''),
          break_minutes: Number(shift.breakMinutes || shift.break_minutes || shift.break || 0),
          hours_calculated: Number(shift.hoursCalculated || shift.hours_calculated || shift.hours || shift.totalHours || shift.total_hours || 0),
          hours_claimed: Number(shift.hoursClaimed || shift.hours_claimed || shift.claimed || shift.hours || 0),
          hours_discrepancy: Number(shift.hoursDiscrepancy || shift.hours_discrepancy || shift.discrepancy || 0),
          overtime_hours: Number(shift.overtimeHours || shift.overtime_hours || shift.overtime || 0),

          validation_status: 'PENDING',
          needs_review: false,
          validation_notes: '',
          original_document_url: ''
        }
      });
    }

    console.log('CREATED OUTPUT ITEMS:', out.length);

  } catch (error) {
    console.error('ERROR:', error.message);
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

console.log('TOTAL OUTPUT ITEMS:', out.length);
return out;
