/**
 * 📊 NOTIFICATION LOGGER SERVICE
 * 
 * Centralized logging for all notification sends, failures, and skips.
 * Writes to notification_log table for comprehensive audit trail.
 * 
 * ✅ Logs successful sends with provider message IDs
 * ✅ Logs failed sends with error messages
 * ✅ Logs skipped notifications with reasons
 * ✅ Captures preference check results
 * ✅ Links to related entities (shifts, invoices, etc.)
 * 
 * Feature Flag: ENABLE_NOTIFICATION_LOGGING (env var)
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PreferenceCheckResult } from "./preferenceChecker.ts";

export interface NotificationLogParams {
  // Recipient Info
  recipientEmail: string;
  recipientPhone?: string;
  recipientFirstName?: string;
  recipientType?: 'client' | 'staff' | 'admin';
  
  // IDs
  agencyId?: string;
  clientId?: string;
  contactId?: string;
  staffId?: string;
  
  // Notification Details
  notificationType: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'in_app' | 'voice' | 'push';
  subject?: string;
  templateName?: string;
  
  // Status
  status: 'queued' | 'sent' | 'failed' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed';
  
  // Provider Info
  provider?: 'resend' | 'twilio' | 'n8n';
  providerMessageId?: string;
  providerStatus?: string;
  
  // Error Info (for failures)
  errorMessage?: string;
  errorCode?: string;
  
  // Preference Check Results
  preferenceChecked?: boolean;
  preferenceStatus?: 'opted_in' | 'opted_out' | 'not_set' | 'critical_bypass';
  skippedReason?: string;
  
  // Related Entity
  relatedEntityId?: string;
  relatedEntityType?: 'shift' | 'invoice' | 'timesheet' | 'booking' | 'compliance' | 'rating';
  
  // Additional Metadata
  metadata?: Record<string, any>;
  batchId?: string;
  queueId?: string;
  retryCount?: number;
}

export interface SystemAlertParams {
  type: string;
  severity: 'warning' | 'critical';
  message: string;
  metadata?: Record<string, any>;
  agencyId?: string;
}

/**
 * Check if logging is enabled via feature flag
 */
function isLoggingEnabled(): boolean {
  const flag = Deno.env.get("ENABLE_NOTIFICATION_LOGGING");
  return flag !== "false" && flag !== "0";
}

/**
 * Log a notification event to the database
 */
export async function logNotification(
  supabase: SupabaseClient,
  params: NotificationLogParams
): Promise<{ success: boolean; error?: any }> {
  
  // If feature flag disabled, skip logging
  if (!isLoggingEnabled()) {
    console.log('⚙️ [Notification Logger] Feature disabled - skipping log');
    return { success: true };
  }

  try {
    const now = new Date().toISOString();
    
    // Prepare log entry
    const logEntry: any = {
      // Recipient
      recipient_email: params.recipientEmail,
      recipient_phone: params.recipientPhone,
      recipient_type: params.recipientType,
      
      // IDs
      agency_id: params.agencyId,
      client_id: params.clientId,
      contact_id: params.contactId,
      staff_id: params.staffId,
      
      // Notification details
      notification_type: params.notificationType,
      channel: params.channel,
      subject: params.subject,
      template_name: params.templateName,
      
      // Status
      status: params.status,
      
      // Provider
      provider: params.provider,
      provider_message_id: params.providerMessageId,
      provider_status: params.providerStatus,
      
      // Error info
      error_message: params.errorMessage,
      error_code: params.errorCode,
      
      // Preference check
      preference_checked: params.preferenceChecked ?? false,
      preference_status: params.preferenceStatus,
      skipped_reason: params.skippedReason,
      
      // Related entity
      related_entity_id: params.relatedEntityId,
      related_entity_type: params.relatedEntityType,
      
      // Metadata
      metadata: params.metadata || {},
      batch_id: params.batchId,
      queue_id: params.queueId,
      retry_count: params.retryCount ?? 0,
      
      // Timestamps
      created_at: now,
    };

    // Set appropriate timestamp based on status
    if (params.status === 'sent' || params.status === 'delivered') {
      logEntry.sent_at = now;
    } else if (params.status === 'failed') {
      logEntry.failed_at = now;
    }

    // Insert into notification_log
    const { error } = await supabase
      .from('notification_log')
      .insert(logEntry);

    if (error) {
      console.error('❌ [Notification Logger] Failed to insert log:', error);
      return { success: false, error };
    }

    console.log(`📊 [Notification Logger] Logged ${params.status} notification: ${params.notificationType} to ${params.recipientEmail}`);
    return { success: true };

  } catch (error) {
    console.error('❌ [Notification Logger] Unexpected error:', error);
    return { success: false, error };
  }
}

