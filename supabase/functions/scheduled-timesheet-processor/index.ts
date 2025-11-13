import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * 🔄 SCHEDULED TIMESHEET PROCESSOR
 *
 * Background job that processes all pending timesheets
 * Runs auto-approval engine on eligible timesheets
 *
 * SCHEDULE: Run every 15 minutes via cron/scheduler
 * TRIGGER: Can be manually triggered by admin
 *
 * Created: 2025-01-08
 */

serve(async (req) => {
    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Authenticate (can be called by system scheduler or admin)
        let user;
        try {
            const authHeader = req.headers.get('Authorization');
            if (authHeader) {
                const token = authHeader.replace('Bearer ', '');
                const { data: { user: authUser } } = await supabase.auth.getUser(token);
                user = authUser;
            }
        } catch {
            // Allow unauthenticated calls from scheduler (use service role only)
            console.log('📅 [Scheduler] Running as system job (no user auth)');
        }

        console.log('🔄 [Scheduled Processor] Starting batch timesheet processing...');

        // Fetch all pending timesheets using service role
        const { data: allTimesheets, error: timesheetsError } = await supabase
            .from("timesheets")
            .select("*")
            .eq("status", "submitted");

        if (timesheetsError) {
            throw timesheetsError;
        }

        console.log(`📊 [Processor] Found ${allTimesheets.length} submitted timesheets`);

        if (allTimesheets.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                message: 'No timesheets to process',
                processed: 0,
                approved: 0,
                flagged: 0
            }), {
                headers: { "Content-Type": "application/json" }
            });
        }

        // Fetch related data for validation
        const [agenciesResult, allStaffResult, allShiftsResult] = await Promise.all([
            supabase.from("agencies").select("*"),
            supabase.from("staff").select("*"),
            supabase.from("shifts").select("*")
        ]);

        const agencies = agenciesResult.data || [];
        const allStaff = allStaffResult.data || [];
        const allShifts = allShiftsResult.data || [];

        const results = {
            processed: 0,
            approved: 0,
            flagged: 0,
            skipped: 0,
            errors: []
        };

        // Process each timesheet
        for (const timesheet of allTimesheets) {
            try {
                // Check if agency has auto-approval enabled
                const agency = agencies.find(a => a.id === timesheet.agency_id);
                const autoApprovalEnabled = agency?.settings?.automation_settings?.auto_timesheet_approval ?? true;

                if (!autoApprovalEnabled) {
                    results.skipped++;
                    console.log(`⏭️ [Processor] Skipped ${timesheet.id} - auto-approval disabled for agency`);
                    continue;
                }

                // Call auto-approval engine
                const { data: response, error: invokeError } = await supabase.functions.invoke('auto-timesheet-approval-engine', {
                    body: {
                        timesheet_id: timesheet.id,
                        manual_trigger: false // Background trigger
                    }
                });

                if (invokeError) {
                    throw invokeError;
                }

                results.processed++;

                if (response?.success && response?.action === 'approved') {
                    results.approved++;
                    console.log(`✅ [Processor] Auto-approved: ${timesheet.id}`);
                } else {
                    results.flagged++;
                    console.log(`⚠️ [Processor] Flagged for review: ${timesheet.id}`);
                }

            } catch (error) {
                results.errors.push({
                    timesheet_id: timesheet.id,
                    error: error.message
                });
                console.error(`❌ [Processor] Error processing ${timesheet.id}:`, error);
            }
        }

        console.log('✅ [Processor] Batch complete:', results);

        return new Response(JSON.stringify({
            success: true,
            message: `Processed ${results.processed} timesheets`,
            ...results,
            timestamp: new Date().toISOString()
        }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('❌ [Scheduled Processor] Fatal error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
});
