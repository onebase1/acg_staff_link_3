// ============================================
// IMPROVED: Parse & Split Rows Code Node
// ============================================

const out = [];

for (const item of items) {
  try {
    // Step 1: Extract the OCR text from nested structure
    let rawText = '';

    // Handle different possible structures
    if (item.json?.['0']?.content?.[0]?.text) {
      rawText = item.json['0'].content[0].text;
    } else if (item.json?.content?.[0]?.text) {
      rawText = item.json.content[0].text;
    } else if (item.json?.text) {
      rawText = item.json.text;
    } else if (typeof item.json === 'string') {
      rawText = item.json;
    } else {
      throw new Error('Could not find text in input structure');
    }

    // Step 2: Aggressive JSON cleaning
    let cleaned = rawText
      .trim()
      .replace(/```json\s*/gi, '')     // Remove ```json
      .replace(/```\s*/gi, '')          // Remove ```
      .replace(/^[^{]*/g, '')           // Remove everything before first {
      .replace(/[^}]*$/g, '')           // Remove everything after last }
      .replace(/\n/g, ' ')              // Remove newlines
      .replace(/\r/g, '')               // Remove carriage returns
      .replace(/\t/g, ' ')              // Replace tabs with spaces
      .replace(/\s{2,}/g, ' ')          // Collapse multiple spaces
      .trim();

    // Step 3: Try to parse JSON
    let data;
    try {
      data = JSON.parse(cleaned);
    } catch (parseError) {
      // If parse fails, try to extract JSON using regex
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        data = JSON.parse(jsonMatch[0]);
      } else {
        // Return error object for debugging
        out.push({
          json: {
            error: true,
            error_type: 'JSON_PARSE_FAILED',
            error_message: parseError.message,
            raw_text_preview: rawText.substring(0, 200),
            cleaned_text_preview: cleaned.substring(0, 200)
          }
        });
        continue;
      }
    }

    // Step 4: Validate structure
    if (!data.timesheetMetadata) {
      out.push({
        json: {
          error: true,
          error_type: 'INVALID_STRUCTURE',
          error_message: 'Missing timesheetMetadata',
          received_keys: Object.keys(data).join(', '),
          data_preview: JSON.stringify(data).substring(0, 200)
        }
      });
      continue;
    }

    if (!data.shifts || !Array.isArray(data.shifts)) {
      out.push({
        json: {
          error: true,
          error_type: 'INVALID_STRUCTURE',
          error_message: 'Missing or invalid shifts array',
          received_shifts: JSON.stringify(data.shifts)
        }
      });
      continue;
    }

    // Step 5: Generate unique IDs
    const timesheetId = 'TS_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const uploadTimestamp = new Date().toISOString();

    // Step 6: Extract metadata once
    const meta = data.timesheetMetadata;

    // Step 7: Create one flat row per shift
    for (const shift of data.shifts) {
      out.push({
        json: {
          // IDs and timestamps
          timesheet_id: timesheetId,
          upload_timestamp: uploadTimestamp,

          // Staff info (from metadata)
          staff_name_raw: String(meta.employerName || ''),
          staff_title: String(meta.staffTitle || ''),
          employer_number: String(meta.employerNumber || ''),
          job_title_raw: String(meta.jobTitle || ''),

          // Client info (from metadata)
          client_name_raw: String(meta.placeOfWorkRaw || meta.placeOfWork || ''),
          client_name_matched: String(meta.placeOfWorkMatched || meta.placeOfWork || ''),
          client_match_confidence: Number(meta.clientMatchConfidence || 0),

          // Timesheet metadata
          week_beginning: String(meta.weekBeginning || ''),
          employee_signature: String(meta.employeeSignature || ''),
          supervisor_signature_present: Boolean(meta.supervisorSignaturePresent),
          supervisor_signature_date: String(meta.supervisorSignatureDate || ''),

          // Shift-specific data
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

          // Validation
          validation_status: 'PENDING',
          needs_review: Boolean(
            meta.clientMatchConfidence < 70 ||
            Math.abs(shift.hoursDiscrepancy) > 0.5 ||
            !meta.supervisorSignaturePresent
          ),
          validation_notes: [
            meta.clientMatchConfidence < 70 ? `Low confidence: ${meta.clientMatchConfidence}%` : '',
            Math.abs(shift.hoursDiscrepancy) > 0.5 ? `Hours mismatch: ${shift.hoursDiscrepancy}` : '',
            !meta.supervisorSignaturePresent ? 'Missing supervisor signature' : ''
          ].filter(n => n).join('; '),

          original_document_url: ''
        }
      });
    }

  } catch (error) {
    // Catch-all error handler
    out.push({
      json: {
        error: true,
        error_type: 'UNEXPECTED_ERROR',
        error_message: error.message,
        error_stack: error.stack,
        input_preview: JSON.stringify(item).substring(0, 300)
      }
    });
  }
}

// Step 8: Return all rows
// If errors occurred, they'll be included in the output for debugging
return out;
