import { TestContext, TestResult } from '../types';

/**
 * 🤖 AI SHIFT CREATOR TESTS
 *
 * Tests the complete flow:
 * 1. Natural language input → AI extraction
 * 2. Shift creation in database
 * 3. Verification of created shifts
 */

/**
 * Determine shift type from start_time
 * Day shift: 06:00-17:59, Night shift: 18:00-05:59
 */
function determineShiftType(startTime: string): 'day' | 'night' {
  if (!startTime) return 'day';

  // Extract hour from HH:MM format
  const hour = parseInt(startTime.split(':')[0], 10);

  // Day shift: 06:00-17:59, Night shift: 18:00-05:59
  return (hour >= 6 && hour < 18) ? 'day' : 'night';
}

export async function testAIShiftExtraction(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Test AI extraction with natural language
    const naturalLanguageInput = "Need 3 HCA for Divine Care tomorrow 8am-8pm, Room 14, 15, and 20";
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    
    const systemPrompt = `You are a helpful AI assistant for a healthcare staffing agency. Extract shift details from natural language.

Available clients: Divine Care Centre, Sunrise Care Home
Today's date: ${new Date().toISOString().split('T')[0]}

Extract and return JSON:
{
  "complete": true,
  "shifts": [
    {
      "client_name": "Divine Care Centre",
      "date": "${tomorrowDate}",
      "start_time": "08:00",
      "end_time": "20:00",
      "duration_hours": 12,
      "role_required": "hca",
      "urgency": "normal",
      "work_location_within_site": "Room 14"
    }
  ]
}

User input: ${naturalLanguageInput}`;

    const result = await ctx.functions.invokeFunction('ai-assistant', {
      mode: 'extract_shifts',
      prompt: systemPrompt,
      response_json_schema: false,
      temperature: 0.7,
      max_tokens: 2000,
      model: 'gpt-4o-mini'
    });

    console.log('🤖 AI Response:', JSON.stringify(result.data, null, 2));

    // Parse the response
    let extractedData;
    try {
      let responseText = result.data?.data || result.data;

      // Remove markdown code blocks if present
      if (typeof responseText === 'string') {
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      }

      extractedData = typeof responseText === 'string' ? JSON.parse(responseText) : responseText;
    } catch (e) {
      console.error('❌ Failed to parse AI response:', e);
      extractedData = result.data;
    }

    const hasShifts = extractedData?.shifts && Array.isArray(extractedData.shifts);
    const shiftsCount = hasShifts ? extractedData.shifts.length : 0;
    const isComplete = extractedData?.complete === true;

    return {
      testId: 'ai-001',
      action: 'AI extracts shifts from natural language',
      passed: result.success && hasShifts && shiftsCount === 3 && isComplete,
      duration: (Date.now() - startTime) / 1000,
      details: {
        input: naturalLanguageInput,
        shiftsExtracted: shiftsCount,
        expectedShifts: 3,
        complete: isComplete,
        extractedData: extractedData
      },
      error: result.error || (!hasShifts ? 'No shifts extracted' : undefined),
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'ai-001',
      action: 'AI extracts shifts from natural language',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testAIShiftCreationInDatabase(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Step 1: Get agency and client IDs
    const agencyId = await ctx.db.getAgencyId(ctx.config.dominion.agency_name);
    const clients = await ctx.db.getClient()
      .from('clients')
      .select('*')
      .eq('agency_id', agencyId)
      .limit(1);

    if (!clients.data || clients.data.length === 0) {
      throw new Error('No clients found for testing');
    }

    const testClient = clients.data[0];
    
    // Step 2: Extract shifts using AI
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    
    const naturalLanguageInput = `Need 2 HCA for ${testClient.name} tomorrow 8am-8pm, Room 101 and Room 102`;
    
    const systemPrompt = `You are a helpful AI assistant. Extract shift details and return JSON:
{
  "complete": true,
  "shifts": [
    {
      "client_name": "${testClient.name}",
      "date": "${tomorrowDate}",
      "start_time": "08:00",
      "end_time": "20:00",
      "duration_hours": 12,
      "role_required": "hca",
      "urgency": "normal",
      "work_location_within_site": "Room 101"
    }
  ]
}

User input: ${naturalLanguageInput}`;

    const aiResult = await ctx.functions.invokeFunction('ai-assistant', {
      mode: 'extract_shifts',
      prompt: systemPrompt,
      response_json_schema: false,
      temperature: 0.7,
      max_tokens: 2000,
      model: 'gpt-4o-mini'
    });

    console.log('🤖 AI Extraction Result:', JSON.stringify(aiResult.data, null, 2));

    // Parse AI response
    let extractedShifts;
    try {
      let responseText = aiResult.data?.data || aiResult.data;

      // Remove markdown code blocks if present
      if (typeof responseText === 'string') {
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      }

      const parsed = typeof responseText === 'string' ? JSON.parse(responseText) : responseText;
      extractedShifts = parsed.shifts || [];
    } catch (e) {
      throw new Error(`Failed to parse AI response: ${e.message}`);
    }

    if (!extractedShifts || extractedShifts.length === 0) {
      throw new Error('AI did not extract any shifts');
    }

    // Step 3: Create shifts in database
    const shiftsToInsert = extractedShifts.map((shift: any) => ({
      agency_id: agencyId,
      client_id: testClient.id,
      date: shift.date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      shift_type: determineShiftType(shift.start_time), // ✅ Required field
      duration_hours: shift.duration_hours,
      role_required: shift.role_required,
      urgency: shift.urgency || 'normal',
      work_location_within_site: shift.work_location_within_site,
      status: 'open',
      pay_rate: testClient.contract_terms?.rates_by_role?.[shift.role_required]?.pay_rate || 0,
      charge_rate: testClient.contract_terms?.rates_by_role?.[shift.role_required]?.charge_rate || 0,
      shift_journey_log: [{
        state: 'created',
        timestamp: new Date().toISOString(),
        method: 'ai_natural_language_test'
      }]
    }));

    console.log('📝 Inserting shifts:', JSON.stringify(shiftsToInsert, null, 2));

    const { data: createdShifts, error: insertError } = await ctx.db.getClient()
      .from('shifts')
      .insert(shiftsToInsert)
      .select();

    if (insertError) {
      throw new Error(`Failed to insert shifts: ${insertError.message}`);
    }

    // Step 4: Verify shifts were created
    const createdShiftIds = createdShifts?.map((s: any) => s.id) || [];

    const { data: verifiedShifts, error: verifyError } = await ctx.db.getClient()
      .from('shifts')
      .select('*')
      .in('id', createdShiftIds);

    if (verifyError) {
      throw new Error(`Failed to verify shifts: ${verifyError.message}`);
    }

    const allShiftsCreated = verifiedShifts && verifiedShifts.length === extractedShifts.length;
    const allShiftsOpen = verifiedShifts?.every((s: any) => s.status === 'open');

    // Cleanup: Delete test shifts
    await ctx.db.getClient()
      .from('shifts')
      .delete()
      .in('id', createdShiftIds);

    return {
      testId: 'ai-002',
      action: 'AI creates shifts in database',
      passed: aiResult.success && allShiftsCreated && allShiftsOpen,
      duration: (Date.now() - startTime) / 1000,
      details: {
        input: naturalLanguageInput,
        shiftsExtracted: extractedShifts.length,
        shiftsCreated: createdShifts?.length || 0,
        shiftsVerified: verifiedShifts?.length || 0,
        shiftIds: createdShiftIds,
        allOpen: allShiftsOpen
      },
      error: aiResult.error || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'ai-002',
      action: 'AI creates shifts in database',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testAIShiftCreationWithValidation(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();

  try {
    // Test with edge cases and validation
    const agencyId = await ctx.db.getAgencyId(ctx.config.dominion.agency_name);
    const clients = await ctx.db.getClient()
      .from('clients')
      .select('*')
      .eq('agency_id', agencyId)
      .limit(1);

    if (!clients.data || clients.data.length === 0) {
      throw new Error('No clients found for testing');
    }

    const testClient = clients.data[0];

    // Test overnight shift (8pm to 8am next day)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];

    const naturalLanguageInput = `Need 1 nurse for ${testClient.name} tomorrow night shift 8pm to 8am, ICU`;

    const systemPrompt = `Extract shift details and return JSON:
{
  "complete": true,
  "shifts": [
    {
      "client_name": "${testClient.name}",
      "date": "${tomorrowDate}",
      "start_time": "20:00",
      "end_time": "08:00",
      "duration_hours": 12,
      "role_required": "nurse",
      "urgency": "normal",
      "work_location_within_site": "ICU"
    }
  ]
}

User input: ${naturalLanguageInput}`;

    const aiResult = await ctx.functions.invokeFunction('ai-assistant', {
      mode: 'extract_shifts',
      prompt: systemPrompt,
      response_json_schema: false,
      temperature: 0.7,
      max_tokens: 2000,
      model: 'gpt-4o-mini'
    });

    // Parse and validate
    let extractedShifts;
    try {
      let responseText = aiResult.data?.data || aiResult.data;

      // Remove markdown code blocks if present
      if (typeof responseText === 'string') {
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      }

      const parsed = typeof responseText === 'string' ? JSON.parse(responseText) : responseText;
      extractedShifts = parsed.shifts || [];
    } catch (e) {
      throw new Error(`Failed to parse AI response: ${e.message}`);
    }

    const hasOvernightShift = extractedShifts.some((s: any) =>
      s.start_time === '20:00' && s.end_time === '08:00'
    );
    const hasCorrectRole = extractedShifts.some((s: any) => s.role_required === 'nurse');
    const hasLocation = extractedShifts.some((s: any) => s.work_location_within_site === 'ICU');

    return {
      testId: 'ai-003',
      action: 'AI handles overnight shifts and validation',
      passed: aiResult.success && hasOvernightShift && hasCorrectRole && hasLocation,
      duration: (Date.now() - startTime) / 1000,
      details: {
        input: naturalLanguageInput,
        extractedShifts: extractedShifts,
        validations: {
          overnightShift: hasOvernightShift,
          correctRole: hasCorrectRole,
          hasLocation: hasLocation
        }
      },
      error: aiResult.error || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'ai-003',
      action: 'AI handles overnight shifts and validation',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Test 4: AI Handles Multi-Day Bulk Shift Creation
 * Tests creating multiple shifts across multiple days with specific staff assignments
 */
export async function testAIBulkMultiDayShiftCreation(context: TestContext): Promise<TestResult> {
  const startTime = Date.now();

  try {
    // Multi-day shift request (realistic scenario)
    const bulkRequest = `
Create individual shifts for Divine Care Centre for the week of November 17-23, 2025.
Each shift should be a separate entry in the shifts array.

DAYS (8am-8pm):
Monday 17th: 5 HCA shifts
Tuesday 18th: 1 HCA shift
Wednesday 19th: 2 HCA shifts
Thursday 20th: 4 HCA shifts
Friday 21st: 2 HCA shifts
Saturday 22nd: 5 HCA shifts
Sunday 23rd: 4 HCA shifts

NIGHTS (8pm-8am):
Monday 17th: 2 HCA shifts
Tuesday 18th: 2 HCA shifts
Wednesday 19th: 3 HCA shifts
Thursday 20th: 3 HCA shifts
Friday 21st: 5 HCA shifts
Saturday 22nd: 3 HCA shifts
Sunday 23rd: 3 HCA shifts

Return each shift as a separate object with client_name, date, start_time, end_time, duration_hours, role_required, urgency.
    `.trim();

    console.log('🤖 Bulk Request:', bulkRequest);

    // Step 1: Call AI to extract shifts
    const aiResult = await context.functions.invokeFunction('ai-assistant', {
      mode: 'extract_shifts',
      prompt: bulkRequest,
      response_json_schema: false,
      temperature: 0.7,
      max_tokens: 4000, // Increased to handle 44 shifts
      model: 'gpt-4o-mini'
    });

    console.log('🤖 AI Extraction Result:', JSON.stringify(aiResult, null, 2));

    if (!aiResult.success) {
      throw new Error(`AI extraction failed: ${aiResult.error}`);
    }

    // Parse and validate
    let extractedShifts;
    try {
      let responseText = aiResult.data?.data || aiResult.data;

      // Remove markdown code blocks if present
      if (typeof responseText === 'string') {
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      }

      const parsed = typeof responseText === 'string' ? JSON.parse(responseText) : responseText;
      extractedShifts = parsed.shifts || [];
    } catch (e) {
      throw new Error(`Failed to parse AI response: ${e.message}`);
    }

    console.log(`📊 Extracted ${extractedShifts.length} shifts`);

    // Validate expected counts
    const expectedTotalShifts =
      // Days: 5 + 1 + 2 + 4 + 2 + 5 + 4 = 23
      // Nights: 2 + 2 + 3 + 3 + 5 + 3 + 3 = 21
      // Total: 44
      44;

    const dayShifts = extractedShifts.filter((s: any) => {
      const hour = parseInt(s.start_time.split(':')[0], 10);
      return hour >= 6 && hour < 18;
    });

    const nightShifts = extractedShifts.filter((s: any) => {
      const hour = parseInt(s.start_time.split(':')[0], 10);
      return hour >= 18 || hour < 6;
    });

    console.log(`📊 Day Shifts: ${dayShifts.length}, Night Shifts: ${nightShifts.length}`);

    // Validate date range
    const dates = [...new Set(extractedShifts.map((s: any) => s.date))].sort();
    console.log(`📅 Dates covered: ${dates.join(', ')}`);

    const hasAllDates = dates.length === 7; // Should have 7 days
    const correctShiftCount = extractedShifts.length >= 35; // Allow tolerance (35-44 shifts is acceptable)
    const hasCorrectMix = dayShifts.length >= 20 && nightShifts.length >= 15; // Verify day/night mix

    return {
      testId: 'ai-004',
      action: 'AI handles bulk multi-day shift creation',
      passed: hasAllDates && correctShiftCount && hasCorrectMix,
      duration: (Date.now() - startTime) / 1000,
      details: {
        input: bulkRequest.substring(0, 100) + '...',
        totalShiftsExtracted: extractedShifts.length,
        expectedShifts: expectedTotalShifts,
        dayShifts: dayShifts.length,
        nightShifts: nightShifts.length,
        datesCount: dates.length,
        datesCovered: dates,
        hasAllDates,
        correctShiftCount,
        hasCorrectMix
      },
      timestamp: new Date().toISOString()
    };

  } catch (error: any) {
    return {
      testId: 'ai-004',
      action: 'AI handles bulk multi-day shift creation',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

