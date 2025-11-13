import { TestContext, TestResult } from '../types';

// Automation Pipeline Tests (auto-001 through auto-006)

export async function testDailyShiftClosure(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Create shift >24h old without timesheet
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    const shift = await ctx.db.createShift({
      client_id: 'Divine Care Center',
      role: 'nurse',
      date: dateStr,
      start_time: '08:00',
      end_time: '20:00',
      pay_rate: 20,
      charge_rate: 30
    });
    
    // Test daily shift closure engine
    const result = await ctx.functions.invokeFunction('dailyShiftClosureEngine', {});
    
    // Check if AdminWorkflow was created
    const agencyId = await ctx.db.getAgencyId(ctx.config.dominion.agency_name);
    const { data: workflows } = await ctx.db.getClient()
      .from('admin_workflows')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('shift_id', shift.id)
      .eq('type', 'shift_verification');
    
    const hasWorkflow = workflows && workflows.length > 0;
    
    return {
      testId: 'auto-001',
      action: 'Daily shift closure engine',
      passed: result.success || hasWorkflow,
      duration: (Date.now() - startTime) / 1000,
      details: { functionInvoked: result.success, workflowCreated: hasWorkflow },
      error: result.error || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'auto-001',
      action: 'Daily shift closure engine',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testNoShowDetection(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Create shift with start_time 15 mins ago
    const now = new Date();
    const startTime15MinsAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const dateStr = startTime15MinsAgo.toISOString().split('T')[0];
    const timeStr = startTime15MinsAgo.toTimeString().substring(0, 5);
    
    const shift = await ctx.db.createShift({
      client_id: 'Divine Care Center',
      role: 'nurse',
      date: dateStr,
      start_time: timeStr,
      end_time: '20:00',
      pay_rate: 20,
      charge_rate: 30
    });
    
    await ctx.db.assignStaff(shift.id, 'Linda Williams');
    
    // Test no-show detection engine
    const result = await ctx.functions.invokeFunction('noShowDetectionEngine', {});
    
    // Check if AdminWorkflow was created
    const agencyId = await ctx.db.getAgencyId(ctx.config.dominion.agency_name);
    const { data: workflows } = await ctx.db.getClient()
      .from('admin_workflows')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('shift_id', shift.id)
      .eq('type', 'no_show');
    
    const hasWorkflow = workflows && workflows.length > 0;
    
    return {
      testId: 'auto-002',
      action: 'No-show detection',
      passed: result.success || hasWorkflow,
      duration: (Date.now() - startTime) / 1000,
      details: { functionInvoked: result.success, workflowCreated: hasWorkflow },
      error: result.error || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'auto-002',
      action: 'No-show detection',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testComplianceExpiryReminders(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Test compliance expiry reminders function
    const result = await ctx.functions.invokeFunction('complianceExpiryReminders', {});
    
    return {
      testId: 'auto-003',
      action: 'Compliance expiry reminders',
      passed: result.success,
      duration: (Date.now() - startTime) / 1000,
      details: result.data,
      error: result.error || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'auto-003',
      action: 'Compliance expiry reminders',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testNotificationBatching(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Test notification batching (5-min queue)
    const result = await ctx.functions.invokeFunction('notificationBatcher', {
      action: 'process'
    });
    
    return {
      testId: 'auto-004',
      action: 'Notification batching',
      passed: result.success,
      duration: (Date.now() - startTime) / 1000,
      details: result.data,
      error: result.error || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'auto-004',
      action: 'Notification batching',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testTimesheetBatchProcessor(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Test timesheet batch processor
    const result = await ctx.functions.invokeFunction('timesheetBatchProcessor', {});
    
    return {
      testId: 'auto-005',
      action: 'Timesheet batch processor',
      passed: result.success,
      duration: (Date.now() - startTime) / 1000,
      details: result.data,
      error: result.error || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'auto-005',
      action: 'Timesheet batch processor',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testStaffDailyDigest(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Test staff daily digest
    const result = await ctx.functions.invokeFunction('staffDailyDigest', {});
    
    return {
      testId: 'auto-006',
      action: 'Staff daily digest',
      passed: result.success,
      duration: (Date.now() - startTime) / 1000,
      details: result.data,
      error: result.error || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'auto-006',
      action: 'Staff daily digest',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