/**
 * Log a successful notification send
 */
export async function logNotificationSent(
  supabase: SupabaseClient,
  params: Omit<NotificationLogParams, 'status'>
): Promise<{ success: boolean; error?: any }> {
  return logNotification(supabase, {
    ...params,
    status: 'sent',
  });
}

/**
 * Log a failed notification send
 */
export async function logNotificationFailed(
  supabase: SupabaseClient,
  params: Omit<NotificationLogParams, 'status'> & { errorMessage: string }
): Promise<{ success: boolean; error?: any }> {
  return logNotification(supabase, {
    ...params,
    status: 'failed',
  });
}

/**
 * Log a skipped notification (due to preferences or rate limiting)
 */
export async function logNotificationSkipped(
  supabase: SupabaseClient,
  params: Omit<NotificationLogParams, 'status'> & { skippedReason: string }
): Promise<{ success: boolean; error?: any }> {
  return logNotification(supabase, {
    ...params,
    status: 'queued', // Status is 'queued' but with skipped_reason set
  });
}

/**
 * Helper: Create log params from preference check result
 */
export function createLogParamsFromPreferenceCheck(
  baseParams: Partial<NotificationLogParams>,
  preferenceCheck: PreferenceCheckResult
): Partial<NotificationLogParams> {
  return {
    ...baseParams,
    preferenceChecked: preferenceCheck.preferenceChecked,
    preferenceStatus: preferenceCheck.preferenceStatus,
    skippedReason: preferenceCheck.allowed ? undefined : preferenceCheck.reason,
  };
}

/**
 * Batch log multiple notifications
 * Useful for digest engines that send to many recipients
 */
export async function batchLogNotifications(
  supabase: SupabaseClient,
  entries: NotificationLogParams[]
): Promise<{ success: boolean; inserted: number; errors: any[] }> {
  
  if (!isLoggingEnabled()) {
    console.log('⚙️ [Notification Logger] Feature disabled - skipping batch log');
    return { success: true, inserted: 0, errors: [] };
  }

  try {
    const now = new Date().toISOString();
    
    const logEntries = entries.map(params => ({
      recipient_email: params.recipientEmail,
      recipient_phone: params.recipientPhone,
      recipient_type: params.recipientType,
      agency_id: params.agencyId,
      client_id: params.clientId,
      contact_id: params.contactId,
      staff_id: params.staffId,
      notification_type: params.notificationType,
      channel: params.channel,
      subject: params.subject,
      template_name: params.templateName,
      status: params.status,
      provider: params.provider,
      provider_message_id: params.providerMessageId,
      provider_status: params.providerStatus,
      error_message: params.errorMessage,
      error_code: params.errorCode,
      preference_checked: params.preferenceChecked ?? false,
      preference_status: params.preferenceStatus,
      skipped_reason: params.skippedReason,
      related_entity_id: params.relatedEntityId,
      related_entity_type: params.relatedEntityType,
      metadata: params.metadata || {},
      batch_id: params.batchId,
      queue_id: params.queueId,
      retry_count: params.retryCount ?? 0,
      created_at: now,
      sent_at: (params.status === 'sent' || params.status === 'delivered') ? now : null,
      failed_at: params.status === 'failed' ? now : null,
    }));

    const { error } = await supabase
      .from('notification_log')
      .insert(logEntries);

    if (error) {
      console.error('❌ [Notification Logger] Batch insert failed:', error);
      return { success: false, inserted: 0, errors: [error] };
    }

    console.log(`📊 [Notification Logger] Batch logged ${logEntries.length} notifications`);
    return { success: true, inserted: logEntries.length, errors: [] };

  } catch (error) {
    console.error('❌ [Notification Logger] Batch logging error:', error);
    return { success: false, inserted: 0, errors: [error] };
  }
}

/**
 * Update existing log entry (e.g., when delivery status changes)
 */
