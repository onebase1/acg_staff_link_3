import { TestContext, TestResult } from '../types';

// Communication Pipeline Tests (comm-001 through comm-006)

export async function testSendEmailResend(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Test Resend API
    const result = await ctx.functions.invokeFunction('send-email', {
      to: 'test@example.com',
      subject: 'Test Email',
      message: 'Pipeline test email'  // Changed from 'text' to 'message'
    });
    
    return {
      testId: 'comm-001',
      action: 'Send email (Resend)',
      passed: result.success,
      duration: (Date.now() - startTime) / 1000,
      details: result,
      error: result.error || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'comm-001',
      action: 'Send email (Resend)',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testSendSMSTwilio(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const result = await ctx.functions.invokeFunction('send-sms', {
      to: '+1234567890',
      message: 'Pipeline test SMS'  // Changed from 'body' to 'message'
    });
    
    return {
      testId: 'comm-002',
      action: 'Send SMS (Twilio)',
      passed: result.success,
      duration: (Date.now() - startTime) / 1000,
      details: result,
      error: result.error || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'comm-002',
      action: 'Send SMS (Twilio)',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testSendWhatsAppTwilio(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const result = await ctx.functions.invokeFunction('send-whatsapp', {
      to: '+1234567890',
      message: 'Pipeline test WhatsApp'  // Changed from 'body' to 'message'
    });
    
    return {
      testId: 'comm-003',
      action: 'Send WhatsApp (Twilio)',
      passed: result.success,
      duration: (Date.now() - startTime) / 1000,
      details: result,
      error: result.error || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'comm-003',
      action: 'Send WhatsApp (Twilio)',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testWhatsAppBotResponse(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Test WhatsApp bot response handler
    const result = await ctx.functions.invokeFunction('whatsappBotHandler', {
      from: '+1234567890',
      body: 'STATUS'
    });
    
    return {
      testId: 'comm-004',
      action: 'WhatsApp bot response',
      passed: result.success,
      duration: (Date.now() - startTime) / 1000,
      details: result.data,
      error: result.error || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'comm-004',
      action: 'WhatsApp bot response',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testEmailBatching(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Test email batching functionality
    const result = await ctx.functions.invokeFunction('emailBatcher', {
      action: 'process'
    });
    
    return {
      testId: 'comm-005',
      action: 'Email batching',
      passed: result.success,
      duration: (Date.now() - startTime) / 1000,
      details: result.data,
      error: result.error || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'comm-005',
      action: 'Email batching',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export async function testMultiChannelFallback(ctx: TestContext): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Test multi-channel fallback (email -> SMS -> WhatsApp)
    const result = await ctx.functions.invokeFunction('multiChannelNotification', {
      to: '+1234567890',
      email: 'test@example.com',
      message: 'Test fallback notification'
    });
    
    return {
      testId: 'comm-006',
      action: 'Multi-channel fallback',
      passed: result.success,
      duration: (Date.now() - startTime) / 1000,
      details: result.data,
      error: result.error || undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      testId: 'comm-006',
      action: 'Multi-channel fallback',
      passed: false,
      duration: (Date.now() - startTime) / 1000,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

