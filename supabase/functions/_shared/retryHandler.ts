
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RetryParams {
  notificationType: string;
  channel: 'email' | 'sms' | 'whatsapp';
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  recipientId?: string; // contact_id or staff_id
  recipientType?: 'client' | 'staff' | 'admin';
  agencyId?: string;
  subject?: string;
  content?: string; // HTML body or SMS message
  relatedEntityId?: string;
  relatedEntityType?: string;
  errorMessage?: string;
  retryCount?: number;
  metadata?: Record<string, any>;
}

/**
 * Schedule a retry for a failed notification using exponential backoff
 */
export async function scheduleRetry(
  supabase: SupabaseClient,
  params: RetryParams
): Promise<{ success: boolean; error?: any; scheduledAt?: string }> {
  
  const MAX_RETRIES = 3;
  const currentRetryCount = params.retryCount || 0;

  // If max retries reached, don't schedule another
  if (currentRetryCount >= MAX_RETRIES) {
    console.log(`🛑 [Retry Handler] Max retries (${MAX_RETRIES}) reached for ${params.notificationType} to ${params.recipientEmail}`);
    // Ideally we would trigger an admin alert here
    return { success: false, error: 'Max retries reached' };
  }

  try {
    // Calculate delay: 5min, 10min, 20min
    // Formula: 5 * 2^retry_count
    const delayMinutes = 5 * Math.pow(2, currentRetryCount);
    const scheduledAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

    console.log(`🔄 [Retry Handler] Scheduling retry #${currentRetryCount + 1} in ${delayMinutes} mins for ${params.recipientEmail}`);

    const { error } = await supabase
      .from('notification_queue')
      .insert({
        notification_type: params.notificationType,
        channel: params.channel,
        recipient_email: params.recipientEmail,
        recipient_phone: params.recipientPhone,
        recipient_first_name: params.recipientName,
        recipient_id: params.recipientId,
        recipient_type: params.recipientType,
        agency_id: params.agencyId,
        subject: params.subject,
        content: params.content, // Store the full content to avoid regeneration
        message: params.channel === 'sms' || params.channel === 'whatsapp' ? params.content : undefined,
        status: 'queued',
        retry_count: currentRetryCount + 1,
        scheduled_send_at: scheduledAt,
        error_message: params.errorMessage,
        metadata: {
            ...params.metadata,
            original_error: params.errorMessage,
            related_entity_id: params.relatedEntityId,
            related_entity_type: params.relatedEntityType
        }
      });

    if (error) {
      console.error('❌ [Retry Handler] Failed to enqueue retry:', error);
      return { success: false, error };
    }

    return { success: true, scheduledAt };

  } catch (error) {
    console.error('❌ [Retry Handler] Unexpected error:', error);
    return { success: false, error };
  }
}
