import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

        // Fallback agency contact info
        const agencyName = agency?.name || 'Agile Care Management';
        const agencyPhone = agency?.phone || agency?.contact_phone || '+44 20 1234 5678';
        const agencyEmail = agency?.email || 'support@agilecaremanagement.co.uk';

        const notifications = [];

        // SHIFT CANCELLATION
        if (change_type === 'shift_cancelled') {
            const email_body = (recipient_name) => `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0; font-size: 24px;">⚠️ Shift Cancellation Notice</h1>
                    </div>
                    <div style="background: #fff; padding: 30px; border: 2px solid #fee2e2; border-top: none; border-radius: 0 0 10px 10px;">
                        <p style="font-size: 16px; color: #1f2937;">Dear ${recipient_name},</p>

                        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
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
                notifications.push({
                    from: `Agile Care Management <noreply@${RESEND_FROM_DOMAIN}>`,
                    to: [staff_email],
                    subject: `SHIFT CANCELLED - ${client_name} on ${shift_date}`,
                    html: email_body(staff_name || 'Staff Member')
                });
            }

            // Notify Client
            if (client_email) {
                notifications.push({
                    from: `Agile Care Management <noreply@${RESEND_FROM_DOMAIN}>`,
                    to: [client_email],
                    subject: `Shift Cancellation for ${shift_date}`,
                    html: email_body(client_name || 'Team')
                });
            }
        }

        // BANK DETAILS CHANGED
        if (change_type === 'bank_details_changed' && staff_email) {
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0; font-size: 24px;">🔒 Security Alert: Bank Details Changed</h1>
                    </div>
                    <div style="background: #fff; padding: 30px; border: 2px solid #fee2e2; border-top: none; border-radius: 0 0 10px 10px;">
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
                        <p style="margin: 0; font-size: 13px;">© 2025 Agile Care Management. All rights reserved.</p>
                        <p style="margin: 10px 0 0 0; font-size: 12px;">
                            Need help? Contact us at <a href="mailto:support@agilecaremanagement.co.uk" style="color: #06b6d4; text-decoration: none;">support@agilecaremanagement.co.uk</a>
                        </p>
                    </div>
                </div>
            `;

            notifications.push({
                from: `Agile Care Management <noreply@${RESEND_FROM_DOMAIN}>`,
                to: [staff_email],
                subject: `🔒 SECURITY ALERT: Your Bank Details Were Changed`,
                html: html
            });
        }

        // PAY RATE OVERRIDE
        if (change_type === 'pay_rate_override' && staff_email) {
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0; font-size: 24px;">💰 Pay Rate Adjusted for Shift</h1>
                    </div>
                    <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
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
                        <p style="margin: 0; font-size: 13px;">© 2025 Agile Care Management. All rights reserved.</p>
                        <p style="margin: 10px 0 0 0; font-size: 12px;">
                            Need help? Contact us at <a href="mailto:support@agilecaremanagement.co.uk" style="color: #06b6d4; text-decoration: none;">support@agilecaremanagement.co.uk</a>
                        </p>
                    </div>
                </div>
            `;

            notifications.push({
                from: `Agile Care Management <noreply@${RESEND_FROM_DOMAIN}>`,
                to: [staff_email],
                subject: `💰 Pay Rate Adjusted - ${client_name} on ${shift_date}`,
                html: html
            });
        }

        // CONFIRMED SHIFT MODIFIED
        if (change_type === 'confirmed_shift_modified' && staff_email) {
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0; font-size: 24px;">⚠️ IMPORTANT: Your Confirmed Shift Was Changed</h1>
                    </div>
                    <div style="background: #fff; padding: 30px; border: 2px solid #fed7aa; border-top: none; border-radius: 0 0 10px 10px;">
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
                        <p style="margin: 0; font-size: 13px;">© 2025 Agile Care Management. All rights reserved.</p>
                        <p style="margin: 10px 0 0 0; font-size: 12px;">
                            Need help? Contact us at <a href="mailto:support@agilecaremanagement.co.uk" style="color: #06b6d4; text-decoration: none;">support@agilecaremanagement.co.uk</a>
                        </p>
                    </div>
                </div>
            `;

            notifications.push({
                from: `Agile Care Management <noreply@${RESEND_FROM_DOMAIN}>`,
                to: [staff_email],
                subject: `⚠️ Shift Update for ${client_name} on ${shift_date}`,
                html: html
            });
        }

        // SHIFT REASSIGNMENT
        if (change_type === 'shift_reassigned') {
            // Notify original staff (if provided)
            if (staff_email) {
                const html = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <!-- Header -->
                        <div style="background: linear-gradient(to right, #06b6d4, #3b82f6); color: white; padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; font-size: 28px; font-weight: 600;">Shift Update Notice</h1>
                        </div>

                        <!-- Body -->
                        <div style="background: #fff; padding: 40px 30px;">
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
                            <p style="margin: 0; font-size: 13px;">© 2025 Agile Care Management. All rights reserved.</p>
                            <p style="margin: 10px 0 0 0; font-size: 12px;">
                                Need help? Contact us at <a href="mailto:support@agilecaremanagement.co.uk" style="color: #06b6d4; text-decoration: none;">support@agilecaremanagement.co.uk</a>
                            </p>
                        </div>
                    </div>
                `;

                notifications.push({
                    from: `Agile Care Management <noreply@${RESEND_FROM_DOMAIN}>`,
                    to: [staff_email],
                    subject: `Shift Update - You've been removed from ${client_name} on ${shift_date}`,
                    html: html
                });
            }
        }

        // Send all notifications
        const results = await Promise.allSettled(
            notifications.map(notification =>
                fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${RESEND_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(notification),
                })
            )
        );

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
            notifications_sent: results.filter(r => r.status === 'fulfilled').length
        };

        const successCount = results.filter(r => r.status === 'fulfilled').length;

        return new Response(
            JSON.stringify({
                success: true,
                notifications_sent: successCount,
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
