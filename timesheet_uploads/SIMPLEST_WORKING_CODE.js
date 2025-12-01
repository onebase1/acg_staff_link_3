// ============================================
// SIMPLEST VERSION - No TypeScript errors
// ============================================

const allItems = $input.all();
const out = [];

for (const item of allItems) {
  try {
    // Get text
    let raw = '';
    const json = item.json;

    if (json && json['0'] && json['0'].content && json['0'].content[0] && json['0'].content[0].text) {
      raw = json['0'].content[0].text;
    } else {
      throw new Error('No text in input');
    }

    // Clean
    let cleaned = raw
      .replace(/```json/gi, '')
      .replace(/```/gi, '')
      .replace(/\\"n\s+/g, '')
      .replace(/\\n/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\r/g, '')
      .replace(/\t/g, ' ')
      .replace(/^[^{]*/g, '')
      .replace(/[^}]*$/g, '')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/\s{2,}/g, ' ')
      .trim();

    // Parse
    let data = JSON.parse(cleaned);

    // Extract metadata and shifts
    let meta = {};
    let shiftsList = [];

    if (data.timesheetMetadata) {
      meta = data.timesheetMetadata;

      // Shifts might be inside metadata or at root
      if (meta.shifts) {
        shiftsList = Array.isArray(meta.shifts) ? meta.shifts : [meta.shifts];
      } else if (data.shifts) {
        shiftsList = Array.isArray(data.shifts) ? data.shifts : [data.shifts];
      }
    } else {
      meta = data;
      shiftsList = data.shifts ? (Array.isArray(data.shifts) ? data.shifts : [data.shifts]) : [data];
    }

    // IDs
    const tsId = 'TS_' + Date.now();
    const now = new Date().toISOString();

    // Create rows
    for (let i = 0; i < shiftsList.length; i++) {
      const s = shiftsList[i];

      out.push({
        json: {
          timesheet_id: tsId,
          upload_timestamp: now,
          staff_name_raw: String(meta.employerName || meta.staffName || ''),
          staff_title: String(meta.staffTitle || ''),
          employer_number: String(meta.employerNumber || ''),
          job_title_raw: String(meta.jobTitle || ''),
          client_name_raw: String(meta.placeOfWorkRaw || meta.placeOfWork || ''),
          client_name_matched: String(meta.placeOfWorkMatched || meta.placeOfWork || ''),
          client_match_confidence: Number(meta.clientMatchConfidence || 100),
          week_beginning: String(meta.weekBeginning || ''),
          employee_signature: String(meta.employeeSignature || ''),
          supervisor_signature_present: Boolean(meta.supervisorSignaturePresent),
          supervisor_signature_date: String(meta.supervisorSignatureDate || ''),
          row_number: Number(s.rowNumber || i + 1),
          shift_date: String(s.shiftDate || ''),
          shift_date_parsed: String(s.shiftDateParsed || ''),
          start_time: String(s.startTime || ''),
          end_time: String(s.endTime || ''),
          break_minutes: Number(s.breakMinutes || 0),
          hours_calculated: Number(s.hoursCalculated || 0),
          hours_claimed: Number(s.hoursClaimed || 0),
          hours_discrepancy: Number(s.hoursDiscrepancy || 0),
          overtime_hours: Number(s.overtimeHours || 0),
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
        error_type: 'ERROR',
        error_message: String(error.message),
        error_details: String(error.stack)
      }
    });
  }
}

return out;
