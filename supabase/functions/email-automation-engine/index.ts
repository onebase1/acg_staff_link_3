import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Database } from "../_shared/database-types.ts";
import { shouldSendNotification } from "../_shared/preferenceChecker.ts";
import {
    logNotificationSent,
    logNotificationFailed,
    logNotificationSkipped
} from "../_shared/notificationLogger.ts";
import { scheduleRetry } from "../_shared/retryHandler.ts";

/**
 * PHASE 2 - TIER 2: Smart Email Automation Engine
 *
 * Centralized email orchestration for:
 * - Shift confirmations (immediate)
 * - Shift updates/changes (immediate)
 * - Daily digests for staff (morning summary of today's shifts)
 * - Weekly summaries for admin (Monday morning)
 *
 * Triggered: Scheduled hourly + event-based webhooks
 * Rollback: Individual email types can be disabled in agency settings
 */

// Define types derived from Database
type Shift = Database['public']['Tables']['shifts']['Row'];
type Agency = Database['public']['Tables']['agencies']['Row'];
type Staff = Database['public']['Tables']['staff']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];
type Timesheet = Database['public']['Tables']['timesheets']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface Address {
    line1?: string;
    postcode?: string;
}

interface ShiftWithClient extends Shift {
    client?: Client;
}

interface AutomationResults {
    confirmations_sent: number;
    daily_digests_sent: number;
    weekly_summaries_sent: number;
    errors: { id?: string; error: string }[];
}