export async function updateNotificationLog(
  supabase: SupabaseClient,
  providerMessageId: string,
  updates: {
    status?: 'delivered' | 'opened' | 'clicked' | 'bounced';
    deliveredAt?: string;
    openedAt?: string;
    clickedAt?: string;
    metadata?: Record<string, any>;
  }
): Promise<{ success: boolean; error?: any }> {
  
  if (!isLoggingEnabled()) {
    return { success: true };
  }

  try {
    const updateData: any = {};

    if (updates.status) updateData.status = updates.status;
    if (updates.deliveredAt) updateData.delivered_at = updates.deliveredAt;
    if (updates.openedAt) updateData.opened_at = updates.openedAt;
    if (updates.clickedAt) updateData.clicked_at = updates.clickedAt;
    if (updates.metadata) updateData.metadata = updates.metadata;

    const { error } = await supabase
      .from('notification_log')
      .update(updateData)
      .eq('provider_message_id', providerMessageId);

    if (error) {
      console.error('❌ [Notification Logger] Update failed:', error);
      return { success: false, error };
    }

    console.log(`📊 [Notification Logger] Updated log for message ${providerMessageId}`);
    return { success: true };

  } catch (error) {
    console.error('❌ [Notification Logger] Update error:', error);
    return { success: false, error };
  }
}

/**
 * Create a system alert and optionally notify super admins
 */
export async function createSystemAlert(
  supabase: SupabaseClient,
  params: SystemAlertParams
): Promise<{ success: boolean; error?: any }> {
  try {
    const { data: alert, error } = await supabase
      .from('system_alerts')
      .insert({
        alert_type: params.type,
        severity: params.severity,
        message: params.message,
        metadata: params.metadata || {},
        agency_id: params.agencyId
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('❌ [SystemAlert] Failed to create alert:', error);
      return { success: false, error };
    }

    // Notify Super Admins for Critical Alerts
    if (params.severity === 'critical') {
      await notifySuperAdmins(supabase, params);
    }

    return { success: true };
  } catch (error) {
    console.error('❌ [SystemAlert] Unexpected error:', error);
    return { success: false, error };
  }
}

/**
 * Send alert email to Super Admins
 */
async function notifySuperAdmins(
  supabase: SupabaseClient,
  alert: SystemAlertParams
) {
  try {
    // Get all Super Admins
    const { data: admins } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('is_super_admin', true);

    if (!admins || admins.length === 0) {
      console.warn('⚠️ [SystemAlert] No super admins found to notify.');
      return;
    }

    for (const admin of admins) {
      if (!admin.email) continue;
      
      console.log(`✉️ [SystemAlert] Notifying Super Admin: ${admin.email}`);
      
      // Invoke send-email - Using try/catch to ensure one failure doesn't block others
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: admin.email,
            subject: `🚨 CRITICAL ALERT: ${alert.type}`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; border: 2px solid #ef4444; border-radius: 12px; background-color: #fef2f2;">
                <h2 style="color: #b91c1c; margin-top: 0;">🚨 Critical System Alert</h2>
                <p style="font-size: 16px; color: #1e293b;">A critical anomaly was detected in the notification system. Please investigate immediately.</p>
                <div style="background: white; border: 1px solid #fee2e2; border-radius: 8px; padding: 15px; margin: 20px 0;">
                  <p><strong>Type:</strong> <span style="color: #b91c1c;">${alert.type}</span></p>
                  <p><strong>Message:</strong> ${alert.message}</p>
                  <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                </div>
                <p><strong>Diagnostic Data:</strong></p>
                <pre style="background: #1e293b; color: #f8fafc; padding: 15px; border-radius: 8px; overflow-x: auto; font-size: 13px;">${JSON.stringify(alert.metadata, null, 2)}</pre>
                <hr style="border: none; border-top: 1px solid #fee2e2; margin: 20px 0;"/>
                <p style="font-size: 12px; color: #64748b;">This is an automated security alert from the Agile Care Management reliability engine.</p>
              </div>
            `
          }
        });
      } catch (innerErr) {
        console.error(`❌ [SystemAlert] Failed to send email to ${admin.email}:`, innerErr);
      }
    }
  } catch (err) {
    console.error('❌ [SystemAlert] Failed to notify super admins:', err);
  }
}
