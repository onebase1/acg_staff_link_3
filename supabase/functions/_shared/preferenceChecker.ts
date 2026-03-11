/**
 * 🔐 PREFERENCE CHECKER SERVICE
 * 
 * Centralized service to check if a notification should be sent
 * based on user preferences stored in the database.
 * 
 * ✅ Checks client_contacts.notification_preferences (JSONB)
 * ✅ Checks staff.opt_out_shift_reminders
 * ✅ Defaults to ALLOWED if preference not set (backwards compatible)
 * ✅ Always allows CRITICAL notifications (invoices, compliance)
 * 
 * Feature Flag: ENABLE_PREFERENCE_CHECKING (env var)
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface PreferenceCheckResult {
  allowed: boolean;
  reason?: string;
  preferenceStatus: 'opted_in' | 'opted_out' | 'not_set' | 'critical_bypass';
  preferenceChecked: boolean;
}

/**
 * Notification types that CANNOT be disabled (critical for business/legal)
 */
const CRITICAL_NOTIFICATION_TYPES = [
  'invoice_generated',
  'payment_reminder',
  'compliance_warning',
  'compliance_expiry',
  'document_expiry',
  'account_suspended',
  'legal_notice',
];

/**
 * Mapping of notification types to preference keys in client_contacts.notification_preferences
 */
const NOTIFICATION_TYPE_TO_PREFERENCE_KEY: Record<string, string> = {
  // Shift notifications
  'shift_assignment': 'shift_assigned',
  'shift_assigned': 'shift_assigned',
  'shift_confirmed': 'shift_confirmed',
  'shift_24h_reminder': 'shift_24h_reminder',
  'shift_2h_reminder': 'shift_2h_reminder',
  'shift_complete': 'shift_complete',
  'shift_cancelled': 'shift_cancelled',
  
  // Rating/Feedback
  'rating_reminder': 'rating_reminder',
  'feedback_request': 'rating_reminder',
  
  // Invoice/Payment
  'invoice_generated': 'invoice_notifications',
  'payment_reminder': 'payment_reminders',
  
  // Compliance
  'compliance_warning': 'compliance_notifications',
  'compliance_expiry': 'compliance_notifications',
  'document_expiry': 'compliance_notifications',
  
  // System
  'system_update': 'system_updates',
  'promotional': 'promotional',
  'marketing': 'promotional',
  
  // Digest
  'daily_digest': 'daily_digest',
  'weekly_digest': 'weekly_digest',
};

/**
 * Check if feature flag is enabled
 */
function isPreferenceCheckingEnabled(): boolean {
  const flag = Deno.env.get("ENABLE_PREFERENCE_CHECKING");
  return flag === "true" || flag === "1";
}

/**
 * Main function: Check if a notification should be sent
 * 
 * @param supabase - Supabase client
 * @param recipientEmail - Email of recipient
 * @param notificationType - Type of notification (e.g., 'shift_assigned')
 * @param channel - Channel (email, sms, whatsapp)
 * @param recipientType - 'client' | 'staff' | 'admin'
 * @returns PreferenceCheckResult
 */
export async function shouldSendNotification(
  supabase: SupabaseClient,
  recipientEmail: string,
  notificationType: string,
  channel: string = 'email',
  recipientType: 'client' | 'staff' | 'admin' = 'client'
): Promise<PreferenceCheckResult> {
  
  // If feature flag disabled, always allow (backwards compatible)
  if (!isPreferenceCheckingEnabled()) {
    console.log('⚙️ [Preference Check] Feature disabled - allowing all notifications');
    return {
      allowed: true,
      preferenceStatus: 'not_set',
      preferenceChecked: false,
    };
  }

  try {
    // CRITICAL notifications always allowed (legal/compliance requirements)
    if (CRITICAL_NOTIFICATION_TYPES.includes(notificationType)) {
      console.log(`✅ [Preference Check] CRITICAL notification type '${notificationType}' - bypassing preferences`);
      return {
        allowed: true,
        preferenceStatus: 'critical_bypass',
        preferenceChecked: true,
      };
    }

    // Check based on recipient type
    if (recipientType === 'staff') {
      return await checkStaffPreferences(supabase, recipientEmail, notificationType);
    } else if (recipientType === 'client') {
      return await checkClientPreferences(supabase, recipientEmail, notificationType, channel);
    } else {
      // Admin notifications always allowed
      return {
        allowed: true,
        preferenceStatus: 'critical_bypass',
        preferenceChecked: true,
      };
    }

  } catch (error: any) {
    // On error, DEFAULT TO ALLOW (fail open for reliability)
    console.error('❌ [Preference Check] Error checking preferences:', error);
    console.log('⚠️ [Preference Check] Defaulting to ALLOW due to error');
    return {
      allowed: true,
      reason: `preference_check_error: ${error.message}`,
      preferenceStatus: 'not_set',
      preferenceChecked: false,
    };
  }
}

/**
 * Check client notification preferences
 */
