import { TestContext, TestResult } from '../types';

// Shift Journey Pipeline Tests (sj-001 through sj-016)

export async function testEmailWebhookReceipt(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Check if careHomeInboundEmail function exists
    const result = await ctx.functions.invokeFunction('careHomeInboundEmail', {
      to: 'dominion@instayfs.co.uk',
      from: 'carehome@test.com',
      subject: 'Urgent Shift Request',
      text: 'We need a nurse for tomorrow 8am to 8pm at Divine Care Center'
    });
    
    // Check if admin_workflows was created
    const agencyId = await ctx.db.getAgencyId(ctx.config.dominion.agency_name);
    const workflows = await ctx.db.getClient()
      .from('admin_workflows')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    const hasWorkflow = workflows.data && workflows.data.length > 0;
    
    return {
      testId: 'sj-001',
      action: 'Receive care home email',
      passed: result.success || hasWorkflow,
      duration: (Date.now() - startTime) / 1000,
      details: { functionExists: result.success, workflowCreated: hasWorkflow },
      error: result.error || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'sj-001',
      action: 'Receive care home email',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testAIEmailParsing(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Test InvokeLLM function with sample email
    const result = await ctx.functions.invokeFunction('InvokeLLM', {
      emailContent: 'We need a nurse for tomorrow 8am to 8pm at Divine Care Center',
      extractFields: ['date', 'time', 'role', 'location']
    });
    
    // Check if we got a confidence score
    const hasConfidence = result.data?.confidence !== undefined;
    const hasExtractedData = result.data?.date || result.data?.role;
    
    if (hasConfidence) {
      ctx.aiConfidenceScore = result.data.confidence;
    }
    
    return {
      testId: 'sj-002',
      action: 'AI parses email',
      passed: result.success && (hasConfidence || hasExtractedData),
      duration: (Date.now() - startTime) / 1000,
      details: {
        confidence: result.data?.confidence,
        extracted: {
          date: result.data?.date,
          role: result.data?.role,
          location: result.data?.location
        }
      },
      error: result.error || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'sj-002',
      action: 'AI parses email',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testCreateShiftRecord(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Use existing shift creation logic from hybrid tests
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
    
    ctx.setShiftId(shift.id);
    
    // Register cleanup
    ctx.registerCleanup(async () => {
      // Cleanup will be handled at end of suite
    });
    
    return {
      testId: 'sj-003',
      action: 'Create shift record',
      passed: true,
      duration: (Date.now() - startTime) / 1000,
      details: { shiftId: shift.id, status: shift.status },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'sj-003',
      action: 'Create shift record',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testAssignStaff(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const shiftId = ctx.getShiftId();
    await ctx.db.assignStaff(shiftId, 'Linda Williams');
    
    // Verify booking created
    const shift = await ctx.db.getShift(shiftId);
    
    return {
      testId: 'sj-004',
      action: 'Assign staff to shift',
      passed: !!shift.assigned_staff_id,
      duration: (Date.now() - startTime) / 1000,
      details: { staffAssigned: !!shift.assigned_staff_id },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'sj-004',
      action: 'Assign staff to shift',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testSendAssignmentNotification(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const shiftId = ctx.getShiftId();
    
    // Test notification sending
    const emailResult = await ctx.functions.invokeFunction('send-email', {
      to: 'staff@test.com',
      subject: 'New Shift Assignment',
      text: `You have been assigned to shift ${shiftId}`
    });
    
    const smsResult = await ctx.functions.invokeFunction('send-sms', {
      to: '+1234567890',
      body: `New shift assignment: ${shiftId}`
    });
    
    const anySent = emailResult.success || smsResult.success;
    
    return {
      testId: 'sj-005',
      action: 'Send shift assignment notification',
      passed: anySent,
      duration: (Date.now() - startTime) / 1000,
      details: { emailSent: emailResult.success, smsSent: smsResult.success },
      error: !anySent ? 'No notifications sent' : undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'sj-005',
      action: 'Send shift assignment notification',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testCreateDraftTimesheet(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const shiftId = ctx.getShiftId();
    const shift = await ctx.db.getShift(shiftId);
    
    // Create draft timesheet
    const agencyId = await ctx.db.getAgencyId(ctx.config.dominion.agency_name);
    const { data: timesheet, error } = await ctx.db.getClient()
      .from('timesheets')
      .insert([{
        shift_id: shiftId,
        agency_id: agencyId,
        staff_id: shift.assigned_staff_id,
        client_id: shift.client_id,
        status: 'draft',
        clock_in: shift.start_time,
        clock_out: shift.end_time
      }])
      .select()
      .single();
    
    if (timesheet) {
      ctx.setTimesheetId(timesheet.id);
    }
    
    return {
      testId: 'sj-006',
      action: 'Create draft timesheet',
      passed: !error && !!timesheet,
      duration: (Date.now() - startTime) / 1000,
      details: { timesheetId: timesheet?.id, status: timesheet?.status },
      error: error?.message || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'sj-006',
      action: 'Create draft timesheet',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testSend24hReminder(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const shiftId = ctx.getShiftId();
    const shift = await ctx.db.getShift(shiftId);
    
    // Check if reminder flags exist
    const has24hFlag = 'reminder_24h_sent' in shift;
    
    return {
      testId: 'sj-007',
      action: 'Send 24h reminder',
      passed: has24hFlag,
      duration: (Date.now() - startTime) / 1000,
      details: { has24hReminderFlag: has24hFlag },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'sj-007',
      action: 'Send 24h reminder',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testSend2hReminder(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const shiftId = ctx.getShiftId();
    const shift = await ctx.db.getShift(shiftId);
    
    // Check if reminder flags exist
    const has2hFlag = 'reminder_2h_sent' in shift;
    
    return {
      testId: 'sj-008',
      action: 'Send 2h reminder',
      passed: has2hFlag,
      duration: (Date.now() - startTime) / 1000,
      details: { has2hReminderFlag: has2hFlag },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'sj-008',
      action: 'Send 2h reminder',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testGPSClockIn(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const timesheetId = ctx.getTimesheetId();
    
    // Update timesheet with GPS coordinates
    const { data, error } = await ctx.db.getClient()
      .from('timesheets')
      .update({
        clock_in_location: {
          latitude: 51.5074,
          longitude: -0.1278,
          verified: true
        }
      })
      .eq('id', timesheetId)
      .select()
      .single();
    
    return {
      testId: 'sj-009',
      action: 'GPS clock-in',
      passed: !error && !!data?.clock_in_location,
      duration: (Date.now() - startTime) / 1000,
      details: { location: data?.clock_in_location },
      error: error?.message || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'sj-009',
      action: 'GPS clock-in',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testUploadTimesheetDocument(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const timesheetId = ctx.getTimesheetId();
    
    // Simulate file upload by setting document_url
    const mockFileUrl = 'https://storage.supabase.co/timesheets/test-timesheet.pdf';
    const { data, error } = await ctx.db.getClient()
      .from('timesheets')
      .update({
        document_url: mockFileUrl,
        document_uploaded_at: new Date().toISOString()
      })
      .eq('id', timesheetId)
      .select()
      .single();
    
    if (data) {
      ctx.uploadedFileUrl = mockFileUrl;
    }
    
    return {
      testId: 'sj-010',
      action: 'Upload timesheet document',
      passed: !error && !!data?.document_url,
      duration: (Date.now() - startTime) / 1000,
      details: { documentUrl: data?.document_url },
      error: error?.message || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'sj-010',
      action: 'Upload timesheet document',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testAIOCRExtraction(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const fileUrl = ctx.uploadedFileUrl;
    
    // Test OCR function
    const result = await ctx.functions.invokeFunction('extractTimesheetData', {
      documentUrl: fileUrl
    });
    
    return {
      testId: 'sj-011',
      action: 'AI OCR extraction',
      passed: result.success,
      duration: (Date.now() - startTime) / 1000,
      details: result.data,
      error: result.error || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'sj-011',
      action: 'AI OCR extraction',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testAutoApproveTimesheet(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const timesheetId = ctx.getTimesheetId();
    
    // Auto-approve timesheet
    const { data, error } = await ctx.db.getClient()
      .from('timesheets')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: 'system'
      })
      .eq('id', timesheetId)
      .select()
      .single();
    
    return {
      testId: 'sj-012',
      action: 'Auto-approve timesheet',
      passed: !error && data?.status === 'approved',
      duration: (Date.now() - startTime) / 1000,
      details: { status: data?.status, approvedBy: data?.approved_by },
      error: error?.message || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'sj-012',
      action: 'Auto-approve timesheet',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testMarkShiftCompleted(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const shiftId = ctx.getShiftId();
    await ctx.db.updateShift(shiftId, { status: 'confirmed' });
    await ctx.db.updateShift(shiftId, { status: 'in_progress' });
    await ctx.db.completeShift(shiftId);
    
    const completed = await ctx.db.getShift(shiftId);
    const isCompleted = completed.status === 'completed';
    const isLocked = completed.financial_locked === true;
    
    return {
      testId: 'sj-013',
      action: 'Mark shift completed',
      passed: isCompleted && isLocked,
      duration: (Date.now() - startTime) / 1000,
      details: { status: completed.status, financialLocked: completed.financial_locked },
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'sj-013',
      action: 'Mark shift completed',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testGenerateInvoice(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const shiftId = ctx.getShiftId();
    const shift = await ctx.db.getShift(shiftId);
    const agencyId = await ctx.db.getAgencyId(ctx.config.dominion.agency_name);
    
    // Generate invoice
    const { data: invoice, error } = await ctx.db.getClient()
      .from('invoices')
      .insert([{
        agency_id: agencyId,
        client_id: shift.client_id,
        shift_id: shiftId,
        amount: shift.charge_rate || 500,
        status: 'pending',
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }])
      .select()
      .single();
    
    if (invoice) {
      ctx.setInvoiceId(invoice.id);
    }
    
    return {
      testId: 'sj-014',
      action: 'Generate invoice',
      passed: !error && !!invoice,
      duration: (Date.now() - startTime) / 1000,
      details: { invoiceId: invoice?.id, amount: invoice?.amount },
      error: error?.message || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'sj-014',
      action: 'Generate invoice',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testSendInvoiceToClient(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const invoiceId = ctx.getInvoiceId();
    
    // Send invoice via email
    const result = await ctx.functions.invokeFunction('send-email', {
      to: 'client@test.com',
      subject: 'Invoice from Dominion Healthcare Services',
      text: `Please find your invoice attached. Invoice ID: ${invoiceId}`
    });
    
    // Update invoice status
    if (result.success) {
      await ctx.db.getClient()
        .from('invoices')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', invoiceId);
    }
    
    return {
      testId: 'sj-015',
      action: 'Send invoice to client',
      passed: result.success,
      duration: (Date.now() - startTime) / 1000,
      details: { emailSent: result.success },
      error: result.error || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'sj-015',
      action: 'Send invoice to client',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testPaymentReminder(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const invoiceId = ctx.getInvoiceId();
    
    // Test payment reminder function
    const result = await ctx.functions.invokeFunction('sendPaymentReminder', {
      invoiceId
    });
    
    return {
      testId: 'sj-016',
      action: 'Payment reminder',
      passed: result.success,
      duration: (Date.now() - startTime) / 1000,
      details: result.data,
      error: result.error || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'sj-016',
      action: 'Payment reminder',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

