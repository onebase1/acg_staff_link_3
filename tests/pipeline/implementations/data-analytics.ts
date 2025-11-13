import { TestContext, TestResult } from '../types';

// Data & Analytics Pipeline Tests (data-001 through data-005)

export async function testShiftJourneyLog(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const shiftId = ctx.getShiftId();
    const log = await ctx.db.getShiftJourneyLog(shiftId);
    
    const hasLog = log.log && log.log.length > 0;
    const hasStates = log.states && log.states.length > 0;
    
    return {
      testId: 'data-001',
      action: 'Shift journey log',
      passed: hasLog && hasStates,
      duration: (Date.now() - startTime) / 1000,
      details: {
        states: log.states,
        logEntries: log.log.length
      },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'data-001',
      action: 'Shift journey log',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testPerformanceMetrics(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const agencyId = await ctx.db.getAgencyId(ctx.config.dominion.agency_name);
    const stats = await ctx.db.getDashboardStats(agencyId);
    
    const hasMetrics = stats.total_shifts > 0;
    
    return {
      testId: 'data-002',
      action: 'Performance metrics',
      passed: hasMetrics,
      duration: (Date.now() - startTime) / 1000,
      details: stats,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'data-002',
      action: 'Performance metrics',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testTimesheetAnalytics(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Query timesheet analytics
    const agencyId = await ctx.db.getAgencyId(ctx.config.dominion.agency_name);
    const { data: timesheets } = await ctx.db.getClient()
      .from('timesheets')
      .select('*')
      .eq('agency_id', agencyId);
    
    const hasData = timesheets && timesheets.length > 0;
    
    return {
      testId: 'data-003',
      action: 'Timesheet analytics',
      passed: hasData,
      duration: (Date.now() - startTime) / 1000,
      details: { timesheetCount: timesheets?.length || 0 },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'data-003',
      action: 'Timesheet analytics',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testCSVExport(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Test CSV export functionality
    const result = await ctx.functions.invokeFunction('exportToCSV', {
      entity: 'shifts',
      dateRange: 'last_30_days'
    });
    
    return {
      testId: 'data-004',
      action: 'CSV export',
      passed: result.success,
      duration: (Date.now() - startTime) / 1000,
      details: result.data,
      error: result.error || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'data-004',
      action: 'CSV export',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testCFODashboard(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Query CFO dashboard data
    const agencyId = await ctx.db.getAgencyId(ctx.config.dominion.agency_name);
    const stats = await ctx.db.getDashboardStats(agencyId);
    
    const hasRevenue = stats.total_shifts > 0;
    
    return {
      testId: 'data-005',
      action: 'CFO dashboard',
      passed: hasRevenue,
      duration: (Date.now() - startTime) / 1000,
      details: stats,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'data-005',
      action: 'CFO dashboard',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

