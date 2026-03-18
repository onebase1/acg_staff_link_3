import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * 📅 AUTO DAILY NORMAL DIGEST
 *
 * Runs via pg_cron once a day at 4:00 PM UK
 * Finds all pending normal marketplace shifts and broadcasts them in ONE consolidated digest per agency
 *
 * Features:
 * - Batches multiple normal shifts into single notification
 * - Groups by agency_id for isolation
 * - Calls normal-marketplace-digest for intelligent eligibility filtering
 * - Updates shifts with broadcast timestamp string to prevent resends
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
    console.log('📅 [Auto Daily Normal Digest] Cron job started at', new Date().toISOString());

    const today = new Date().toISOString().split('T')[0];

    // ✅ Find all pending normal shifts (must be today or in the future)
    const { data: pendingShifts, error: fetchError } = await supabase
      .from('shifts')
      .select('*')
      .eq('marketplace_visible', true)
      .is('broadcast_sent_at', null)
      .eq('urgency', 'normal')
      .eq('status', 'open')
      .gte('date', today);

    if (fetchError) throw fetchError;

    if (!pendingShifts || pendingShifts.length === 0) {
      console.log('✅ [Auto Daily Normal] No pending normal shifts - all clear!');
      return new Response(JSON.stringify({
        success: true,
        broadcasted: 0,
        message: 'No pending shifts to broadcast'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`📋 [Auto Daily Normal] Found ${pendingShifts.length} pending shift(s)`);

    // ✅ Group shifts by agency_id
    const shiftsByAgency = pendingShifts.reduce((acc: Record<string, any[]>, shift) => {
      if (!acc[shift.agency_id]) {
        acc[shift.agency_id] = [];
      }
      acc[shift.agency_id].push(shift);
      return acc;
    }, {});

    console.log(`📊 [Auto Daily Normal] ${Object.keys(shiftsByAgency).length} agency/agencies with pending normal shifts`);

    const results = [];

    // ✅ For each agency, call normal-marketplace-digest
    for (const [agencyId, shifts] of Object.entries(shiftsByAgency)) {
      try {
        console.log(`\n📡 [Auto Daily Normal] Processing agency ${agencyId}: ${shifts.length} shift(s)`);

        const shiftIds = shifts.map((s: any) => s.id);

        // Call isolated engine
        const { data, error } = await supabase.functions.invoke('normal-marketplace-digest', {
          body: {
            shift_ids: shiftIds,
            agency_id: agencyId
          }
        });

        if (error) {
          console.error(`❌ [Auto Daily Normal] Error calling normal-marketplace-digest:`, error);
          throw error;
        }

        if (data.skipped) {
          console.log(`⏭️ [Auto Daily Normal] Agency ${agencyId}: Normal digest disabled - ${data.reason}`);
          
          results.push({
            agency_id: agencyId,
            shifts_count: shifts.length,
            skipped: true,
            reason: data.reason
          });

          continue;
        }

        // ✅ Update shifts with broadcast timestamp to prevent double-notifying
        const { error: updateError } = await supabase
          .from('shifts')
          .update({
            broadcast_sent_at: new Date().toISOString()
          })
          .in('id', shiftIds);

        if (updateError) {
          console.error(`❌ [Auto Daily Normal] Failed to update shifts:`, updateError);
          throw updateError;
        }

        console.log(`✅ [Auto Daily Normal] Agency ${agencyId}:`);
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
        console.error(`❌ [Auto Daily Normal] Failed for agency ${agencyId}:`, err.message);
        results.push({
          agency_id: agencyId,
          shifts_count: shifts.length,
          error: err.message
        });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 [Auto Daily Normal] Cron job complete!');
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
    console.error('❌ [Auto Daily Normal] Fatal error:', error);
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
