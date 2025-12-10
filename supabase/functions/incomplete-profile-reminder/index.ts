import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { shouldSendNotification } from "../_shared/preferenceChecker.ts";
import {
    logNotificationSent,
    logNotificationFailed,
    logNotificationSkipped
} from "../_shared/notificationLogger.ts";
import { scheduleRetry } from "../_shared/retryHandler.ts";

/**
 * 📧 INCOMPLETE PROFILE REMINDER ENGINE
 *
 * Scheduled function (runs daily) to send reminder emails to staff
 * who have signed up but not completed their profile onboarding.
 *
 * REMINDER SCHEDULE:
 * - Day 1: Gentle reminder
 * - Day 3: Second reminder with checklist
 * - Day 7: Urgent reminder
 * - Day 14: Final reminder + escalate to admin
 *
 * TRIGGERS:
 * - Staff.status = 'onboarding'
 * - Staff.user_id is set (they've created account)
 * - Missing critical information
 */

serve(async (req) => {
    try {
        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        console.log('📧 [Incomplete Profile Reminder] Starting daily run...');

        // Find all staff in onboarding status with user accounts
        const { data: allStaff, error: allStaffError } = await supabase
            .from("staff")
            .select("*");

        if (allStaffError) throw allStaffError;

        const onboardingStaff = allStaff.filter(s =>
            s.status === 'onboarding' &&
            s.user_id &&
            s.email
        );

        console.log(`📊 Found ${onboardingStaff.length} staff in onboarding`);

        if (onboardingStaff.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'No incomplete profiles found',
                    reminders_sent: 0
                }),
                { headers: { "Content-Type": "application/json" } }
            );
        }

        // Get all compliance documents for these staff
        const { data: allCompliance, error: complianceError } = await supabase
            .from("compliance")
            .select("*");

        if (complianceError) throw complianceError;

        const { data: agencies, error: agenciesError } = await supabase
            .from("agencies")
            .select("*");

        if (agenciesError) throw agenciesError;

        let remindersSent = 0;
        let escalationsSent = 0;

        for (const staff of onboardingStaff) {
            const agency = agencies.find(a => a.id === staff.agency_id);
            if (!agency) continue;

            // Calculate days since user created account
            const daysSinceCreation = staff.created_date
                ? Math.floor((Date.now() - new Date(staff.created_date).getTime()) / (1000 * 60 * 60 * 24))
                : 0;

            // Skip if not on a reminder day
            if (![1, 3, 7, 14].includes(daysSinceCreation)) continue;

            // Calculate completion percentage
            const staffCompliance = allCompliance.filter(c => c.staff_id === staff.id);
            const progress = calculateOnboardingProgress(staff, staffCompliance);

            // Skip if already 100% complete
            if (progress.percentage >= 100) {
                // Mark as active
                await supabase
                    .from("staff")
                    .update({ status: 'active' })
                    .eq("id", staff.id);
                continue;
            }

            console.log(`📧 Sending Day ${daysSinceCreation} reminder to: ${staff.first_name} ${staff.last_name}`);

            try {
                // Check preference
                const preferenceCheck = await shouldSendNotification(
                    supabase,
                    staff.email,
                    'system_update', // Mapped as per instructions
                    'email',
                    'staff'
                );

                if (!preferenceCheck.allowed) {
                    console.log(`⏭️ [Incomplete Profile] Skipped for ${staff.email} - ${preferenceCheck.reason}`);
                    await logNotificationSkipped(supabase, {
                        recipientEmail: staff.email,
                        recipientType: 'staff',
                        staffId: staff.id,
                        agencyId: agency.id,
                        notificationType: 'system_update',
                        channel: 'email',
                        preferenceChecked: preferenceCheck.preferenceChecked,
                        preferenceStatus: preferenceCheck.preferenceStatus,
                        skippedReason: preferenceCheck.reason,
                        metadata: { days_since_creation: daysSinceCreation, progress: progress.percentage }
                    });
                    continue;
                }

                let emailResult;
                // Send appropriate reminder
                if (daysSinceCreation === 1) {
                    emailResult = await sendDay1Reminder(supabase, staff, agency, progress);
                    remindersSent++;
                } else if (daysSinceCreation === 3) {
                    emailResult = await sendDay3Reminder(supabase, staff, agency, progress);
                    remindersSent++;
                } else if (daysSinceCreation === 7) {
                    emailResult = await sendDay7Reminder(supabase, staff, agency, progress);
                    remindersSent++;
                } else if (daysSinceCreation === 14) {
                    emailResult = await sendDay14Reminder(supabase, staff, agency, progress);
                    await escalateToAdmin(supabase, staff, agency, progress);
                    remindersSent++;
                    escalationsSent++;
                }

                // Log success
                await logNotificationSent(supabase, {
                    recipientEmail: staff.email,
                    recipientType: 'staff',
                    staffId: staff.id,
                    agencyId: agency.id,
                    notificationType: 'system_update',
                    channel: 'email',
                    provider: 'resend',
                    providerMessageId: emailResult?.data?.id,
                    preferenceChecked: preferenceCheck.preferenceChecked,
                    preferenceStatus: preferenceCheck.preferenceStatus,
                    metadata: { days_since_creation: daysSinceCreation, progress: progress.percentage }
                });

            } catch (sendError: any) {
                console.error(`❌ Error sending reminder to staff ${staff.id}:`, sendError.message);
                
                // Log failure
                await logNotificationFailed(supabase, {
                    recipientEmail: staff.email,
                    recipientType: 'staff',
                    staffId: staff.id,
                    agencyId: agency.id,
                    notificationType: 'system_update',
                    channel: 'email',
                    errorMessage: sendError.message,
                    errorCode: 'send_failed'
                });

                // Schedule retry
                await scheduleRetry(supabase, {
                    notificationType: 'system_update',
                    recipientEmail: staff.email,
                    recipientId: staff.id,
                    agencyId: agency.id,
                    channel: 'email',
                    metadata: { staffId: staff.id, daysSinceCreation } // Pass necessary data for retry
                });
            }
        }

        console.log(`✅ [Incomplete Profile Reminder] Complete: ${remindersSent} reminders, ${escalationsSent} escalations`);

        return new Response(
            JSON.stringify({
                success: true,
                reminders_sent: remindersSent,
                escalations_sent: escalationsSent,
                staff_checked: onboardingStaff.length
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error('❌ [Incomplete Profile Reminder] Error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});

/**
 * Calculate onboarding progress
 */
function calculateOnboardingProgress(staff, compliance) {
    let completed = 0;
    let total = 10;

    if (staff.profile_photo_url) completed++;
    if (staff.references && staff.references.length >= 2) completed++;
    if (staff.employment_history && staff.employment_history.length > 0) completed++;
    if (staff.occupational_health?.cleared_to_work) completed++;
    if (staff.date_of_birth) completed++;
    if (staff.address?.postcode) completed++;
    if (staff.emergency_contact?.phone) completed++;

    const dbsCheck = compliance.find(c => c.document_type === 'dbs_check');
    if (dbsCheck) completed++;

    const rightToWork = compliance.find(c => c.document_type === 'right_to_work');
    if (rightToWork) completed++;

    const trainingCount = compliance.filter(c => c.document_type === 'training_certificate').length;
    if (trainingCount >= 3) completed++;

    return {
        percentage: Math.round((completed / total) * 100),
        completed,
        total,
        missingItems: getMissingItems(staff, compliance)
    };
}

/**
 * Get list of missing items
 */
function getMissingItems(staff, compliance) {
    const missing = [];

    if (!staff.profile_photo_url) missing.push('Profile Photo (CRITICAL)');
    if (!staff.references || staff.references.length < 2) missing.push('2 Written References');
    if (!staff.employment_history || staff.employment_history.length === 0) missing.push('Employment History');
    if (!staff.occupational_health?.cleared_to_work) missing.push('Occupational Health Clearance');

    const dbsCheck = compliance.find(c => c.document_type === 'dbs_check');
    if (!dbsCheck) missing.push('DBS Certificate');

    const rightToWork = compliance.find(c => c.document_type === 'right_to_work');
    if (!rightToWork) missing.push('Right to Work Document');

    const trainingCount = compliance.filter(c => c.document_type === 'training_certificate').length;
    if (trainingCount < 3) missing.push(`Mandatory Training (${trainingCount}/10 complete)`);

    if (!staff.date_of_birth) missing.push('Date of Birth');
    if (!staff.address?.postcode) missing.push('Full Address');
    if (!staff.emergency_contact?.phone) missing.push('Emergency Contact');

    return missing;
}

/**
 * Day 1: Gentle welcome + reminder
 */
async function sendDay1Reminder(supabase, staff, agency, progress) {
    const setupUrl = `${Deno.env.get('APP_URL') || 'https://app.base44.com'}/ProfileSetup`;

    await supabase.functions.invoke('send-email', {
        body: {
            to: staff.email,
            subject: `👋 Welcome to ${agency.name} - Complete Your Profile`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <div style="background-color: #0284c7; padding: 30px; text-align: center;" bgcolor="#0284c7">
                        <h1 style="color: #ffffff; margin: 0; font-weight: bold;">Welcome Aboard!</h1>
                    </div>
                    <div style="padding: 30px; background-color: #f9fafb;" bgcolor="#f9fafb">
                        <p style="font-size: 16px; color: #1f2937;">Hi ${staff.first_name},</p>
                        <p style="font-size: 16px; color: #1f2937;">
                            Welcome to ${agency.name}! We're excited to have you on the team.
                        </p>

                        <div style="background-color: #ffffff; border-left: 4px solid #0284c7; padding: 20px; margin: 20px 0;" bgcolor="#ffffff">
                            <p style="margin: 0;"><strong>Your Profile Progress:</strong></p>
                            <div style="background-color: #e5e7eb; height: 20px; border-radius: 10px; margin: 10px 0;" bgcolor="#e5e7eb">
                                <div style="background-color: #0284c7; height: 20px; border-radius: 10px; width: ${progress.percentage}%;" bgcolor="#0284c7"></div>
                            </div>
                            <p style="margin: 10px 0 0 0; color: #6b7280;">${progress.percentage}% Complete</p>
                        </div>

                        <p style="font-size: 16px; color: #1f2937;">
                            Complete your profile today to start accepting shifts!
                        </p>

                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                            <tr>
                                <td align="center">
                                    <table border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td style="background-color: #0284c7; border-radius: 8px;" bgcolor="#0284c7">
                                                <a href="${setupUrl}" style="display: inline-block; padding: 15px 40px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; font-family: Arial, sans-serif;">
                                                    Complete My Profile
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            `
        }
    });
}

/**
 * Day 3: Second reminder with checklist
 */
async function sendDay3Reminder(supabase, staff, agency, progress) {
    const setupUrl = `${Deno.env.get('APP_URL') || 'https://app.base44.com'}/ProfileSetup`;

    const missingItemsHtml = progress.missingItems
        .map(item => `<li style="margin: 5px 0;">${item}</li>`)
        .join('');

    await supabase.functions.invoke('send-email', {
        body: {
            to: staff.email,
            subject: `⏰ Reminder: Complete Your ${agency.name} Profile`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <div style="background-color: #d97706; padding: 30px; text-align: center;" bgcolor="#d97706">
                        <h1 style="color: #ffffff; margin: 0; font-weight: bold;">Profile Incomplete</h1>
                    </div>
                    <div style="padding: 30px; background-color: #f9fafb;" bgcolor="#f9fafb">
                        <p style="font-size: 16px; color: #1f2937;">Hi ${staff.first_name},</p>
                        <p style="font-size: 16px; color: #1f2937;">
                            We noticed you haven't finished setting up your profile yet. You're ${progress.percentage}% complete!
                        </p>

                        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;" bgcolor="#fef3c7">
                            <p style="margin: 0 0 10px 0; font-weight: bold; color: #92400e;">Still Missing:</p>
                            <ul style="margin: 0; padding-left: 20px; color: #92400e;">
                                ${missingItemsHtml}
                            </ul>
                        </div>

                        <p style="font-size: 16px; color: #1f2937;">
                            ⚠️ You cannot accept shifts until your profile is 100% complete.
                        </p>

                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                            <tr>
                                <td align="center">
                                    <table border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td style="background-color: #d97706; border-radius: 8px;" bgcolor="#d97706">
                                                <a href="${setupUrl}" style="display: inline-block; padding: 15px 40px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; font-family: Arial, sans-serif;">
                                                    Complete Now
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            `
        }
    });
}

/**
 * Day 7: Urgent reminder
 */
async function sendDay7Reminder(supabase, staff, agency, progress) {
    const setupUrl = `${Deno.env.get('APP_URL') || 'https://app.base44.com'}/ProfileSetup`;

    await supabase.functions.invoke('send-email', {
        body: {
            to: staff.email,
            subject: `🚨 URGENT: Complete Your Profile to Start Working`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <div style="background-color: #dc2626; padding: 30px; text-align: center;" bgcolor="#dc2626">
                        <h1 style="color: #ffffff; margin: 0; font-weight: bold;">⚠️ Action Required</h1>
                    </div>
                    <div style="padding: 30px; background-color: #f9fafb;" bgcolor="#f9fafb">
                        <p style="font-size: 16px; color: #1f2937;">Hi ${staff.first_name},</p>
                        <p style="font-size: 16px; color: #1f2937;">
                            Your profile has been incomplete for 7 days. Without a complete profile, you cannot:
                        </p>

                        <ul style="color: #1f2937; line-height: 1.8;">
                            <li>Accept shifts from the marketplace</li>
                            <li>Be assigned to client bookings</li>
                            <li>Start earning with ${agency.name}</li>
                        </ul>

                        <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;" bgcolor="#fee2e2">
                            <p style="margin: 0; font-weight: bold; color: #7f1d1d;">
                                🚨 Complete your profile within 7 days or your invitation may expire.
                            </p>
                        </div>

                        <p style="font-size: 14px; color: #6b7280;">
                            Need help? Contact ${agency.contact_email || 'your agency administrator'}.
                        </p>

                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                            <tr>
                                <td align="center">
                                    <table border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td style="background-color: #dc2626; border-radius: 8px;" bgcolor="#dc2626">
                                                <a href="${setupUrl}" style="display: inline-block; padding: 15px 40px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; font-family: Arial, sans-serif;">
                                                    Complete Profile Now
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            `
        }
    });
}

/**
 * Day 14: Final reminder
 */
async function sendDay14Reminder(supabase, staff, agency, progress) {
    const setupUrl = `${Deno.env.get('APP_URL') || 'https://app.base44.com'}/ProfileSetup`;

    await supabase.functions.invoke('send-email', {
        body: {
            to: staff.email,
            subject: `⏰ FINAL REMINDER: Complete Your Profile Today`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <div style="background-color: #92400e; padding: 30px; text-align: center;" bgcolor="#92400e">
                        <h1 style="color: #ffffff; margin: 0; font-weight: bold;">Final Reminder</h1>
                    </div>
                    <div style="padding: 30px; background-color: #f9fafb;" bgcolor="#f9fafb">
                        <p style="font-size: 16px; color: #1f2937;">Hi ${staff.first_name},</p>
                        <p style="font-size: 16px; color: #1f2937;">
                            Your profile has been incomplete for 14 days. This is your final reminder.
                        </p>

                        <div style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 20px; margin: 20px 0;" bgcolor="#fef3c7">
                            <p style="margin: 0; font-weight: bold; color: #78350f;">
                                ⚠️ Your invitation will expire soon. We've notified ${agency.name} administration.
                            </p>
                        </div>

                        <p style="font-size: 16px; color: #1f2937;">
                            If you're experiencing difficulties, please contact us immediately at ${agency.contact_email || 'support'}.
                        </p>

                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                            <tr>
                                <td align="center">
                                    <table border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td style="background-color: #92400e; border-radius: 8px;" bgcolor="#92400e">
                                                <a href="${setupUrl}" style="display: inline-block; padding: 15px 40px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; font-family: Arial, sans-serif;">
                                                    Complete Profile Immediately
                                                </a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>
            `
        }
    });
}

/**
 * Day 14: Escalate to admin
 */
async function escalateToAdmin(supabase, staff, agency, progress) {
    if (!agency.contact_email) return;

    const missingItemsHtml = progress.missingItems
        .map(item => `<li>${item}</li>`)
        .join('');

    await supabase.functions.invoke('send-email', {
        body: {
            to: agency.contact_email,
            subject: `⚠️ Incomplete Profile Alert: ${staff.first_name} ${staff.last_name}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Incomplete Profile - 14 Days</h2>
                    <p><strong>Staff Member:</strong> ${staff.first_name} ${staff.last_name}</p>
                    <p><strong>Email:</strong> ${staff.email}</p>
                    <p><strong>Progress:</strong> ${progress.percentage}%</p>

                    <p><strong>Missing Items:</strong></p>
                    <ul>${missingItemsHtml}</ul>

                    <p>This staff member has not completed their profile after 14 days. Please contact them to provide assistance or remove their invitation.</p>
                </div>
            `
        }
    });

    // Create admin workflow
    await supabase
        .from("admin_workflows")
        .insert({
            agency_id: agency.id,
            type: 'missing_staff_information',
            priority: 'high',
            status: 'pending',
            title: `Incomplete Profile: ${staff.first_name} ${staff.last_name}`,
            description: `Staff member has not completed onboarding after 14 days.\n\nMissing: ${progress.missingItems.join(', ')}`,
            related_entity: {
                entity_type: 'staff',
                entity_id: staff.id
            },
            auto_created: true,
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });
}
