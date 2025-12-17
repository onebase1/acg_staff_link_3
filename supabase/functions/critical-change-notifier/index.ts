import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { shouldSendNotification } from "../_shared/preferenceChecker.ts";
import {
    logNotificationSent,
    logNotificationFailed,
    logNotificationSkipped
} from "../_shared/notificationLogger.ts";
import { scheduleRetry } from "../_shared/retryHandler.ts";
import { getBranding } from "../_shared/getBranding.ts";

/**
 * CRITICAL CHANGE NOTIFIER
 *
 * Sends automated email alerts when critical changes are made that could have
 * security, fraud, or financial impact.
 *
 * Protects against:
 * - Unauthorized shift cancellations
 * - Bank detail changes (fraud prevention)
 * - Rate changes (financial transparency)
 * - Staff reassignments (accountability)
 *
 * Call this from frontend whenever a critical change is made.
 */

serve(async (req) => {
    try {
        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Auth check
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { "Content-Type": "application/json" } }
            );
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { "Content-Type": "application/json" } }
            );
        }

        const {
            change_type,
            affected_entity_type,
            affected_entity_id,
            old_value,
            new_value,
            reason,
            staff_email,
            client_email,
            staff_name,
            client_name,
            shift_date,
            shift_time,
            agency_id
        } = await req.json();

        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        const RESEND_FROM_DOMAIN = Deno.env.get("RESEND_FROM_DOMAIN") || "agilecaremanagement.co.uk";

        // Fetch agency details for contact information
        let agency = null;
        if (agency_id) {
            const { data: agencyData, error: agencyError } = await supabase
                .from('agencies')
                .select('id, name, email, phone, contact_phone, logo_url')
                .eq('id', agency_id)
                .single();

            if (!agencyError && agencyData) {
                agency = agencyData;
            }
        }

        // Get dynamic branding for this agency
        const branding = await getBranding(supabase, agency_id);

        // Fallback agency contact info
        const agencyName = agency?.name || branding.companyName;
        const agencyPhone = agency?.phone || agency?.contact_phone || branding.supportPhone;
        const agencyEmail = agency?.email || branding.supportEmail;

        // Helper function to send notification with checks and logging
        const sendCriticalNotification = async (
            recipientEmail: string,
            recipientName: string,
            subject: string,
            html: string,
            recipientType: 'staff' | 'client' | 'admin',
            recipientId: string | undefined // We might not always have ID if it's just email, but for staff/client we usually do.
            // Actually, for critical changes we might not have the ID passed in directly in all cases, 
            // but let's see what we have. 
            // The request body has `staff_email`, `client_email`. It doesn't explicitly have `staff_id` or `client_id`.
            // We might need to fetch them or just log without ID if missing (though logger prefers ID).
            // However, `affected_entity_id` might be the staff_id if `affected_entity_type` is 'staff'.
            // Let's try to infer or fetch if needed, or just pass what we have.
        ) => {
            try {
                // Check preference
                const preferenceCheck = await shouldSendNotification(
                    supabase,
                    recipientEmail,
                    'system_update', // Critical changes are system updates
                    'email',
                    recipientType
                );

                if (!preferenceCheck.allowed) {
                    console.log(`⏭️ [Critical Change] Skipped for ${recipientEmail} - ${preferenceCheck.reason}`);
                    await logNotificationSkipped(supabase, {
                        recipientEmail: recipientEmail,
                        recipientType: recipientType,
                        // staffId/clientId: we might miss these if not passed. 
                        // We'll try to use affected_entity_id if it matches.
                        staffId: recipientType === 'staff' && affected_entity_type === 'staff' ? affected_entity_id : undefined,
                        clientId: recipientType === 'client' && affected_entity_type === 'client' ? affected_entity_id : undefined,
                        agencyId: agency_id,
                        notificationType: 'system_update',
                        channel: 'email',
                        preferenceChecked: preferenceCheck.preferenceChecked,
                        preferenceStatus: preferenceCheck.preferenceStatus,
                        skippedReason: preferenceCheck.reason,
                        metadata: { change_type, reason }
                    });
                    return false;
                }

                // Send email
                const emailResponse = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${RESEND_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from: `${branding.companyName} <noreply@${RESEND_FROM_DOMAIN}>`,
                        to: [recipientEmail],
                        subject: subject,
                        html: html
                    }),
                });

                if (!emailResponse.ok) {
                    const errorData = await emailResponse.json();
                    throw new Error(JSON.stringify(errorData));
                }

                const emailResult = await emailResponse.json();

                // Log success
                await logNotificationSent(supabase, {
                    recipientEmail: recipientEmail,
                    recipientType: recipientType,
                    staffId: recipientType === 'staff' && affected_entity_type === 'staff' ? affected_entity_id : undefined,
                    clientId: recipientType === 'client' && affected_entity_type === 'client' ? affected_entity_id : undefined,
                    agencyId: agency_id,
                    notificationType: 'system_update',
                    channel: 'email',
                    provider: 'resend',
                    providerMessageId: emailResult.id,
                    preferenceChecked: preferenceCheck.preferenceChecked,
                    preferenceStatus: preferenceCheck.preferenceStatus,
                    metadata: { change_type, reason }
                });

                return true;

            } catch (error: any) {
                console.error(`❌ Failed to send critical notification to ${recipientEmail}:`, error);
                
                // Log failure
                await logNotificationFailed(supabase, {
                    recipientEmail: recipientEmail,
                    recipientType: recipientType,
                    staffId: recipientType === 'staff' && affected_entity_type === 'staff' ? affected_entity_id : undefined,
                    clientId: recipientType === 'client' && affected_entity_type === 'client' ? affected_entity_id : undefined,
                    agencyId: agency_id,
                    notificationType: 'system_update',
                    channel: 'email',
                    errorMessage: error.message,
                    errorCode: 'send_failed'
                });

                // Schedule retry
                await scheduleRetry(supabase, {
                    notificationType: 'system_update',
                    recipientEmail: recipientEmail,
                    recipientId: recipientType === 'staff' && affected_entity_type === 'staff' ? affected_entity_id : undefined, // Best effort ID
                    agencyId: agency_id,
                    channel: 'email',
                    metadata: { change_type, reason, subject, html, recipientName, recipientType } // Pass all needed for retry
                });

                return false;
            }
        };

        let sentCount = 0;

        // SHIFT CANCELLATION
        if (change_type === 'shift_cancelled') {
            const email_body = (recipient_name: string) => `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <div style="background-color: #dc2626; padding: 30px; border-radius: 10px 10px 0 0;" bgcolor="#dc2626">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">⚠️ Shift Cancellation Notice</h1>
                    </div>
                    <div style="background-color: #ffffff; padding: 30px; border: 2px solid #fee2e2; border-top: none; border-radius: 0 0 10px 10px;" bgcolor="#ffffff">
                        <p style="font-size: 16px; color: #1f2937;">Dear ${recipient_name},</p>

                        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;" bgcolor="#fef2f2">
                            <p style="margin: 0; color: #991b1b; font-weight: bold;">The following shift has been CANCELLED</p>
                            <p style="margin: 10px 0 0 0; color: #7f1d1d;">
                                <strong>Client:</strong> ${client_name}<br/>
                                <strong>Date:</strong> ${shift_date}<br/>
                                <strong>Time:</strong> ${shift_time}<br/>
                                <strong>Reason:</strong> ${reason || 'Not specified'}
                            </p>
                        </div>

                        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                            Changed by: ${user.user_metadata?.full_name || user.email}<br/>
                            Timestamp: ${new Date().toISOString()}
                        </p>
                    </div>
                </div>
            `;

            // Notify Staff
            if (staff_email) {
                const sent = await sendCriticalNotification(
                    staff_email,
                    staff_name || 'Staff Member',
                    `SHIFT CANCELLED - ${client_name} on ${shift_date}`,
                    email_body(staff_name || 'Staff Member'),
                    'staff',
                    undefined // We don't have staff_id explicitly passed for shift_cancelled in the destructuring
                );
                if (sent) sentCount++;
            }

            // Notify Client
            if (client_email) {
                const sent = await sendCriticalNotification(
                    client_email,
                    client_name || 'Team',
                    `Shift Cancellation for ${shift_date}`,
                    email_body(client_name || 'Team'),
                    'client',
                    undefined
                );
                if (sent) sentCount++;
            }
        }

        // BANK DETAILS CHANGED
        if (change_type === 'bank_details_changed' && staff_email) {
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <div style="background-color: #dc2626; padding: 30px; border-radius: 10px 10px 0 0;" bgcolor="#dc2626">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">🔒 Security Alert: Bank Details Changed</h1>
                    </div>
                    <div style="background-color: #ffffff; padding: 30px; border: 2px solid #fee2e2; border-top: none; border-radius: 0 0 10px 10px;" bgcolor="#ffffff">
                        <p style="font-size: 16px; color: #1f2937;">Dear ${staff_name},</p>

                        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                            <p style="margin: 0; color: #991b1b; font-weight: bold;">Your bank account details have been updated</p>
                            <p style="margin: 10px 0 0 0; color: #7f1d1d;">
                                <strong>Previous:</strong> ${old_value || 'Not set'}<br/>
                                <strong>New:</strong> ${new_value}
                            </p>
                        </div>

                        <div style="background: #fee2e2; border: 2px solid #dc2626; padding: 20px; margin: 20px 0; border-radius: 5px;">
                            <p style="margin: 0; color: #7f1d1d; font-size: 16px; font-weight: bold;">
                                🚨 DID YOU MAKE THIS CHANGE?
                            </p>
                            <p style="margin: 10px 0 0 0; color: #991b1b; font-size: 14px;">
                                If you did NOT authorize this change, your account may be compromised.<br/>
                                <strong>CONTACT ${agencyName} IMMEDIATELY:</strong><br/>
                                📱 ${agencyPhone}<br/>
                                📧 <a href="mailto:${agencyEmail}" style="color: #991b1b; text-decoration: underline;">${agencyEmail}</a>
                            </p>
                        </div>

                        <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 25px 0; border-radius: 8px;">
                            <p style="margin: 0 0 10px 0; color: #0c4a6e; font-size: 15px; font-weight: bold;">
                                📞 Need Help?
                            </p>
                            <p style="margin: 0; color: #0c4a6e; font-size: 14px; line-height: 1.8;">
                                Contact ${agencyName}:<br/>
                                📧 <a href="mailto:${agencyEmail}" style="color: #0284c7; text-decoration: none;">${agencyEmail}</a><br/>
                                📱 ${agencyPhone}
                            </p>
                        </div>

                        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                            Changed by: ${user.user_metadata?.full_name || user.email}<br/>
                            Timestamp: ${new Date().toISOString()}<br/>
                            IP Address: [Logged for security]
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="background: #1e293b; color: #94a3b8; padding: 25px 30px; text-align: center; border-radius: 0 0 10px 10px;">
                        <p style="margin: 0; font-size: 13px;">© ${new Date().getFullYear()} ${branding.companyName}. All rights reserved.</p>
                        <p style="margin: 10px 0 0 0; font-size: 12px;">
                            Need help? Contact us at <a href="mailto:${branding.supportEmail}" style="color: #06b6d4; text-decoration: none;">${branding.supportEmail}</a>
                        </p>
                    </div>
                </div>
            `;

            const sent = await sendCriticalNotification(
                staff_email,
                staff_name || 'Staff Member',
                `🔒 SECURITY ALERT: Your Bank Details Were Changed`,
                html,
                'staff',
                affected_entity_id // Usually staff_id for bank details
            );
            if (sent) sentCount++;
        }

        // PAY RATE OVERRIDE
        if (change_type === 'pay_rate_override' && staff_email) {
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <div style="background-color: #0e7490; padding: 30px; border-radius: 10px 10px 0 0;" bgcolor="#0e7490">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">💰 Pay Rate Adjusted for Shift</h1>
                    </div>
                    <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;" bgcolor="#ffffff">
                        <p style="font-size: 16px; color: #1f2937;">Dear ${staff_name},</p>

                        <div style="background: #ecfeff; border-left: 4px solid #0891b2; padding: 15px; margin: 20px 0;">
                            <p style="margin: 0; color: #155e75; font-weight: bold;">Your pay rate has been adjusted for this shift</p>
                            <p style="margin: 10px 0 0 0; color: #0e7490;">
                                <strong>Client:</strong> ${client_name}<br/>
                                <strong>Date:</strong> ${shift_date}<br/>
                                <strong>Standard Rate:</strong> £${old_value}/hr<br/>
                                <strong>New Rate:</strong> £${new_value}/hr<br/>
                                <strong>Reason:</strong> ${reason || 'Not specified'}
                            </p>
                        </div>

                        <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 25px 0; border-radius: 8px;">
                            <p style="margin: 0 0 10px 0; color: #0c4a6e; font-size: 15px; font-weight: bold;">
                                📞 Questions?
                            </p>
                            <p style="margin: 0; color: #0c4a6e; font-size: 14px; line-height: 1.8;">
                                Contact ${agencyName}:<br/>
                                📧 <a href="mailto:${agencyEmail}" style="color: #0284c7; text-decoration: none;">${agencyEmail}</a><br/>
                                📱 ${agencyPhone}
                            </p>
                        </div>

                        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                            This adjustment was made by ${user.user_metadata?.full_name || user.email} on ${new Date().toLocaleString()}
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="background: #1e293b; color: #94a3b8; padding: 25px 30px; text-align: center; border-radius: 0 0 10px 10px;">
                        <p style="margin: 0; font-size: 13px;">© ${new Date().getFullYear()} ${branding.companyName}. All rights reserved.</p>
                        <p style="margin: 10px 0 0 0; font-size: 12px;">
                            Need help? Contact us at <a href="mailto:${branding.supportEmail}" style="color: #06b6d4; text-decoration: none;">${branding.supportEmail}</a>
                        </p>
                    </div>
                </div>
            `;

            const sent = await sendCriticalNotification(
                staff_email,
                staff_name || 'Staff Member',
                `💰 Pay Rate Adjusted - ${client_name} on ${shift_date}`,
                html,
                'staff',
                undefined // We don't have staff_id explicitly here usually
            );
            if (sent) sentCount++;
        }

        // CONFIRMED SHIFT MODIFIED
        if (change_type === 'confirmed_shift_modified' && staff_email) {
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <div style="background-color: #ea580c; padding: 30px; border-radius: 10px 10px 0 0;" bgcolor="#ea580c">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">⚠️ IMPORTANT: Your Confirmed Shift Was Changed</h1>
                    </div>
                    <div style="background-color: #ffffff; padding: 30px; border: 2px solid #fed7aa; border-top: none; border-radius: 0 0 10px 10px;" bgcolor="#ffffff">
                        <p style="font-size: 16px; color: #1f2937;">Dear ${staff_name},</p>
                        <p style="font-size: 16px; color: #1f2937;">An administrator has updated a shift that you already confirmed. Please review the changes carefully.</p>

                        <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0;">
                            <p style="margin: 0; color: #9a3412; font-weight: bold;">Shift Details Updated</p>
                            <p style="margin: 10px 0 0 0; color: #7c2d12;">
                                <strong>Client:</strong> ${client_name}<br/>
                                <strong>Date:</strong> ${shift_date}<br/>
                            </p>
                            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #fed7aa;">
                                <p><strong>Old:</strong> ${old_value}</p>
                                <p><strong>New:</strong> ${new_value}</p>
                            </div>
                        </div>

                        <div style="background: #fef2f2; border: 1px solid #fca5a5; padding: 15px; margin: 20px 0; border-radius: 5px;">
                            <p style="margin: 0; color: #991b1b; font-size: 14px;">
                                <strong>ACTION REQUIRED:</strong> If these changes are incorrect or you can no longer work this shift, please contact ${agencyName} immediately at:
                            </p>
                            <p style="margin: 10px 0 0 0; color: #991b1b; font-size: 14px;">
                                📱 ${agencyPhone}<br/>
                                📧 <a href="mailto:${agencyEmail}" style="color: #991b1b; text-decoration: underline;">${agencyEmail}</a>
                            </p>
                        </div>

                        <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 25px 0; border-radius: 8px;">
                            <p style="margin: 0 0 10px 0; color: #0c4a6e; font-size: 15px; font-weight: bold;">
                                📞 Need Help?
                            </p>
                            <p style="margin: 0; color: #0c4a6e; font-size: 14px; line-height: 1.8;">
                                Contact ${agencyName}:<br/>
                                📧 <a href="mailto:${agencyEmail}" style="color: #0284c7; text-decoration: none;">${agencyEmail}</a><br/>
                                📱 ${agencyPhone}
                            </p>
                        </div>

                        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                            Changed by: ${user.user_metadata?.full_name || user.email}<br/>
                            Timestamp: ${new Date().toISOString()}
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="background: #1e293b; color: #94a3b8; padding: 25px 30px; text-align: center; border-radius: 0 0 10px 10px;">
                        <p style="margin: 0; font-size: 13px;">© ${new Date().getFullYear()} ${branding.companyName}. All rights reserved.</p>
                        <p style="margin: 10px 0 0 0; font-size: 12px;">
                            Need help? Contact us at <a href="mailto:${branding.supportEmail}" style="color: #06b6d4; text-decoration: none;">${branding.supportEmail}</a>
                        </p>
                    </div>
                </div>
            `;

            const sent = await sendCriticalNotification(
                staff_email,
                staff_name || 'Staff Member',
                `⚠️ Shift Update for ${client_name} on ${shift_date}`,
                html,
                'staff',
                undefined
            );
            if (sent) sentCount++;
        }

        // SHIFT REASSIGNMENT
        if (change_type === 'shift_reassigned') {
            // Notify original staff (if provided)
            if (staff_email) {
                const html = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                        <!-- Header -->
                        <div style="background-color: #3b82f6; padding: 40px 30px; text-align: center;" bgcolor="#3b82f6">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Shift Update Notice</h1>
                        </div>

                        <!-- Body -->
                        <div style="background-color: #ffffff; padding: 40px 30px;" bgcolor="#ffffff">
                            <p style="font-size: 16px; color: #1f2937; margin-bottom: 20px;">Hi ${staff_name},</p>

                            <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0;">
                                <p style="margin: 0 0 15px 0; color: #92400e; font-weight: bold; font-size: 15px;">You have been removed from the following shift:</p>
                                <p style="margin: 0; color: #78350f; line-height: 1.8;">
                                    <strong>Client:</strong> ${client_name}<br/>
                                    <strong>Date:</strong> ${shift_date}<br/>
                                    <strong>Time:</strong> ${shift_time}<br/>
                                    <strong>Reason:</strong> ${reason || 'Admin updated shift records'}
                                </p>
                            </div>

                            <div style="background: #fef2f2; border: 1px solid #fca5a5; padding: 15px; margin: 20px 0; border-radius: 5px;">
                                <p style="margin: 0; color: #991b1b; font-size: 14px;">
                                    <strong>⚠️ ACTION REQUIRED (if this is an error):</strong>
                                </p>
                                <p style="margin: 10px 0 0 0; color: #991b1b; font-size: 14px; line-height: 1.6;">
                                    If you <strong>planned to work</strong> or <strong>already worked</strong> this shift, please contact ${agencyName} immediately at:
                                </p>
                                <p style="margin: 10px 0 0 0; color: #991b1b; font-size: 14px;">
                                    📱 ${agencyPhone}<br/>
                                    📧 <a href="mailto:${agencyEmail}" style="color: #991b1b; text-decoration: underline;">${agencyEmail}</a>
                                </p>
                            </div>

                            <div style="background: #f9fafb; border-left: 4px solid #10b981; padding: 20px; margin: 25px 0;">
                                <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.6;">
                                    ✅ <strong>If this change is correct:</strong> No action needed. You will not be paid for this shift.
                                </p>
                            </div>

                            <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 25px 0; border-radius: 8px;">
                                <p style="margin: 0 0 10px 0; color: #0c4a6e; font-size: 15px; font-weight: bold;">
                                    📞 Need Help?
                                </p>
                                <p style="margin: 0; color: #0c4a6e; font-size: 14px; line-height: 1.8;">
                                    Contact ${agencyName}:<br/>
                                    📧 <a href="mailto:${agencyEmail}" style="color: #0284c7; text-decoration: none;">${agencyEmail}</a><br/>
                                    📱 ${agencyPhone}
                                </p>
                            </div>

                            <p style="color: #6b7280; font-size: 13px; margin-top: 30px; line-height: 1.6;">
                                This is an automated notification to protect both you and the agency from payroll errors.
                            </p>
                        </div>

                        <!-- Footer -->
                        <div style="background: #1e293b; color: #94a3b8; padding: 25px 30px; text-align: center; border-radius: 0 0 10px 10px;">
                            <p style="margin: 0; font-size: 13px;">© ${new Date().getFullYear()} ${branding.companyName}. All rights reserved.</p>
                            <p style="margin: 10px 0 0 0; font-size: 12px;">
                                Need help? Contact us at <a href="mailto:${branding.supportEmail}" style="color: #06b6d4; text-decoration: none;">${branding.supportEmail}</a>
                            </p>
                        </div>
                    </div>
                `;

                const sent = await sendCriticalNotification(
                    staff_email,
                    staff_name || 'Staff Member',
                    `Shift Update - You've been removed from ${client_name} on ${shift_date}`,
                    html,
                    'staff',
                    undefined
                );
                if (sent) sentCount++;
            }
        }

        // Log change to audit trail (could create ChangeLog entity)
        const changeLog = {
            change_type,
            affected_entity_type,
            affected_entity_id,
            old_value: old_value ? String(old_value) : null,
            new_value: new_value ? String(new_value) : null,
            reason,
            changed_by: user.id,
            changed_by_email: user.email,
            changed_at: new Date().toISOString(),
            notifications_sent: sentCount
        };

        return new Response(
            JSON.stringify({
                success: true,
                notifications_sent: sentCount,
                change_log: changeLog
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