serve(async (req) => {
    try {
        // Initialize Supabase client
        const supabase = createClient<Database>(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        console.log('📧 [Email Automation Engine] Starting run...');

        const results: AutomationResults = {
            confirmations_sent: 0,
            daily_digests_sent: 0,
            weekly_summaries_sent: 0,
            errors: [],
        };

        const now = new Date();
        const isMonday = now.getDay() === 1;
        const isMorning = now.getHours() === 8; // 8am

        // TASK 1: Send daily shift digests to staff (8am every day)
        if (isMorning) {
            console.log('📬 Sending daily shift digests...');

            const { data: agencies, error: agenciesError } = await supabase
                .from("agencies")
                .select("*");

            if (agenciesError) {
                throw agenciesError;
            }

            for (const agency of agencies) {
                try {
                    // Get today's confirmed shifts
                    const todayStr = now.toISOString().split('T')[0];
                    const { data: todayShifts, error: shiftsError } = await supabase
                        .from("shifts")
                        .select("*")
                        .eq("agency_id", agency.id)
                        .eq("date", todayStr)
                        .in("status", ['confirmed', 'assigned']);

                    if (shiftsError) {
                        throw shiftsError;
                    }

                    // Group by staff
                    const shiftsByStaff = (todayShifts || []).reduce<Record<string, Shift[]>>((acc, shift) => {
                        if (shift.assigned_staff_id) {
                            if (!acc[shift.assigned_staff_id]) acc[shift.assigned_staff_id] = [];
                            acc[shift.assigned_staff_id].push(shift);
                        }
                        return acc;
                    }, {});

                    // Send digest to each staff member with shifts today
                    for (const [staffId, shifts] of Object.entries(shiftsByStaff)) {
                        try {
                            const { data: staff, error: staffError } = await supabase
                                .from("staff")
                                .select("*")
                                .eq("id", staffId)
                                .single();

                            if (staffError || !staff) continue;

                            const staffMember = staff;

                            // Get client names
                            const shiftsWithClients: ShiftWithClient[] = await Promise.all(shifts.map(async (shift) => {
                                const { data: client } = await supabase
                                    .from("clients")
                                    .select("*")
                                    .eq("id", shift.client_id || '')
                                    .single();
                                return { ...shift, client: client || undefined };
                            }));

                            const shiftList = shiftsWithClients.map(s => {
                                const address = s.client?.address as unknown as Address | undefined;
                                return `
                                <div style="background: white; border-left: 4px solid #06b6d4; padding: 15px; margin: 10px 0;">
                                    <p style="margin: 5px 0;"><strong>${s.start_time} - ${s.end_time}</strong> (${s.duration_hours}h)</p>
                                    <p style="margin: 5px 0;">📍 ${s.client?.name || 'Client'}</p>
                                    <p style="margin: 5px 0; font-size: 12px;">${address?.line1 || ''}, ${address?.postcode || ''}</p>
                                    <p style="margin: 5px 0; color: #059669;">💰 £${s.pay_rate}/hr</p>
                                </div>
                            `}).join('');

                            // Check preference
                            const preferenceCheck = await shouldSendNotification(
                                supabase,
                                staffMember.email,
                                'daily_digest',
                                'email',
                                'staff'
                            );

                            if (!preferenceCheck.allowed) {
                                console.log(`⏭️ [Daily Digest] Skipped for ${staffMember.email} - ${preferenceCheck.reason}`);
                                await logNotificationSkipped(supabase, {
                                    recipientEmail: staffMember.email,
                                    recipientType: 'staff',
                                    staffId: staffMember.id,
                                    agencyId: agency.id,
                                    notificationType: 'daily_digest',
                                    channel: 'email',
                                    preferenceChecked: preferenceCheck.preferenceChecked,
                                    preferenceStatus: preferenceCheck.preferenceStatus,
                                    skippedReason: preferenceCheck.reason,
                                    metadata: { shift_count: shifts.length }
                                });
                                continue;
                            }

                            const emailResult = await supabase.functions.invoke('send-email', {
                                body: {
                                    to: staffMember.email,
                                    subject: `🌅 Good Morning! You have ${shifts.length} shift${shifts.length > 1 ? 's' : ''} today`,
                                    html: `
                                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                        <div style="background-color: #0284c7; padding: 30px; text-align: center;" bgcolor="#0284c7">
                                            <h1 style="color: white; margin: 0; font-weight: bold;">🌅 Good Morning, ${staffMember.first_name}!</h1>
                                        </div>
                                        <div style="padding: 30px; background: #f0f9ff;">
                                            <p style="font-size: 16px; color: #1f2937;">Here's your schedule for today:</p>

                                            ${shiftList}

                                            <div style="background: #cffafe; border: 2px solid #06b6d4; padding: 15px; margin: 20px 0; border-radius: 8px;">
                                                <p style="font-size: 14px; color: #0e7490; margin: 0;">
                                                    💡 <strong>Reminder:</strong> Arrive 10 minutes early to each shift. Have a great day!
                                                </p>
                                            </div>
                                        </div>
                                        <div style="background: #0284c7; padding: 20px; text-align: center;">
                                            <p style="color: white; font-size: 12px; margin: 0;">© ${now.getFullYear()} ${agency.name}</p>
                                        </div>
                                    </div>
                                `
                                }
                            });

                            if (emailResult.error) throw new Error(emailResult.error);

                            // Log success
                            await logNotificationSent(supabase, {
                                recipientEmail: staffMember.email,
                                recipientType: 'staff',
                                staffId: staffMember.id,
                                agencyId: agency.id,
                                notificationType: 'daily_digest',
                                channel: 'email',
                                provider: 'resend',
                                providerMessageId: emailResult?.data?.id, // Resend returns 'id'
                                preferenceChecked: preferenceCheck.preferenceChecked,
                                preferenceStatus: preferenceCheck.preferenceStatus,
                                metadata: { shift_count: shifts.length }
                            });

                            results.daily_digests_sent++;

                        } catch (staffError: any) {
                            console.error(`❌ Error sending digest to staff ${staffId}:`, staffError.message);
                            
                            // Log failure
                            await logNotificationFailed(supabase, {
                                recipientEmail: staffId, // We might not have email if staff fetch failed, but usually we do inside the loop
                                recipientType: 'staff',
                                staffId: staffId,
                                agencyId: agency.id,
                                notificationType: 'daily_digest',
                                channel: 'email',
                                errorMessage: staffError.message,
                                errorCode: 'send_failed'
                            });

                            // Schedule retry
                            await scheduleRetry(supabase, {
                                notificationType: 'daily_digest',
                                recipientEmail: staffId, // Using ID as placeholder if email unknown, but ideally email
                                recipientId: staffId,
                                agencyId: agency.id,
                                channel: 'email',
                                metadata: { staffId, agencyId: agency.id } // Minimal payload for retry worker to reconstruct
                            });

                            results.errors.push({ id: staffId, error: staffError.message });
                        }
                    }

                } catch (agencyError: any) {
                    console.error(`❌ Error processing agency ${agency.id}:`, agencyError.message);
                    results.errors.push({ id: agency.id, error: agencyError.message });
                }
            }
        }

        // TASK 2: Send weekly summary to admins (Monday 8am)
        if (isMonday && isMorning) {
            console.log('📊 Sending weekly summaries to admins...');

            const { data: agencies, error: agenciesError } = await supabase
                .from("agencies")
                .select("*");

            if (agenciesError) {
                throw agenciesError;
            }

            for (const agency of agencies) {
                try {
                    // Get last 7 days data
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    const weekAgoStr = weekAgo.toISOString().split('T')[0];
                    const todayStr = now.toISOString().split('T')[0];

                    const { data: shiftsThisWeek, error: shiftsError } = await supabase
                        .from("shifts")
                        .select("*")
                        .eq("agency_id", agency.id)
                        .gte("date", weekAgoStr)
                        .lte("date", todayStr);

                    if (shiftsError) {
                        throw shiftsError;
                    }

                    const { data: timesheetsThisWeek, error: timesheetsError } = await supabase
                        .from("timesheets")
                        .select("*")
                        .eq("agency_id", agency.id)
                        .gte("shift_date", weekAgoStr)
                        .lte("shift_date", todayStr);

                    if (timesheetsError) {
                        throw timesheetsError;
                    }

                    const completedShifts = (shiftsThisWeek || []).filter(s => s.status === 'completed').length;
                    const openShifts = (shiftsThisWeek || []).filter(s => s.status === 'open').length;
                    const totalHours = (timesheetsThisWeek || []).reduce((sum, t) => sum + (t.total_hours || 0), 0);
                    const totalRevenue = (timesheetsThisWeek || []).reduce((sum, t) => sum + (t.client_charge_amount || 0), 0);

                    // Get admin users for this agency
                    const { data: adminUsers, error: usersError } = await supabase
                        .from("profiles")
                        .select("*")
                        .eq("agency_id", agency.id)
                        .in("user_type", ['agency_admin', 'manager']);

                    if (usersError) {
                        throw usersError;
                    }

                    for (const admin of adminUsers) {
                        // Check preference
                        const preferenceCheck = await shouldSendNotification(
                            supabase,
                            admin.email,
                            'weekly_summary',
                            'email',
                            'admin'
                        );

                        if (!preferenceCheck.allowed) {
                            console.log(`⏭️ [Weekly Summary] Skipped for ${admin.email} - ${preferenceCheck.reason}`);
                             await logNotificationSkipped(supabase, {
                                recipientEmail: admin.email,
                                recipientType: 'admin',
                                agencyId: agency.id,
                                notificationType: 'weekly_summary',
                                channel: 'email',
                                preferenceChecked: preferenceCheck.preferenceChecked,
                                preferenceStatus: preferenceCheck.preferenceStatus,
                                skippedReason: preferenceCheck.reason,
                                metadata: { completed_shifts: completedShifts, total_revenue: totalRevenue }
                            });
                            continue;
                        }

                        const emailResult = await supabase.functions.invoke('send-email', {
                            body: {
                                to: admin.email,
                                subject: `📊 Weekly Summary: ${agency.name} - ${completedShifts} shifts completed`,
                                html: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                    <div style="background-color: #6d28d9; padding: 30px; text-align: center;" bgcolor="#6d28d9">
                                        <h1 style="color: white; margin: 0; font-weight: bold;">📊 Weekly Performance Report</h1>
                                        <p style="color: #e9d5ff; margin-top: 10px;">${weekAgoStr} to ${todayStr}</p>
                                    </div>
                                    <div style="padding: 30px; background: #faf5ff;">
                                        <h2 style="color: #6d28d9; margin-top: 0;">Key Metrics</h2>

                                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
                                            <div style="background: white; border-left: 4px solid #10b981; padding: 15px;">
                                                <p style="font-size: 12px; color: #6b7280; margin: 0;">Completed Shifts</p>
                                                <p style="font-size: 24px; font-weight: bold; color: #10b981; margin: 5px 0;">${completedShifts}</p>
                                            </div>
                                            <div style="background: white; border-left: 4px solid #ef4444; padding: 15px;">
                                                <p style="font-size: 12px; color: #6b7280; margin: 0;">Open Shifts</p>
                                                <p style="font-size: 24px; font-weight: bold; color: #ef4444; margin: 5px 0;">${openShifts}</p>
                                            </div>
                                            <div style="background: white; border-left: 4px solid #3b82f6; padding: 15px;">
                                                <p style="font-size: 12px; color: #6b7280; margin: 0;">Total Hours</p>
                                                <p style="font-size: 24px; font-weight: bold; color: #3b82f6; margin: 5px 0;">${totalHours.toFixed(1)}h</p>
                                            </div>
                                            <div style="background: white; border-left: 4px solid #f59e0b; padding: 15px;">
                                                <p style="font-size: 12px; color: #6b7280; margin: 0;">Revenue</p>
                                                <p style="font-size: 24px; font-weight: bold; color: #f59e0b; margin: 5px 0;">£${totalRevenue.toFixed(2)}</p>
                                            </div>
                                        </div>

                                        <div style="background: #ddd6fe; border: 2px solid #8b5cf6; padding: 15px; margin: 20px 0; border-radius: 8px;">
                                            <p style="font-size: 14px; color: #6d28d9; margin: 0;">
                                                💡 <strong>Action Items:</strong> ${openShifts > 0 ? `${openShifts} shifts need assignment.` : 'All shifts covered - great job!'} Review pending timesheets in dashboard.
                                            </p>
                                        </div>
                                    </div>

                                    <!-- Unsubscribe Link -->
                                    <div style="background: #f9fafb; padding: 15px; text-align: center;">
                                        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                                            <a href="https://agilecaremanagement.co.uk/preferences?email=${encodeURIComponent(admin.email)}" style="color: #64748b; text-decoration: underline;">
                                                Manage email preferences
                                            </a>
                                        </p>
                                    </div>

                                    <!-- Footer -->
                                    <div style="background: #1e293b; color: #94a3b8; padding: 20px; text-align: center;">
                                        <p style="margin: 0; font-size: 13px;">© ${now.getFullYear()} Agile Care Management. All rights reserved.</p>
                                        <p style="margin: 10px 0 0 0; font-size: 12px;">
                                            Need help? Contact us at <a href="mailto:support@agilecaremanagement.co.uk" style="color: #06b6d4; text-decoration: none;">support@agilecaremanagement.co.uk</a>
                                        </p>
                                    </div>
                                </div>
                            `
                            }
                        });

                        if (emailResult.error) throw new Error(emailResult.error);

                        // Log success
                        await logNotificationSent(supabase, {
                            recipientEmail: admin.email,
                            recipientType: 'admin',
                            agencyId: agency.id,
                            notificationType: 'weekly_summary',
                            channel: 'email',
                            provider: 'resend',
                            providerMessageId: emailResult?.data?.id,
                            preferenceChecked: preferenceCheck.preferenceChecked,
                            preferenceStatus: preferenceCheck.preferenceStatus,
                            metadata: { completed_shifts: completedShifts, total_revenue: totalRevenue }
                        });

                        results.weekly_summaries_sent++;
                    }

                } catch (agencyError: any) {
                    console.error(`❌ Error sending weekly summary for agency ${agency.id}:`, agencyError.message);
                    results.errors.push({ id: agency.id, error: agencyError.message });
                }
            }
        }

        console.log('✅ [Email Automation Engine] Complete:', results);

        return new Response(
            JSON.stringify({
                success: true,
                timestamp: new Date().toISOString(),
                results: results
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        console.error('❌ [Email Automation Engine] Fatal error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});

