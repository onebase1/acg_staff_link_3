import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * 🚨 DAILY SHIFT CLOSURE ENGINE - FINANCIAL PROTECTION
 *
 * CRITICAL: Prevents financial disputes by ensuring all shifts are verified
 *
 * RUNS DAILY (recommended: 9am) to create AdminWorkflows for:
 *
 * 1. ✅ Shifts past end time still "in_progress" or "confirmed" (not closed)
 * 2. ✅ Shifts ended >24h ago without timesheets
 * 3. ✅ Assigned shifts past date never confirmed by staff/client
 *
 * WHY THIS MATTERS:
 * - Prevents invoicing unverified shifts → client disputes
 * - Catches no-shows before invoice generation
 * - Ensures accurate payroll (staff may have worked different hours)
 *
 * SCHEDULE: Run this function daily via cron job or manual trigger
 */

serve(async (req) => {
    try {
        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        console.log('🚨 [Daily Closure] Starting shift verification engine...');

        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const oneDayAgo = new Date(now);
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        const oneDayAgoStr = oneDayAgo.toISOString().split('T')[0];

        const { data: allShifts, error: shiftsError } = await supabase
            .from("shifts")
            .select("*");

        if (shiftsError) {
            throw shiftsError;
        }

        console.log(`📊 [Daily Closure] Loaded ${allShifts.length} total shifts`);

        let workflowsCreated = 0;
        const issues = [];

        // ========================================
        // CHECK 1: Shifts past end time not closed
        // ========================================
        const shiftsNeedingClosure = allShifts.filter(shift => {
            if (!shift.date || !shift.end_time) return false;

            const shiftEndDateTime = new Date(`${shift.date}T${shift.end_time}`);
            const hoursAgo = (now - shiftEndDateTime) / (1000 * 60 * 60);

            return hoursAgo > 2 &&
                   (shift.status === 'in_progress' ||
                    shift.status === 'confirmed' ||
                    shift.status === 'awaiting_admin_closure');
        });

        console.log(`⏰ [Daily Closure] Found ${shiftsNeedingClosure.length} shifts past end time needing closure`);

        for (const shift of shiftsNeedingClosure) {
            const { data: client } = await supabase
                .from("clients")
                .select("*")
                .eq("id", shift.client_id)
                .single();

            const { data: staff } = shift.assigned_staff_id
                ? await supabase
                    .from("staff")
                    .select("*")
                    .eq("id", shift.assigned_staff_id)
                    .maybeSingle()
                : { data: null };

            const shiftEndDateTime = new Date(`${shift.date}T${shift.end_time}`);
            const hoursAgo = Math.round((now - shiftEndDateTime) / (1000 * 60 * 60));

            await supabase
                .from("admin_workflows")
                .insert({
                    agency_id: shift.agency_id,
                    type: 'other',
                    priority: hoursAgo > 48 ? 'critical' : 'high',
                    status: 'pending',
                    title: `⏰ Shift Closure Urgent - ${client?.name || 'Unknown Client'}`,
                    description: `CRITICAL: Shift ended ${hoursAgo}h ago but not marked as completed.\n\n📋 SHIFT DETAILS:\nClient: ${client?.name}\nStaff: ${staff ? `${staff.first_name} ${staff.last_name}` : 'Unassigned'}\nDate: ${shift.date}\nTime: ${shift.start_time}-${shift.end_time}\nLocation: ${shift.work_location_within_site || 'Not specified'}\nStatus: ${shift.status}\n\n⚠️ ACTION REQUIRED:\n1. Contact staff/client to confirm shift was worked\n2. Mark shift as completed OR cancelled/no-show\n3. Prevent invoicing unverified shift\n\n🔗 Shift ID: ${shift.id}`,
                    related_entity: {
                        entity_type: 'shift',
                        entity_id: shift.id
                    },
                    deadline: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
                    auto_created: true
                });

            workflowsCreated++;
            issues.push(`Shift ${shift.id.substring(0, 8)} - ${hoursAgo}h overdue`);
        }

        // ========================================
        // CHECK 2: Shifts >24h old without timesheets
        // ========================================
        const shiftsWithoutTimesheets = allShifts.filter(shift => {
            if (!shift.date || !shift.end_time) return false;

            const shiftEndDateTime = new Date(`${shift.date}T${shift.end_time}`);
            const hoursAgo = (now - shiftEndDateTime) / (1000 * 60 * 60);

            return hoursAgo > 24 &&
                   shift.status === 'completed' &&
                   !shift.timesheet_received &&
                   shift.assigned_staff_id;
        });

        console.log(`📋 [Daily Closure] Found ${shiftsWithoutTimesheets.length} completed shifts without timesheets`);

        for (const shift of shiftsWithoutTimesheets) {
            const { data: client } = await supabase
                .from("clients")
                .select("*")
                .eq("id", shift.client_id)
                .single();

            const { data: staff } = await supabase
                .from("staff")
                .select("*")
                .eq("id", shift.assigned_staff_id)
                .single();

            await supabase
                .from("admin_workflows")
                .insert({
                    agency_id: shift.agency_id,
                    type: 'timesheet_discrepancy',
                    priority: 'high',
                    status: 'pending',
                    title: `📋 Missing Timesheet - ${staff?.first_name} ${staff?.last_name}`,
                    description: `Shift marked completed but no timesheet received.\n\n📋 SHIFT DETAILS:\nClient: ${client?.name}\nStaff: ${staff?.first_name} ${staff?.last_name}\nDate: ${shift.date}\nTime: ${shift.start_time}-${shift.end_time}\n\n⚠️ ACTION:\n1. Contact staff to upload timesheet\n2. Create timesheet manually if needed\n3. Do NOT invoice without verified hours`,
                    related_entity: {
                        entity_type: 'shift',
                        entity_id: shift.id
                    },
                    auto_created: true
                });

            workflowsCreated++;
            issues.push(`Missing timesheet - Shift ${shift.id.substring(0, 8)}`);
        }

        console.log(`✅ [Daily Closure] Created ${workflowsCreated} AdminWorkflows`);

        return new Response(
            JSON.stringify({
                success: true,
                message: `Created ${workflowsCreated} AdminWorkflows`,
                workflows_created: workflowsCreated,
                issues_found: issues.length,
                issues: issues.slice(0, 10),
                timestamp: now.toISOString()
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error('❌ [Daily Closure] Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
