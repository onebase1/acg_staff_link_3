import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * 🤖 AUTO URGENT DIGEST BROADCASTER
 *
 * **Phase 2 Automation: Zero Human Intervention**
 *
 * Runs via pg_cron every 5 minutes
 * Finds all pending urgent shifts and broadcasts them in ONE consolidated digest per agency
 *
 * Features:
 * - Batches multiple urgent shifts into single notification
 * - Groups by agency_id for isolation
 * - Calls smart-marketplace-digest for intelligent eligibility filtering
 * - Updates shifts with broadcast timestamp
 * - Fully automated - no human action required
 *
 * Triggered: Cron job every 5 minutes
 * Settings: Respects automation_settings.use_smart_marketplace_digest
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    console.log('🤖 [Auto Broadcaster] Cron job started at', new Date().toISOString());

    // ✅ Find all pending urgent/critical shifts
    const { data: pendingShifts, error: fetchError } = await supabase
      .from('shifts')
      .select('*')
      .eq('pending_broadcast', true)
      .is('broadcast_sent_at', null)
      .in('urgency', ['urgent', 'critical'])
      .eq('status', 'open');

    if (fetchError) throw fetchError;

    if (!pendingShifts || pendingShifts.length === 0) {
      console.log('✅ [Auto Broadcaster] No pending shifts - all clear!');
      return new Response(JSON.stringify({
        success: true,
        broadcasted: 0,
        message: 'No pending shifts to broadcast'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`📋 [Auto Broadcaster] Found ${pendingShifts.length} pending shift(s)`);

    // ✅ Group shifts by agency_id
    const shiftsByAgency = pendingShifts.reduce((acc: Record<string, any[]>, shift) => {
      if (!acc[shift.agency_id]) {
        acc[shift.agency_id] = [];
      }
      acc[shift.agency_id].push(shift);
      return acc;
    }, {});

    console.log(`📊 [Auto Broadcaster] ${Object.keys(shiftsByAgency).length} agency/agencies with pending shifts`);

    const results = [];

    // ✅ For each agency, call smart-marketplace-digest
    for (const [agencyId, shifts] of Object.entries(shiftsByAgency)) {
      try {
        console.log(`\n📡 [Auto Broadcaster] Processing agency ${agencyId}: ${shifts.length} shift(s)`);

        const shiftIds = shifts.map((s: any) => s.id);

        // Call smart-marketplace-digest
        const { data, error } = await supabase.functions.invoke('smart-marketplace-digest', {
          body: {
            shift_ids: shiftIds,
            agency_id: agencyId
          }
        });

        if (error) {
          console.error(`❌ [Auto Broadcaster] Error calling smart-marketplace-digest:`, error);
          throw error;
        }

        if (data.skipped) {
          console.log(`⏭️ [Auto Broadcaster] Agency ${agencyId}: Smart digest disabled - ${data.reason}`);

          // Clear pending_broadcast flag even if feature disabled
          // (prevents shifts from piling up in queue)
          const { error: clearError } = await supabase
            .from('shifts')
            .update({ pending_broadcast: false })
            .in('id', shiftIds);

          if (clearError) console.error(`⚠️  Failed to clear pending_broadcast:`, clearError);

          results.push({
            agency_id: agencyId,
            shifts_count: shifts.length,
            skipped: true,
            reason: data.reason
          });

          continue;
        }

        // ✅ Update shifts with broadcast timestamp
        const { error: updateError } = await supabase
          .from('shifts')
          .update({
            broadcast_sent_at: new Date().toISOString(),
            pending_broadcast: false,
            marketplace_visible: true
          })
          .in('id', shiftIds);

        if (updateError) {
          console.error(`❌ [Auto Broadcaster] Failed to update shifts:`, updateError);
          throw updateError;
        }

        console.log(`✅ [Auto Broadcaster] Agency ${agencyId}:`);
        console.log(`   Notified: ${data.results.staffNotified} staff`);
        console.log(`   Channels: ${data.results.channelBreakdown.sms} SMS, ${data.results.channelBreakdown.whatsapp} WhatsApp, ${data.results.channelBreakdown.email} Email`);

        results.push({
          agency_id: agencyId,
          shifts_count: shifts.length,
          staff_notified: data.results.staffNotified,
          notifications_sent: data.results.totalNotificationsSent,
          channel_breakdown: data.results.channelBreakdown
        });

      } catch (err: any) {
        console.error(`❌ [Auto Broadcaster] Failed for agency ${agencyId}:`, err.message);
        results.push({
          agency_id: agencyId,
          shifts_count: shifts.length,
          error: err.message
        });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 [Auto Broadcaster] Cron job complete!');
    console.log(`📊 Broadcasted ${results.length} batch(es)`);
    console.log('='.repeat(60) + '\n');

    return new Response(JSON.stringify({
      success: true,
      broadcasted: results.length,
      results: results,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error('❌ [Auto Broadcaster] Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
