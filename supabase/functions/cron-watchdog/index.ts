import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Database } from "../_shared/database-types.ts";

/**
 * 🐕 CRON DOG - SYSTEM WATCHDOG
 * 
 * This function is the ultimate guardian of your background jobs.
 * 
 * Logic:
 * 1. Calls 'handle_cron_failures()' in Postgres to identify new failures.
 * 2. If failures found, the Postgres function creates a record in 'system_alerts'.
 * 3. The 'system_alerts' table triggers an email via our shared notification logger.
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const supabase = createClient<Database>(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        console.log('🐕 [Watchdog] Starting system health check...');

        // 1. Trigger the DB function to catalog recent failures
        const { data, error: dbError } = await supabase.rpc('handle_cron_failures');

        if (dbError) {
            console.error('❌ [Watchdog] DB Error executing handle_cron_failures:', dbError);
            throw dbError;
        }

        const stats = data as any;
        console.log(`🐕 [Watchdog] Scan complete. Alerts created: ${stats?.alerts_created || 0}`);

        // 2. Return summary
        return new Response(
            JSON.stringify({
                success: true,
                timestamp: new Date().toISOString(),
                scan_results: stats
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        console.error('❌ [Watchdog] Fatal error:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
