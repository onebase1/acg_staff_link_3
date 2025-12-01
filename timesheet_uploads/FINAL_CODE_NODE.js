// ============================================
// FINAL VERSION: Bulletproof Parse & Split
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
      // Remove markdown
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      // Fix malformed escape sequences
      .replace(/\\"n\s+/g, '')           // Remove \"n sequences
      .replace(/\\n/g, '')               // Remove \n
      .replace(/\s*\n\s*/g, ' ')         // Replace newlines with space
      .replace(/\r/g, '')                // Remove carriage returns
      .replace(/\t/g, ' ')               // Tabs to spaces
      // Remove everything before first { and after last }
      .replace(/^[^{]*/g, '')
      .replace(/[^}]*$/g, '')
      // Fix common JSON issues
      .replace(/,\s*}/g, '}')            // Remove trailing commas
      .replace(/,\s*]/g, ']')            // Remove trailing commas in arrays
      .replace(/\s{2,}/g, ' ')           // Collapse spaces
      .trim();

    // Parse JSON
    let data;
    try {
      data = JSON.parse(cleaned);
    } catch (e1) {
      // Try extracting just the JSON object
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
              raw_preview: raw.substring(0, 300),
              cleaned_preview: cleaned.substring(0, 300)
            }
          });
          continue;
        }
      } else {
        out.push({
          json: {
            error: true,
            error_type: 'JSON_EXTRACT_FAILED',
            error_message: 'Could not extract JSON from text',
            raw_preview: raw.substring(0, 300)
          }
        });
        continue;
      }
    }

    // Validate
    if (!data.timesheetMetadata || !data.shifts || !Array.isArray(data.shifts)) {
      out.push({
        json: {
          error: true,
          error_type: 'INVALID_STRUCTURE',
          error_message: 'Missing timesheetMetadata or shifts array',
          has_metadata: !!data.timesheetMetadata,
          has_shifts: !!data.shifts,
          is_array: Array.isArray(data.shifts),
          keys: Object.keys(data).join(', ')
        }
      });
      continue;
    }

    // Generate IDs
    const tsId = 'TS_' + Date.now();
    const timestamp = new Date().toISOString();
    const meta = data.timesheetMetadata;

    // Create flat rows
    for (const shift of data.shifts) {
      out.push({
        json: {
          timesheet_id: tsId,
          upload_timestamp: timestamp,
          staff_name_raw: String(meta.employerName || ''),
          staff_title: String(meta.staffTitle || ''),
          employer_number: String(meta.employerNumber || ''),
          job_title_raw: String(meta.jobTitle || ''),
          client_name_raw: String(meta.placeOfWorkRaw || ''),
          client_name_matched: String(meta.placeOfWorkMatched || ''),
          client_match_confidence: Number(meta.clientMatchConfidence || 0),
          week_beginning: String(meta.weekBeginning || ''),
          employee_signature: String(meta.employeeSignature || ''),
          supervisor_signature_present: Boolean(meta.supervisorSignaturePresent),
          supervisor_signature_date: String(meta.supervisorSignatureDate || ''),
          row_number: Number(shift.rowNumber || 0),
          shift_date: String(shift.shiftDate || ''),
          shift_date_parsed: String(shift.shiftDateParsed || ''),
          start_time: String(shift.startTime || ''),
          end_time: String(shift.endTime || ''),
          break_minutes: Number(shift.breakMinutes || 0),
          hours_calculated: Number(shift.hoursCalculated || 0),
          hours_claimed: Number(shift.hoursClaimed || 0),
          hours_discrepancy: Number(shift.hoursDiscrepancy || 0),
          overtime_hours: Number(shift.overtimeHours || 0),
          validation_status: 'PENDING',
          needs_review: Boolean(meta.clientMatchConfidence < 70 || Math.abs(shift.hoursDiscrepancy || 0) > 0.5),
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
