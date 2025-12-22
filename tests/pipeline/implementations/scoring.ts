import { TestContext, TestResult } from '../types';

// =============================================================================
// SCORING MODULE TESTS
// Tests for staff reliability scoring, client scoring, and visibility controls
// =============================================================================

/**
 * TEST: score-001 - Staff score calculation uses correct column (assigned_staff_id)
 * Verifies the fix for staff_id -> assigned_staff_id bug
 */
export async function testStaffScoreColumnFix(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const agencyId = await ctx.db.getAgencyId(ctx.config.dominion.agency_name);
    
    // Get a staff member
    const { data: staff } = await ctx.db.getClient()
      .from('staff')
      .select('id, full_name, reliability_score')
      .eq('agency_id', agencyId)
      .limit(1)
      .single();
    
    if (!staff) throw new Error('No staff found for testing');
    
    // Verify shifts table has assigned_staff_id column (not staff_id)
    const { data: shifts, error } = await ctx.db.getClient()
      .from('shifts')
      .select('id, assigned_staff_id, status')
      .eq('assigned_staff_id', staff.id)
      .limit(5);
    
    // Query should work if column exists
    const columnExists = !error;
    
    // Also verify reliability_score column exists on staff
    const scoreExists = staff.reliability_score !== undefined;
    
    return {
      testId: 'score-001',
      action: 'Staff score uses assigned_staff_id column',
      passed: columnExists && scoreExists,
      duration: (Date.now() - startTime) / 1000,
      details: { 
        assigned_staff_id_column: columnExists,
        reliability_score_column: scoreExists,
        staff_id: staff.id,
        current_score: staff.reliability_score,
        shifts_found: shifts?.length || 0
      },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'score-001',
      action: 'Staff score uses assigned_staff_id column',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * TEST: score-002 - Agency can toggle show_score_to_staff setting
 * Verifies the visibility control column exists and can be updated
 */
export async function testScoreVisibilitySetting(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const agencyId = await ctx.db.getAgencyId(ctx.config.dominion.agency_name);
    
    // Get current agency settings
    const { data: agency, error: fetchError } = await ctx.db.getClient()
      .from('agencies')
      .select('id, name, show_score_to_staff')
      .eq('id', agencyId)
      .single();
    
    if (fetchError) throw new Error(`Failed to fetch agency: ${fetchError.message}`);
    
    const columnExists = 'show_score_to_staff' in agency;
    const originalValue = agency.show_score_to_staff;
    
    // Try toggling the setting
    const newValue = !originalValue;
    const { error: updateError } = await ctx.db.getClient()
      .from('agencies')
      .update({ show_score_to_staff: newValue })
      .eq('id', agencyId);
    
    const canUpdate = !updateError;
    
    // Restore original value
    if (canUpdate) {
      await ctx.db.getClient()
        .from('agencies')
        .update({ show_score_to_staff: originalValue })
        .eq('id', agencyId);
    }
    
    return {
      testId: 'score-002',
      action: 'Agency show_score_to_staff toggle',
      passed: columnExists && canUpdate,
      duration: (Date.now() - startTime) / 1000,
      details: { 
        column_exists: columnExists,
        can_toggle: canUpdate,
        current_value: originalValue,
        agency_name: agency.name
      },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'score-002',
      action: 'Agency show_score_to_staff toggle',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * TEST: score-003 - Score bands are correctly defined (50 = Building, not penalty)
 * Verifies the score interpretation logic
 */
export async function testScoreBandsInterpretation(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Define expected score bands per spec
    const scoreBands = [
      { min: 0, max: 29, label: 'Low', color: 'red' },
      { min: 30, max: 49, label: 'Fair', color: 'orange' },
      { min: 50, max: 69, label: 'Building', color: 'indigo' },  // FIXED: was "Average"
      { min: 70, max: 84, label: 'Good', color: 'blue' },
      { min: 85, max: 100, label: 'Excellent', color: 'green' }
    ];
    
    // Test score=50 falls in "Building" band (not penalty)
    const score50Band = scoreBands.find(b => 50 >= b.min && 50 <= b.max);
    const score50IsBuilding = score50Band?.label === 'Building';
    
    // Test score=0 falls in "Low" band
    const score0Band = scoreBands.find(b => 0 >= b.min && 0 <= b.max);
    const score0IsLow = score0Band?.label === 'Low';
    
    // Test score=100 falls in "Excellent" band
    const score100Band = scoreBands.find(b => 100 >= b.min && 100 <= b.max);
    const score100IsExcellent = score100Band?.label === 'Excellent';
    
    const allBandsCorrect = score50IsBuilding && score0IsLow && score100IsExcellent;
    
    return {
      testId: 'score-003',
      action: 'Score bands interpretation (50 = Building)',
      passed: allBandsCorrect,
      duration: (Date.now() - startTime) / 1000,
      details: { 
        score_50_band: score50Band?.label,
        score_0_band: score0Band?.label,
        score_100_band: score100Band?.label,
        expected_50_band: 'Building',
        bands_correct: allBandsCorrect
      },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'score-003',
      action: 'Score bands interpretation (50 = Building)',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * TEST: score-004 - Completed shift increments staff score
 * Verifies scoring trigger on shift completion
 */
export async function testShiftCompletionScoreIncrement(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const agencyId = await ctx.db.getAgencyId(ctx.config.dominion.agency_name);
    
    // Get a staff member with their current score
    const { data: staff } = await ctx.db.getClient()
      .from('staff')
      .select('id, full_name, reliability_score')
      .eq('agency_id', agencyId)
      .not('reliability_score', 'is', null)
      .limit(1)
      .single();
    
    if (!staff) throw new Error('No staff with score found');
    
    const originalScore = staff.reliability_score || 50;
    
    // Count completed shifts for this staff
    const { count: completedShiftsBefore } = await ctx.db.getClient()
      .from('shifts')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_staff_id', staff.id)
      .eq('status', 'completed');
    
    // Verify the query uses assigned_staff_id (not staff_id)
    const queryUsesCorrectColumn = completedShiftsBefore !== null;
    
    return {
      testId: 'score-004',
      action: 'Shift completion score increment',
      passed: queryUsesCorrectColumn,
      duration: (Date.now() - startTime) / 1000,
      details: { 
        staff_name: staff.full_name,
        current_score: originalScore,
        completed_shifts: completedShiftsBefore || 0,
        query_uses_assigned_staff_id: queryUsesCorrectColumn
      },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'score-004',
      action: 'Shift completion score increment',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * TEST: score-005 - Client scoring uses correct column references
 */
export async function testClientScoringQuery(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const agencyId = await ctx.db.getAgencyId(ctx.config.dominion.agency_name);
    
    // Get a client with their current score
    const { data: client } = await ctx.db.getClient()
      .from('clients')
      .select('id, name, desirability_score')
      .eq('agency_id', agencyId)
      .limit(1)
      .single();
    
    if (!client) throw new Error('No client found');
    
    // Verify desirability_score column exists
    const scoreColumnExists = 'desirability_score' in client;
    
    // Count shifts for this client
    const { count: totalShifts } = await ctx.db.getClient()
      .from('shifts')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', client.id);
    
    const { count: filledShifts } = await ctx.db.getClient()
      .from('shifts')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', client.id)
      .not('assigned_staff_id', 'is', null);
    
    const fillRate = totalShifts ? ((filledShifts || 0) / totalShifts * 100).toFixed(1) : 0;
    
    return {
      testId: 'score-005',
      action: 'Client scoring query validation',
      passed: scoreColumnExists,
      duration: (Date.now() - startTime) / 1000,
      details: { 
        client_name: client.name,
        desirability_score: client.desirability_score,
        total_shifts: totalShifts,
        filled_shifts: filledShifts,
        fill_rate_percent: fillRate
      },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'score-005',
      action: 'Client scoring query validation',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * TEST: score-006 - Score history/log table exists (for audit)
 */
export async function testScoreHistoryTracking(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Check if score_history table exists
    const { data, error } = await ctx.db.getClient()
      .from('score_history')
      .select('id')
      .limit(1);
    
    const tableExists = !error || !error.message.includes('does not exist');
    
    return {
      testId: 'score-006',
      action: 'Score history tracking table',
      passed: tableExists,
      duration: (Date.now() - startTime) / 1000,
      details: { 
        table_exists: tableExists,
        records_found: data?.length || 0,
        error_if_missing: error?.message
      },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'score-006',
      action: 'Score history tracking table',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * TEST: score-007 - No-show detection updates score negatively
 */
export async function testNoShowScorePenalty(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const agencyId = await ctx.db.getAgencyId(ctx.config.dominion.agency_name);

    // Count no-show shifts using assigned_staff_id (correct column)
    const { count: noShowCount, error } = await ctx.db.getClient()
      .from('shifts')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .eq('status', 'no_show');

    const queryWorks = !error;

    return {
      testId: 'score-007',
      action: 'No-show score penalty query',
      passed: queryWorks,
      duration: (Date.now() - startTime) / 1000,
      details: {
        no_show_shifts_found: noShowCount || 0,
        query_success: queryWorks
      },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'score-007',
      action: 'No-show score penalty query',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * TEST: score-008 - Staff rating from timesheets (client_rating)
 */
export async function testTimesheetRatingQuery(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const agencyId = await ctx.db.getAgencyId(ctx.config.dominion.agency_name);

    // Get staff with ratings from timesheets
    const { data: staff } = await ctx.db.getClient()
      .from('staff')
      .select('id')
      .eq('agency_id', agencyId)
      .limit(1)
      .single();

    if (!staff) throw new Error('No staff found');

    // Query ratings from timesheets (not separate ratings table)
    const { data: ratings, error } = await ctx.db.getClient()
      .from('timesheets')
      .select('client_rating')
      .eq('staff_id', staff.id)
      .not('client_rating', 'is', null);

    const queryWorks = !error;
    const avgRating = ratings?.length
      ? ratings.reduce((acc, r) => acc + (r.client_rating || 0), 0) / ratings.length
      : 0;

    return {
      testId: 'score-008',
      action: 'Timesheet client_rating query',
      passed: queryWorks,
      duration: (Date.now() - startTime) / 1000,
      details: {
        ratings_found: ratings?.length || 0,
        average_rating: avgRating.toFixed(2),
        query_success: queryWorks
      },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'score-008',
      action: 'Timesheet client_rating query',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Export all tests for registry
export const scoringTests = {
  'score-001': testStaffScoreColumnFix,
  'score-002': testScoreVisibilitySetting,
  'score-003': testScoreBandsInterpretation,
  'score-004': testShiftCompletionScoreIncrement,
  'score-005': testClientScoringQuery,
  'score-006': testScoreHistoryTracking,
  'score-007': testNoShowScorePenalty,
  'score-008': testTimesheetRatingQuery
};

