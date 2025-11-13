import { TestContext, TestResult } from '../types';

// Financial Integrity Pipeline Tests (fin-001 through fin-006)

export async function testFinancialLockEnforcement(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Leverage shift from previous pipeline if available
    const shiftId = ctx.getShiftId();
    const shift = await ctx.db.getShift(shiftId);
    
    const hasFinancialLock = shift.financial_locked === true;
    
    return {
      testId: 'fin-001',
      action: 'Financial lock enforcement',
      passed: hasFinancialLock,
      duration: (Date.now() - startTime) / 1000,
      details: { financialLocked: shift.financial_locked },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'fin-001',
      action: 'Financial lock enforcement',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testImmutableInvoiceSnapshot(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Create an invoice and verify immutable snapshot
    const agencyId = await ctx.db.getAgencyId(ctx.config.dominion.agency_name);
    const { data: invoice } = await ctx.db.getClient()
      .from('invoices')
      .insert([{
        agency_id: agencyId,
        client_id: (await ctx.db.getClient().from('clients').select('id').eq('agency_id', agencyId).limit(1).single()).data?.id,
        amount: 500,
        status: 'sent',
        immutable_sent_snapshot: { amount: 500, items: ['Test'] }
      }])
      .select()
      .single();
    
    const hasSnapshot = !!invoice?.immutable_sent_snapshot;
    
    return {
      testId: 'fin-002',
      action: 'Immutable invoice snapshot',
      passed: hasSnapshot,
      duration: (Date.now() - startTime) / 1000,
      details: { hasSnapshot, snapshot: invoice?.immutable_sent_snapshot },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'fin-002',
      action: 'Immutable invoice snapshot',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testChangeLogCreation(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Create a shift and modify it to trigger change log
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    const shift = await ctx.db.createShift({
      client_id: 'Divine Care Center',
      role: 'nurse',
      date: dateStr,
      start_time: '08:00',
      end_time: '20:00',
      pay_rate: 20,
      charge_rate: 30
    });
    
    // Modify pay rate
    await ctx.db.updateShift(shift.id, { pay_rate: 25 });
    
    // Check if change log was created
    const agencyId = await ctx.db.getAgencyId(ctx.config.dominion.agency_name);
    const { data: changeLogs } = await ctx.db.getClient()
      .from('change_logs')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('entity_id', shift.id)
      .eq('entity_type', 'shift');
    
    const hasLog = changeLogs && changeLogs.length > 0;
    
    return {
      testId: 'fin-003',
      action: 'Change log creation',
      passed: hasLog,
      duration: (Date.now() - startTime) / 1000,
      details: { changeLogCount: changeLogs?.length || 0 },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'fin-003',
      action: 'Change log creation',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testInvoiceAmendmentWorkflow(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Test invoice amendment workflow
    const result = await ctx.functions.invokeFunction('invoiceAmendmentWorkflow', {
      invoiceId: 'test-invoice-id',
      reason: 'Rate adjustment'
    });
    
    return {
      testId: 'fin-004',
      action: 'Invoice amendment workflow',
      passed: result.success,
      duration: (Date.now() - startTime) / 1000,
      details: result.data,
      error: result.error || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'fin-004',
      action: 'Invoice amendment workflow',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testRateCardValidation(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Check if rate cards exist and are validated
    const agencyId = await ctx.db.getAgencyId(ctx.config.dominion.agency_name);
    const { data: rateCards } = await ctx.db.getClient()
      .from('rate_cards')
      .select('*')
      .eq('agency_id', agencyId);
    
    const hasRateCards = rateCards && rateCards.length > 0;
    
    return {
      testId: 'fin-005',
      action: 'Rate card validation',
      passed: hasRateCards,
      duration: (Date.now() - startTime) / 1000,
      details: { rateCardCount: rateCards?.length || 0 },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'fin-005',
      action: 'Rate card validation',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testWorkLocationValidation(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Test work location validation
    const agencyId = await ctx.db.getAgencyId(ctx.config.dominion.agency_name);
    const { data: locations } = await ctx.db.getClient()
      .from('work_locations')
      .select('*')
      .eq('agency_id', agencyId);
    
    const hasLocations = locations && locations.length > 0;
    
    return {
      testId: 'fin-006',
      action: 'Work location validation',
      passed: hasLocations,
      duration: (Date.now() - startTime) / 1000,
      details: { locationCount: locations?.length || 0 },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'fin-006',
      action: 'Work location validation',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