async function checkClientPreferences(
  supabase: SupabaseClient,
  recipientEmail: string,
  notificationType: string,
  channel: string
): Promise<PreferenceCheckResult> {
  
  // Get client contact preferences
  const { data: contact, error } = await supabase
    .from('client_contacts')
    .select('notification_preferences')
    .eq('email', recipientEmail)
    .maybeSingle();

  if (error) {
    console.error('❌ [Preference Check] Error querying client_contacts:', error);
    // Fail open - allow notification
    return {
      allowed: true,
      reason: 'database_error',
      preferenceStatus: 'not_set',
      preferenceChecked: false,
    };
  }

  if (!contact) {
    // Contact not found - might be a new contact or data issue
    console.log(`⚠️ [Preference Check] Client contact not found for ${recipientEmail} - allowing notification`);
    return {
      allowed: true,
      preferenceStatus: 'not_set',
      preferenceChecked: true,
    };
  }

  const preferences = contact.notification_preferences || {};
  
  // Map notification type to preference key
  const preferenceKey = NOTIFICATION_TYPE_TO_PREFERENCE_KEY[notificationType];
  
  if (!preferenceKey) {
    // Unknown notification type - allow by default
    console.log(`⚠️ [Preference Check] Unknown notification type '${notificationType}' - allowing`);
    return {
      allowed: true,
      preferenceStatus: 'not_set',
      preferenceChecked: true,
    };
  }

  // Check the specific preference
  const preferenceValue = preferences[preferenceKey];
  
  // If preference not set, default to TRUE (opted in)
  if (preferenceValue === undefined || preferenceValue === null) {
    console.log(`📧 [Preference Check] Preference '${preferenceKey}' not set for ${recipientEmail} - defaulting to ALLOW`);
    return {
      allowed: true,
      preferenceStatus: 'not_set',
      preferenceChecked: true,
    };
  }

  // Check if opted out
  if (preferenceValue === false) {
    console.log(`⏭️ [Preference Check] User ${recipientEmail} opted out of '${preferenceKey}'`);
    return {
      allowed: false,
      reason: 'user_opted_out',
      preferenceStatus: 'opted_out',
      preferenceChecked: true,
    };
  }

  // Opted in
  console.log(`✅ [Preference Check] User ${recipientEmail} opted in for '${preferenceKey}'`);
  return {
    allowed: true,
    preferenceStatus: 'opted_in',
    preferenceChecked: true,
  };
}

/**
 * Check staff notification preferences
 */
async function checkStaffPreferences(
  supabase: SupabaseClient,
  recipientEmail: string,
  notificationType: string
): Promise<PreferenceCheckResult> {
  // ⛔ GLOBAL KILL-SWITCH: Check staff status first
  // Inactive or Suspended staff are "offline" from all triggers
  const { data: staff, error } = await supabase
    .from('staff')
    .select('status, opt_out_shift_reminders')
    .eq('email', recipientEmail)
    .maybeSingle();

  if (error) {
    console.error('❌ [Preference Check] Error querying staff:', error);
    return {
      allowed: true,
      reason: 'database_error',
      preferenceStatus: 'not_set',
      preferenceChecked: false,
    };
  }

  if (!staff) {
    console.log(`⚠️ [Preference Check] Staff not found for ${recipientEmail} - allowing`);
    return {
      allowed: true,
      preferenceStatus: 'not_set',
      preferenceChecked: true,
    };
  }

  // Block if status is not active/onboarding
  if (['inactive', 'suspended'].includes(staff.status)) {
    console.log(`🚫 [Preference Check] BLOCKING communication for ${staff.status} staff: ${recipientEmail}`);
    return {
      allowed: false,
      reason: `staff_is_${staff.status}`,
      preferenceStatus: 'opted_out',
      preferenceChecked: true,
    };
  }

  // For shift reminders, check staff.opt_out_shift_reminders
  const isShiftReminder = [
    'shift_24h_reminder',
    'shift_2h_reminder',
    'shift_reminder',
  ].includes(notificationType);

  if (isShiftReminder) {
    if (staff.opt_out_shift_reminders === true) {
      console.log(`⏭️ [Preference Check] Staff ${recipientEmail} opted out of shift reminders`);
      return {
        allowed: false,
        reason: 'staff_opted_out_shift_reminders',
        preferenceStatus: 'opted_out',
        preferenceChecked: true,
      };
    }

    console.log(`✅ [Preference Check] Staff ${recipientEmail} has not opted out of shift reminders`);
    return {
      allowed: true,
      preferenceStatus: 'opted_in',
      preferenceChecked: true,
    };
  }

  // For other staff notifications, default to allow
  // (Staff don't have granular preference controls like clients)
  return {
    allowed: true,
    preferenceStatus: 'not_set',
    preferenceChecked: true,
  };
}

/**
 * Batch check preferences for multiple recipients
 * Useful for digest engines that send to many users
 */
export async function batchCheckPreferences(
  supabase: SupabaseClient,
  recipients: Array<{ email: string; type: 'client' | 'staff' | 'admin' }>,
  notificationType: string,
  channel: string = 'email'
): Promise<Map<string, PreferenceCheckResult>> {
  
  const results = new Map<string, PreferenceCheckResult>();

  // Check each recipient in parallel
  await Promise.all(
    recipients.map(async (recipient) => {
      const result = await shouldSendNotification(
        supabase,
        recipient.email,
        notificationType,
        channel,
        recipient.type
      );
      results.set(recipient.email, result);
    })
  );

  return results;
}
