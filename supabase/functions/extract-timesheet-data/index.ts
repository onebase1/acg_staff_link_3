import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.28.0";

/**
 * 🔍 ENHANCED OCR TIMESHEET DATA EXTRACTOR
 *
 * V2 Improvements:
 * - Handles multiple timesheet formats (NHS, care home, generic)
 * - Robust scheduled hours extraction
 * - Automatic discrepancy detection
 * - Confidence scoring
 * - Better error handling
 */

serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { file_url, expected_data } = await req.json();

    if (!file_url) {
      return new Response(
        JSON.stringify({
          error: 'Missing required field: file_url'
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const openai = new OpenAI({
      apiKey: Deno.env.get("OPENAI_API_KEY"),
    });

    console.log('🔍 Analyzing timesheet document:', file_url);
    console.log('📊 Expected data for validation:', expected_data);

    // ENHANCED PROMPT with better instructions for multiple formats
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert OCR specialist for healthcare timesheet documents. You can handle:
- NHS timesheets
- Care home timesheets
- Generic staff timesheets
- Handwritten or typed formats

EXTRACT THE FOLLOWING DATA:

**CRITICAL FIELDS:**
1. Employee/Staff name (first and last)
2. Client/Site/Facility name
3. Date worked (DD/MM/YYYY or similar)
4. Start time (HH:MM format, 24-hour preferred)
5. End time (HH:MM format, 24-hour preferred)
6. Break duration (in minutes, e.g., "30 min" = 30)

**CALCULATED FIELDS:**
7. Total hours worked (calculate from start/end minus break if not explicitly stated)
8. Scheduled hours (may be labeled as "contracted hours", "planned hours", "shift duration")

**VERIFICATION:**
9. Staff signature present (yes/no)
10. Supervisor/Manager signature present (yes/no)
11. Stamp or approval mark present (yes/no)

**NOTES:**
12. Any handwritten notes, amendments, or comments

**IMPORTANT PARSING RULES:**
- If you see "8.5h", "8:30h", or "8 hours 30 minutes" → convert to decimal (8.5)
- Break times: "30 min", "½ hour", "0.5h" → all equal 30 minutes
- If start/end times cross midnight (e.g., 22:00 to 08:00), calculate correctly
- Look for keywords: "scheduled", "contracted", "planned", "expected" for scheduled hours
- Actual worked hours might be in a different field/section than scheduled

**CONFIDENCE ASSESSMENT:**
- Rate your confidence in each field extraction (0-100%)
- Note if data is unclear, handwritten poorly, or partially obscured

Return ONLY valid JSON in this exact format (no markdown, no explanations):
{
  "employee_name": "string",
  "client_name": "string",
  "date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "end_time": "HH:MM",
  "break_minutes": number,
  "total_hours": number,
  "scheduled_hours": number or null,
  "staff_signature": boolean,
  "supervisor_signature": boolean,
  "approval_stamp": boolean,
  "notes": "string",
  "confidence": {
    "overall": number (0-100),
    "employee_name": number,
    "client_name": number,
    "date": number,
    "times": number,
    "hours": number,
    "signatures": number
  },
  "warnings": ["array of strings describing any unclear or suspicious data"]
}`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract timesheet data from this document.

**Expected shift details (for validation):**
- Staff: ${expected_data?.staff_name || 'Unknown'}
- Client: ${expected_data?.client_name || 'Unknown'}
- Date: ${expected_data?.shift_date || 'Unknown'}
- Scheduled hours: ${expected_data?.scheduled_hours || 'Unknown'}
- Scheduled time: ${expected_data?.expected_start || '??:??'} - ${expected_data?.expected_end || '??:??'}

Please extract all data from the document and compare with expected values.`
            },
            {
              type: "image_url",
              image_url: {
                url: file_url,
                detail: "high"
              }
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 800,
    });

    const content = response.choices[0].message.content.trim();
    console.log('📄 Raw OCR response:', content);

    // Parse extracted data
    let extractedData;
    try {
      extractedData = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse OCR response as JSON:', content);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'OCR failed to extract structured data',
          raw_content: content,
          confidence: {
            overall: 0
          }
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // VALIDATION: Compare with expected data
    const validation = {
      validation_status: 'match',
      mismatches: [],
      warnings: extractedData.warnings || [],
      confidence_score: extractedData.confidence?.overall || 0
    };

    if (expected_data) {
      // 1. HOURS VALIDATION (most important)
      if (expected_data.scheduled_hours && extractedData.total_hours) {
        // ✅ APPLY 10-HOUR GOLD RULE: If scheduled gross > 10, the "target" Net is -1h
        const expectedNetHours = expected_data.scheduled_hours > 10 ? expected_data.scheduled_hours - 1 : expected_data.scheduled_hours;
        
        const hoursDiff = Math.abs(expectedNetHours - extractedData.total_hours);
        const percentDiff = (hoursDiff / expectedNetHours) * 100;

        if (hoursDiff > 0.5) {
          validation.validation_status = 'mismatch';
          validation.mismatches.push({
            field: 'hours',
            expected: expectedNetHours, // We compare with the expected NET
            actual: extractedData.total_hours,
            scheduled_gross: expected_data.scheduled_hours,
            difference: hoursDiff,
            percent_difference: percentDiff.toFixed(1),
            severity: percentDiff > 20 ? 'critical' : percentDiff > 10 ? 'high' : 'medium'
          });
        } else if (hoursDiff > 0.1) {
          validation.warnings.push({
            field: 'hours',
            message: `Minor variance: ${hoursDiff.toFixed(1)}h difference (${percentDiff.toFixed(0)}%)`,
            severity: 'low'
          });
        }

        // Check if document shows BOTH scheduled and actual hours
        if (extractedData.scheduled_hours && extractedData.scheduled_hours !== extractedData.total_hours) {
          const docHoursDiff = Math.abs(extractedData.scheduled_hours - extractedData.total_hours);
          validation.warnings.push({
            field: 'hours_on_document',
            message: `Document shows scheduled: ${extractedData.scheduled_hours}h, actual: ${extractedData.total_hours}h (${docHoursDiff.toFixed(1)}h difference)`,
            severity: docHoursDiff > 1 ? 'high' : 'medium'
          });
        }
      }

      // 2. STAFF NAME VALIDATION
      if (expected_data.staff_name && extractedData.employee_name) {
        const nameMatch = extractedData.employee_name.toLowerCase().includes(expected_data.staff_name.toLowerCase()) ||
                          expected_data.staff_name.toLowerCase().includes(extractedData.employee_name.toLowerCase());
        if (!nameMatch) {
          validation.validation_status = 'mismatch';
          validation.mismatches.push({
            field: 'staff_name',
            expected: expected_data.staff_name,
            actual: extractedData.employee_name,
            severity: 'critical'
          });
        }
      }

      // 3. CLIENT NAME VALIDATION
      if (expected_data.client_name && extractedData.client_name) {
        const clientMatch = extractedData.client_name.toLowerCase().includes(expected_data.client_name.toLowerCase()) ||
                            expected_data.client_name.toLowerCase().includes(extractedData.client_name.toLowerCase());
        if (!clientMatch) {
          validation.validation_status = 'mismatch';
          validation.mismatches.push({
            field: 'client_name',
            expected: expected_data.client_name,
            actual: extractedData.client_name,
            severity: 'high'
          });
        }
      }

      // 4. DATE VALIDATION
      if (expected_data.shift_date && extractedData.date) {
        if (expected_data.shift_date !== extractedData.date) {
          validation.validation_status = 'mismatch';
          validation.mismatches.push({
            field: 'date',
            expected: expected_data.shift_date,
            actual: extractedData.date,
            severity: 'critical'
          });
        }
      }

      // 5. SIGNATURE CHECKS
      if (!extractedData.staff_signature) {
        validation.warnings.push({
          field: 'staff_signature',
          message: 'Staff signature not detected on document',
          severity: 'high'
        });
      }
      if (!extractedData.supervisor_signature) {
        validation.warnings.push({
          field: 'supervisor_signature',
          message: 'Supervisor/Manager signature not detected on document',
          severity: 'high'
        });
      }

      // 6. CONFIDENCE THRESHOLD
      if (extractedData.confidence?.overall < 70) {
        validation.warnings.push({
          field: 'confidence',
          message: `Low OCR confidence (${extractedData.confidence.overall}%). Document may be unclear or damaged.`,
          severity: 'high'
        });
      }

      // 7. MULTI-ROW TIMESHEET DETECTION (Quick Fix 1)
      // Detects when document shows significantly more hours than expected for single shift
      if (expected_data.scheduled_hours && extractedData.total_hours > expected_data.scheduled_hours * 2) {
        const hoursRatio = (extractedData.total_hours / expected_data.scheduled_hours).toFixed(1);

        validation.warnings.push({
          field: 'multi_row_timesheet',
          message: `Document shows ${extractedData.total_hours}h total, but this shift expected only ${expected_data.scheduled_hours}h. This appears to be a multi-day timesheet with multiple rows (${hoursRatio}x expected hours). Please verify the document shows the correct date/row for this shift.`,
          severity: 'high',
          action_required: 'Admin: Check if timesheet contains multiple dates. Verify only the relevant row matches this shift.',
          possible_cause: 'Staff using same physical timesheet for multiple consecutive shifts'
        });

        // Downgrade hours mismatch from critical to medium if multi-row detected
        const hoursMismatch = validation.mismatches.find(m => m.field === 'hours');
        if (hoursMismatch && hoursMismatch.severity === 'critical') {
          hoursMismatch.severity = 'medium';
          hoursMismatch.possible_reason = 'Multi-row timesheet detected - hours may include other shifts';
          console.log('⚠️ Downgraded hours mismatch severity due to multi-row detection');
        }
      }
    }

    console.log('✅ Validation complete:', validation);

    // Determine if this requires manual review
    const requiresReview =
      validation.validation_status === 'mismatch' ||
      validation.confidence_score < 70 ||
      validation.mismatches.some(m => m.severity === 'critical');

    return new Response(
      JSON.stringify({
        success: true,
        extracted_data: {
          ...extractedData,
          ...validation,
          hours_worked: extractedData.total_hours,
          extracted_at: new Date().toISOString(),
          requires_manual_review: requiresReview,
          review_reasons: requiresReview ? [
            ...(validation.mismatches.filter(m => m.severity === 'critical').map(m => m.field)),
            ...(validation.confidence_score < 70 ? ['low_confidence'] : [])
          ] : []
        }
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('❌ OCR extraction error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
        confidence: {
          overall: 0
        }
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
