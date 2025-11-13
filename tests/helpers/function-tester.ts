import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TEST_CONFIG } from '../test-config';

export class FunctionTester {
  private client: SupabaseClient;
  private authToken: string | null = null;

  constructor() {
    this.client = createClient(
      TEST_CONFIG.supabase.url,
      TEST_CONFIG.supabase.key
    );
  }

  async authenticate() {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: TEST_CONFIG.dominion.email,
      password: TEST_CONFIG.dominion.password
    });

    if (error) {
      throw new Error(`Function Tester Authentication failed: ${error.message}`);
    }

    if (data.session) {
      this.authToken = data.session.access_token;
    }

    return data;
  }

  async testPreShiftReminder(shiftId: string, type: '24h' | '2h') {
    const result = {
      sms: false,
      whatsapp: false,
      email: false,
      errors: [] as string[]
    };

    try {
      // Test SMS sending
      const smsResponse = await this.client.functions.invoke('send-sms', {
        body: {
          to: '+1234567890',  // Test phone number
          body: `Test ${type} reminder for shift ${shiftId}`
        }
      });

      if (smsResponse.error) {
        result.errors.push(`SMS error: ${smsResponse.error.message}`);
      } else {
        result.sms = true;
      }
    } catch (error: any) {
      result.errors.push(`SMS exception: ${error.message}`);
    }

    try {
      // Test WhatsApp sending
      const whatsappResponse = await this.client.functions.invoke('send-whatsapp', {
        body: {
          to: '+1234567890',  // Test phone number
          body: `Test ${type} reminder for shift ${shiftId}`
        }
      });

      if (whatsappResponse.error) {
        result.errors.push(`WhatsApp error: ${whatsappResponse.error.message}`);
      } else {
        result.whatsapp = true;
      }
    } catch (error: any) {
      result.errors.push(`WhatsApp exception: ${error.message}`);
    }

    try {
      // Test Email sending
      const emailResponse = await this.client.functions.invoke('send-email', {
        body: {
          to: 'test@example.com',
          subject: `${type} Shift Reminder`,
          text: `Test ${type} reminder for shift ${shiftId}`
        }
      });

      if (emailResponse.error) {
        result.errors.push(`Email error: ${emailResponse.error.message}`);
      } else {
        result.email = true;
      }
    } catch (error: any) {
      result.errors.push(`Email exception: ${error.message}`);
    }

    return result;
  }

  async testPostShiftReminder(shiftId: string) {
    const result = {
      sms: false,
      whatsapp: false,
      email: false,
      errors: [] as string[],
      CRITICAL_ISSUE: null as string | null,
      message: '',
      details: {} as any,
      severity: 'INFO' as 'INFO' | 'CRITICAL'
    };

    try {
      // Test timesheet reminder - this is the CRITICAL functionality that was broken in Base44
      const response = await this.client.functions.invoke('post-shift-timesheet-reminder', {
        body: {
          shift_id: shiftId  // Note: function expects shift_id, not shiftId
        }
      });

      if (response.error) {
        result.CRITICAL_ISSUE = 'POST_SHIFT_REMINDERS_BROKEN';
        result.message = 'Timesheet reminders not sent (same as Base44)';
        result.severity = 'CRITICAL';
        result.errors.push(`Timesheet reminder error: ${response.error.message}`);
        result.details = response;
      } else {
        const data = response.data;
        result.sms = data?.sms_sent || false;
        result.whatsapp = data?.whatsapp_sent || false;
        result.email = data?.email_sent || false;
        result.details = data;

        if (!result.sms && !result.whatsapp && !result.email) {
          result.CRITICAL_ISSUE = 'POST_SHIFT_REMINDERS_BROKEN';
          result.message = 'No post-shift notifications were sent';
          result.severity = 'CRITICAL';
        }
      }
    } catch (error: any) {
      result.CRITICAL_ISSUE = 'POST_SHIFT_REMINDERS_BROKEN';
      result.message = `Exception when calling timesheet reminder: ${error.message}`;
      result.severity = 'CRITICAL';
      result.errors.push(`Exception: ${error.message}`);
    }

    return result;
  }

  async testUrgentBroadcast(shiftId: string) {
    const result = {
      success: false,
      staff_notified: 0,
      errors: [] as string[]
    };

    try {
      const response = await this.client.functions.invoke('broadcastUrgentShift', {
        body: {
          shiftId
        }
      });

      if (response.error) {
        result.errors.push(`Broadcast error: ${response.error.message}`);
      } else {
        result.success = true;
        result.staff_notified = response.data?.staff_notified || 0;
      }
    } catch (error: any) {
      result.errors.push(`Broadcast exception: ${error.message}`);
    }

    return result;
  }

  async verifyReminderEngine() {
    const result = {
      status: 'unknown' as 'active' | 'inactive' | 'unknown',
      cron_schedule: '',
      last_run: null as Date | null,
      success_rate: 0,
      errors: [] as string[]
    };

    try {
      // Try to get cron job status from Supabase
      const response = await this.client.functions.invoke('shift-reminder-engine', {
        body: { action: 'status' }
      });

      if (response.error) {
        result.errors.push(`Status check error: ${response.error.message}`);
      } else {
        const data = response.data;
        result.status = data?.status || 'unknown';
        result.cron_schedule = data?.cron_schedule || '0 * * * *';
        result.last_run = data?.last_run ? new Date(data.last_run) : null;
        result.success_rate = data?.success_rate || 0;
      }
    } catch (error: any) {
      result.errors.push(`Status check exception: ${error.message}`);
    }

    return result;
  }

  async invokeFunction(functionName: string, body: any) {
    try {
      const response = await this.client.functions.invoke(functionName, { body });
      
      // Detailed error logging
      if (response.error) {
        console.error(`❌ Edge Function ${functionName} failed:`, {
          message: response.error.message,
          context: response.error.context,
          status: response.error.status,
          data: response.data
        });
      }
      
      return {
        success: !response.error,
        data: response.data,
        error: response.error ? `${response.error.message} (status: ${response.error.status || 'unknown'})` : null
      };
    } catch (error: any) {
      console.error(`❌ Edge Function ${functionName} exception:`, error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }
}

