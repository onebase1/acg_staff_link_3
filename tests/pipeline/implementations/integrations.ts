import { TestContext, TestResult } from '../types';

// External Integrations Pipeline Tests (int-001 through int-005)

export async function testOpenAIInvokeLLM(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Test OpenAI InvokeLLM
    const result = await ctx.functions.invokeFunction('InvokeLLM', {
      emailContent: 'We need a nurse for tomorrow 8am to 8pm at Divine Care Center',
      extractFields: ['date', 'time', 'role', 'location']
    });
    
    return {
      testId: 'int-001',
      action: 'OpenAI API (InvokeLLM)',
      passed: result.success,
      duration: (Date.now() - startTime) / 1000,
      details: result.data,
      error: result.error || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'int-001',
      action: 'OpenAI API (InvokeLLM)',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testResendAPIHealth(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Test Resend API connectivity
    const result = await ctx.functions.invokeFunction('send-email', {
      to: 'test@example.com',
      subject: 'API Health Check',
      text: 'Testing Resend API connectivity'
    });
    
    return {
      testId: 'int-002',
      action: 'Resend API health',
      passed: result.success,
      duration: (Date.now() - startTime) / 1000,
      details: result,
      error: result.error || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'int-002',
      action: 'Resend API health',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testTwilioAPIHealth(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Test Twilio API connectivity
    const result = await ctx.functions.invokeFunction('send-sms', {
      to: '+1234567890',
      body: 'API Health Check'
    });
    
    return {
      testId: 'int-003',
      action: 'Twilio API health',
      passed: result.success,
      duration: (Date.now() - startTime) / 1000,
      details: result,
      error: result.error || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'int-003',
      action: 'Twilio API health',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testBase44FileStorage(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Test file storage accessibility
    const result = await ctx.functions.invokeFunction('uploadFile', {
      fileName: 'test.pdf',
      bucket: 'timesheets'
    });
    
    return {
      testId: 'int-004',
      action: 'Base44 file storage',
      passed: result.success,
      duration: (Date.now() - startTime) / 1000,
      details: result.data,
      error: result.error || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'int-004',
      action: 'Base44 file storage',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testResendWebhookConfig(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Test Resend webhook configuration
    const result = await ctx.functions.invokeFunction('verifyResendWebhook', {});
    
    return {
      testId: 'int-005',
      action: 'Resend webhook config',
      passed: result.success,
      duration: (Date.now() - startTime) / 1000,
      details: result.data,
      error: result.error || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'int-005',
      action: 'Resend webhook config',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

