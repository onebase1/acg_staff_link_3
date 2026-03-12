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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

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
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { file_url, expected_data } = await req.json();

    if (!file_url) {
      return new Response(
        JSON.stringify({
          error: 'Missing required field: file_url'
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

**GLOBAL FIELDS (Document Level):**
1. Employee/Staff name (first and last)
2. Client/Site/Facility name
3. Staff signature present (yes/no)
4. Supervisor/Manager signature present (yes/no)
5. Stamp or approval mark present (yes/no)
6. Any handwritten notes, amendments, or comments

**ROW-LEVEL SHIFTS (Extract EVERY separate daily shift line as an object in a 'rows' array):**
7. Date worked (convert to YYYY-MM-DD format)
8. Start time (HH:MM format, 24-hour preferred)
9. End time (HH:MM format, 24-hour preferred)
10. Break duration (in minutes, e.g., "30 min" = 30)
11. Total hours worked (CRITICAL: YOU MUST mathematically calculate this as exactly (End Time - Start Time) - Break. DO NOT just copy the total written on the paper, as staff often error. Rely ONLY on your own math.)
12. Scheduled hours (if present on the row)

**IMPORTANT PARSING RULES:**
- If you see "8.5h", "8:30h", or "8 hours 30 minutes" → convert to decimal (8.5)
- Break times: "1h" = 60, "30 min" = 30, "½ hour" = 30, "0.5h" = 30
- If start/end times cross midnight (e.g., 22:00 to 08:00), calculate duration correctly
- If the document is a table with multiple dates/rows, extract EACH date as a separate object in the \`rows\` array
- CRITICAL: Never ignore rows. If there are 3 written dates, return 3 objects in the \`rows\` array.

**CONFIDENCE ASSESSMENT:**
- Rate your confidence in each field extraction (0-100%)
- Note if data is unclear, handwritten poorly, or partially obscured

Return ONLY valid JSON in this exact format (no markdown, no explanations):
{
  "employee_name": "string",
  "client_name": "string",
  "staff_signature": boolean,
  "supervisor_signature": boolean,
  "approval_stamp": boolean,
  "notes": "string",
  "rows": [
    {
      "date": "YYYY-MM-DD",
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "break_minutes": number,
      "total_hours": number,
      "scheduled_hours": number or null
    }
  ],
  "confidence": {
    "overall": number (0-100),
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

    // VALIDATION: Compare with expected data (Primary Target Date)
    const validation = {
      validation_status: 'match',
      mismatches: [] as any[],
      warnings: (extractedData.warnings || []) as any[],
      confidence_score: extractedData.confidence?.overall || 0
    };

    if (expected_data && extractedData.rows && extractedData.rows.length > 0) {
      // Find the row that matches the expected date, or default to the first row if date is missing
      const primaryRow = expected_data.shift_date 
        ? (extractedData.rows.find(r => r.date === expected_data.shift_date) || extractedData.rows[0])
        : extractedData.rows[0];

      extractedData.matched_row_info = primaryRow; // Store for fallback purposes

      // 1. HOURS VALIDATION (Primary Row)
      if (expected_data.scheduled_hours && primaryRow.total_hours) {
        // ✅ APPLY 10-HOUR GOLD RULE: If scheduled gross > 10, the "target" Net is -1h
        const expectedNetHours = expected_data.scheduled_hours > 10 ? expected_data.scheduled_hours - 1 : expected_data.scheduled_hours;
        const expectedGrossHours = expected_data.scheduled_hours;
        
        const hoursNetDiff = Math.abs(expectedNetHours - primaryRow.total_hours);
        const hoursGrossDiff = Math.abs(expectedGrossHours - primaryRow.total_hours);

        // ✅ FLEXIBLE MATCH: Pass if matches Net (-1h) OR matches Gross (no break)
        const isMatch = hoursNetDiff <= 0.5 || hoursGrossDiff <= 0.01;

        if (!isMatch) {
          validation.validation_status = 'mismatch';
          validation.mismatches.push({
            field: 'hours',
            expected_net: expectedNetHours,
            expected_gross: expectedGrossHours,
            actual: primaryRow.total_hours,
            difference_from_net: hoursNetDiff,
            severity: hoursNetDiff > 2 ? 'critical' : 'high'
          });
        } else if (hoursGrossDiff <= 0.01 && expected_data.scheduled_hours > 10) {
          // It's a match, but notify that no break was taken/recorded
          validation.warnings.push({
            field: 'hours',
            message: `Gross match detected (12/12). Staff may have worked through their break or didn't record it.`,
            severity: 'low'
          });
        }

        if (primaryRow.scheduled_hours && primaryRow.scheduled_hours !== primaryRow.total_hours) {
          const docHoursDiff = Math.abs(primaryRow.scheduled_hours - primaryRow.total_hours);
          validation.warnings.push({
            field: 'hours_on_document',
            message: `Document shows scheduled: ${primaryRow.scheduled_hours}h, actual: ${primaryRow.total_hours}h for ${primaryRow.date}`,
            severity: docHoursDiff > 1 ? 'high' : 'medium'
          });
        }
      }

      // 2. STAFF NAME VALIDATION (Smart Fuzzy Match for Middle Names)
      if (expected_data.staff_name && extractedData.employee_name) {
        const expectedNameParts = expected_data.staff_name.toLowerCase().split(/[\s-]+/).filter((p: string) => p.length > 2);
        const actualName = extractedData.employee_name.toLowerCase();
        
        // Count how many significant parts of the expected name are found in the actual name
        let matchedPartsCount = 0;
        for (const part of expectedNameParts) {
          if (actualName.includes(part)) {
            matchedPartsCount++;
          }
        }

        // Pass if at least 2 parts match (First + Last), or if it's a single word name and it matches
        const requiredMatches = expectedNameParts.length > 1 ? 2 : 1;
        const nameMatch = matchedPartsCount >= requiredMatches || 
                          actualName.includes(expected_data.staff_name.toLowerCase()) ||
                          expected_data.staff_name.toLowerCase().includes(actualName);

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
      if (expected_data.shift_date && primaryRow.date) {
        if (expected_data.shift_date !== primaryRow.date) {
          validation.validation_status = 'mismatch';
          validation.mismatches.push({
            field: 'date',
            expected: expected_data.shift_date,
            actual: primaryRow.date,
            severity: 'high'
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
      if (extractedData.rows.length > 1) {
          validation.warnings.push({
            field: 'multi_row_timesheet',
            message: `Document contains ${extractedData.rows.length} separate shifts. Please review the checklist below.`,
            severity: 'low',
            action_required: 'Admin/Staff to confirm which shifts to approve via checkboxes.'
          });

          // If it's multi-row, the "hours difference" for the primary row might be a false alarm if the dates matched up weirdly.
          // But since we extract rows granularly now, this is less likely to trigger a false mismatch unless the primary row itself differs.
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
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ OCR extraction error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
        stack: error.stack,
        confidence: {
          overall: 0
        }
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
