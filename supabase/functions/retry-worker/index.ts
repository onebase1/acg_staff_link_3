
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
    logNotificationSent, 
    logNotificationFailed 
} from "../_shared/notificationLogger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log('🔄 [Retry Worker] Starting processing...');

    // 1. Fetch pending notifications from queue
    const now = new Date().toISOString();
    const { data: queueItems, error: queueError } = await supabase
        .from('notification_queue')
        .select('*')
        .eq('status', 'queued')
        .lte('scheduled_send_at', now)
        .limit(50); // Process in batches

    if (queueError) throw queueError;

    console.log(`📥 [Retry Worker] Found ${queueItems?.length || 0} items to process`);

    const results = {
        processed: 0,
        succeeded: 0,
        failed: 0,
        rescheduled: 0,
        permanent_failures: 0
    };

    for (const item of queueItems || []) {
        results.processed++;
        console.log(`Processing item ${item.id} (${item.channel}) for ${item.recipient_email || item.recipient_phone}`);

        try {
            let sendResult;
            let providerMessageId;

            // 2. Attempt to send based on channel
            if (item.channel === 'email') {
                if (!item.recipient_email || !item.content) {
                    throw new Error('Missing email or content');
                }

                sendResult = await supabase.functions.invoke('send-email', {
                    body: {
                        to: item.recipient_email,
                        subject: item.subject,
                        html: item.content
                    }
                });

                if (sendResult.error) throw new Error(sendResult.error.message || 'Email send failed');
                providerMessageId = sendResult.data?.messageId;

            } else if (item.channel === 'sms' || item.channel === 'whatsapp') {
                if (!item.recipient_phone || !item.message) {
                    throw new Error('Missing phone or message');
                }

                // Use send-sms function (which handles both sms/whatsapp usually, or separate)
                // Assuming 'send-sms' handles it.
                sendResult = await supabase.functions.invoke('send-sms', {
                    body: {
                        to: item.recipient_phone,
                        message: item.message,
                        channel: item.channel // Pass channel if supported
                    }
                });

                if (sendResult.error) throw new Error(sendResult.error.message || 'SMS send failed');
                providerMessageId = sendResult.data?.sid;
            } else {
                throw new Error(`Unsupported channel: ${item.channel}`);
            }

            // 3. Success Handling
            console.log(`✅ [Retry Worker] Item ${item.id} sent successfully`);
            
            // Update queue status
            await supabase
                .from('notification_queue')
                .update({ 
                    status: 'sent', 
                    sent_at: new Date().toISOString(),
                    email_message_id: providerMessageId
                })
                .eq('id', item.id);

            // Log to notification_log
            await logNotificationSent(supabase, {
                recipientEmail: item.recipient_email,
                recipientPhone: item.recipient_phone,
                recipientType: item.recipient_type,
                agencyId: item.agency_id,
                notificationType: item.notification_type,
                channel: item.channel,
                subject: item.subject,
                provider: item.channel === 'email' ? 'resend' : 'twilio',
                providerMessageId: providerMessageId,
                retryCount: item.retry_count,
                queueId: item.id,
                metadata: item.metadata,
                relatedEntityId: item.metadata?.related_entity_id,
                relatedEntityType: item.metadata?.related_entity_type
            });

            results.succeeded++;

        } catch (error) {
            console.error(`❌ [Retry Worker] Failed to process item ${item.id}:`, error.message);
            results.failed++;

            // 4. Failure Handling (Retry Logic)
            const currentRetry = item.retry_count || 0;
            const MAX_RETRIES = 3;

            if (currentRetry < MAX_RETRIES) {
                // Reschedule
                const delayMinutes = 5 * Math.pow(2, currentRetry); // 5, 10, 20
                const nextSchedule = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

                await supabase
                    .from('notification_queue')
                    .update({
                        retry_count: currentRetry + 1,
                        scheduled_send_at: nextSchedule,
                        error_message: error.message,
                        updated_date: new Date().toISOString()
                    })
                    .eq('id', item.id);
                
                results.rescheduled++;
                console.log(`🔄 [Retry Worker] Rescheduled item ${item.id} for ${nextSchedule}`);

            } else {
                // Permanent Failure
                await supabase
                    .from('notification_queue')
                    .update({
                        status: 'failed_permanently',
                        error_message: error.message,
                        updated_date: new Date().toISOString()
                    })
                    .eq('id', item.id);

                // Log final failure
                await logNotificationFailed(supabase, {
                    recipientEmail: item.recipient_email,
                    recipientPhone: item.recipient_phone,
                    notificationType: item.notification_type,
                    channel: item.channel,
                    subject: item.subject,
                    errorMessage: error.message,
                    retryCount: currentRetry,
                    queueId: item.id,
                    metadata: item.metadata
                });

                results.permanent_failures++;
                console.log(`🛑 [Retry Worker] Item ${item.id} failed permanently`);
                
                // Trigger admin alert
                if (item.agency_id) {
                    await supabase
                        .from("admin_workflows")
                        .insert({
                            agency_id: item.agency_id,
                            type: 'notification_failure',
                            priority: 'high',
                            status: 'pending',
                            title: `Notification Failure: ${item.notification_type}`,
                            description: `Permanent failure for ${item.channel} notification to ${item.recipient_email || item.recipient_phone}. Error: ${error.message}`,
                            related_entity: {
                                entity_type: 'notification_queue',
                                entity_id: item.id
                            },
                            auto_created: true
                        });
                    console.log(`🚨 [Retry Worker] Admin workflow created for item ${item.id}`);
                }
            }
        }
    }

    return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [Retry Worker] Fatal error:', error);
    return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
