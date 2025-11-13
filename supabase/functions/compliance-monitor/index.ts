import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * PHASE 2 - TIER 2: Proactive Compliance Monitor
 *
 * Daily scans all staff compliance documents:
 * - Sends reminders at 30, 14, 7 days before expiry
 * - Auto-suspends staff with expired critical documents
 * - Creates admin workflows for urgent cases
 *
 * Triggered: Scheduled daily at 8am
 * Rollback: Controlled by agency.settings.automation_settings.auto_compliance_reminders
 */

serve(async (req) => {
    try {
        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        console.log('🛡️ [Compliance Monitor] Starting daily scan...');

        const { data: agencies, error: agenciesError } = await supabase
            .from("agencies")
            .select("*");

        if (agenciesError) throw agenciesError;

        const results = {
            checked: 0,
            reminders_30d: 0,
            reminders_14d: 0,
            reminders_7d: 0,
            suspended: 0,
            workflows_created: 0,
            errors: [],
        };

        for (const agency of agencies) {
            const autoComplianceEnabled = agency.settings?.automation_settings?.auto_compliance_reminders;

            if (!autoComplianceEnabled) {
                console.log(`⏭️  [Agency: ${agency.name}] Compliance reminders disabled, skipping`);
                continue;
            }

            console.log(`🏥 [Agency: ${agency.name}] Scanning compliance documents...`);

            // Get all compliance documents for this agency
            const { data: documents, error: documentsError } = await supabase
                .from("compliance")
                .select("*")
                .eq("agency_id", agency.id)
                .in("status", ['verified', 'pending']);

            if (documentsError) {
                console.error(`❌ Error fetching compliance documents:`, documentsError);
                continue;
            }

            const now = new Date();

            for (const doc of documents) {
                results.checked++;

                try {
                    // Skip documents without expiry dates
                    if (!doc.expiry_date) continue;

                    const expiryDate = new Date(doc.expiry_date);
                    const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));

                    // Get staff details
                    const { data: staffMember, error: staffError } = await supabase
                        .from("staff")
                        .select("*")
                        .eq("id", doc.staff_id)
                        .single();

                    if (staffError || !staffMember) {
                        console.log(`⚠️  [Doc ${doc.id}] Staff not found, skipping`);
                        continue;
                    }

                    // CHECK 1: Document EXPIRED
                    if (daysUntilExpiry < 0) {
                        console.log(`🚨 [Doc ${doc.id}] EXPIRED - ${doc.document_name} for ${staffMember.first_name}`);

                        // Mark document as expired
                        await supabase
                            .from("compliance")
                            .update({ status: 'expired' })
                            .eq("id", doc.id);

                        // Check if critical document (DBS, Right to Work, Professional Registration)
                        const criticalTypes = ['dbs_check', 'right_to_work', 'professional_registration'];

                        if (criticalTypes.includes(doc.document_type)) {
                            // Auto-suspend staff
                            console.log(`⛔ [Staff ${staffMember.id}] Auto-suspending due to expired ${doc.document_name}`);

                            await supabase
                                .from("staff")
                                .update({
                                    status: 'suspended',
                                    suspension_reason: `Expired ${doc.document_name} - Must renew before resuming work`
                                })
                                .eq("id", staffMember.id);

                            results.suspended++;

                            // Create admin workflow
                            await supabase
                                .from("admin_workflows")
                                .insert({
                                    agency_id: agency.id,
                                    type: 'expired_compliance_document',
                                    priority: 'critical',
                                    status: 'pending',
                                    title: `🚨 CRITICAL: ${staffMember.first_name} ${staffMember.last_name} - Expired ${doc.document_name}`,
                                    description: `Staff member auto-suspended. Document expired on ${doc.expiry_date}. Cannot work until renewed and verified.`,
                                    related_entity: {
                                        entity_type: 'compliance',
                                        entity_id: doc.id
                                    },
                                    deadline: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
                                    auto_created: true
                                });

                            results.workflows_created++;

                            // Send urgent notification
                            await supabase.functions.invoke('send-email', {
                                body: {
                                    to: staffMember.email,
                                    subject: `🚨 URGENT: Your ${doc.document_name} has EXPIRED - Account Suspended`,
                                    html: `
                                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                            <div style="background: #dc2626; padding: 30px; text-align: center;">
                                                <h1 style="color: white; margin: 0;">⛔ ACCOUNT SUSPENDED</h1>
                                            </div>
                                            <div style="padding: 30px; background: #fef2f2;">
                                                <p style="font-size: 16px; color: #1f2937;">Hi ${staffMember.first_name},</p>
                                                <p style="font-size: 16px; color: #dc2626; font-weight: bold;">Your account has been automatically suspended.</p>

                                                <div style="background: white; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
                                                    <p style="margin: 10px 0;"><strong>Document:</strong> ${doc.document_name}</p>
                                                    <p style="margin: 10px 0;"><strong>Expired:</strong> ${doc.expiry_date}</p>
                                                    <p style="margin: 10px 0;"><strong>Reference:</strong> ${doc.reference_number}</p>
                                                </div>

                                                <p style="font-size: 14px; color: #1f2937;">
                                                    <strong>What this means:</strong><br>
                                                    - You cannot accept any new shifts<br>
                                                    - Any assigned shifts will be reassigned<br>
                                                    - You must renew this document immediately<br>
                                                </p>

                                                <p style="font-size: 14px; color: #dc2626; margin-top: 20px;">
                                                    <strong>Action Required:</strong> Upload your renewed ${doc.document_name} today to reactivate your account.
                                                </p>
                                            </div>
                                            <div style="background: #991b1b; padding: 20px; text-align: center;">
                                                <p style="color: white; font-size: 12px; margin: 0;">Contact admin immediately if you have questions</p>
                                            </div>
                                        </div>
                                    `
                                }
                            });
                        }

                        continue;
                    }

                    // CHECK 2: 30 days reminder
                    if (daysUntilExpiry === 30 && !doc.reminder_30d_sent) {
                        console.log(`📧 [Doc ${doc.id}] Sending 30-day reminder to ${staffMember.email}`);

                        await supabase.functions.invoke('send-email', {
                            body: {
                                to: staffMember.email,
                                subject: `📋 Reminder: ${doc.document_name} expires in 30 days`,
                                html: `
                                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center;">
                                            <h1 style="color: white; margin: 0;">📋 Document Expiry Reminder</h1>
                                        </div>
                                        <div style="padding: 30px; background: #fffbeb;">
                                            <p style="font-size: 16px; color: #1f2937;">Hi ${staffMember.first_name},</p>
                                            <p style="font-size: 16px; color: #1f2937;">Your ${doc.document_name} will expire in <strong>30 days</strong>.</p>

                                            <div style="background: white; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
                                                <p style="margin: 10px 0;"><strong>Document:</strong> ${doc.document_name}</p>
                                                <p style="margin: 10px 0;"><strong>Expires:</strong> ${doc.expiry_date}</p>
                                                <p style="margin: 10px 0;"><strong>Days Remaining:</strong> 30</p>
                                            </div>

                                            <p style="font-size: 14px; color: #78716c;">
                                                Please start the renewal process now to avoid any work interruption.
                                            </p>
                                        </div>
                                        <div style="background: #d97706; padding: 20px; text-align: center;">
                                            <p style="color: white; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} ${agency.name}</p>
                                        </div>
                                    </div>
                                `
                            }
                        });

                        await supabase
                            .from("compliance")
                            .update({
                                reminder_30d_sent: true,
                                reminder_sent: true
                            })
                            .eq("id", doc.id);

                        results.reminders_30d++;
                    }

                    // CHECK 3: 14 days reminder
                    if (daysUntilExpiry === 14 && !doc.reminder_14d_sent) {
                        console.log(`📧 [Doc ${doc.id}] Sending 14-day reminder to ${staffMember.email}`);

                        await supabase.functions.invoke('send-email', {
                            body: {
                                to: staffMember.email,
                                subject: `⚠️ Important: ${doc.document_name} expires in 2 weeks`,
                                html: `
                                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                        <div style="background: #f59e0b; padding: 30px; text-align: center;">
                                            <h1 style="color: white; margin: 0;">⚠️ URGENT REMINDER</h1>
                                        </div>
                                        <div style="padding: 30px; background: #fef3c7;">
                                            <p style="font-size: 16px; color: #1f2937;">Hi ${staffMember.first_name},</p>
                                            <p style="font-size: 16px; color: #92400e; font-weight: bold;">Your ${doc.document_name} expires in just 14 days!</p>

                                            <div style="background: white; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
                                                <p style="margin: 10px 0;"><strong>Document:</strong> ${doc.document_name}</p>
                                                <p style="margin: 10px 0;"><strong>Expires:</strong> ${doc.expiry_date}</p>
                                                <p style="margin: 10px 0; color: #dc2626;"><strong>Days Remaining:</strong> 14</p>
                                            </div>

                                            <p style="font-size: 14px; color: #92400e;">
                                                <strong>Action required NOW:</strong> If you haven't already started the renewal process, please do so immediately to avoid suspension.
                                            </p>
                                        </div>
                                        <div style="background: #d97706; padding: 20px; text-align: center;">
                                            <p style="color: white; font-size: 12px; margin: 0;">Upload renewed document as soon as possible</p>
                                        </div>
                                    </div>
                                `
                            }
                        });

                        await supabase
                            .from("compliance")
                            .update({
                                reminder_14d_sent: true,
                                reminder_sent: true
                            })
                            .eq("id", doc.id);

                        results.reminders_14d++;
                    }

                    // CHECK 4: 7 days CRITICAL reminder
                    if (daysUntilExpiry === 7 && !doc.reminder_7d_sent) {
                        console.log(`🚨 [Doc ${doc.id}] Sending 7-day CRITICAL reminder to ${staffMember.email}`);

                        // Send email + SMS for 7-day warning
                        await supabase.functions.invoke('send-email', {
                            body: {
                                to: staffMember.email,
                                subject: `🚨 CRITICAL: ${doc.document_name} expires in 7 DAYS`,
                                html: `
                                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                        <div style="background: #dc2626; padding: 30px; text-align: center;">
                                            <h1 style="color: white; margin: 0;">🚨 FINAL WARNING</h1>
                                        </div>
                                        <div style="padding: 30px; background: #fef2f2;">
                                            <p style="font-size: 16px; color: #1f2937;">Hi ${staffMember.first_name},</p>
                                            <p style="font-size: 18px; color: #dc2626; font-weight: bold;">Your ${doc.document_name} expires in 7 DAYS!</p>

                                            <div style="background: white; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
                                                <p style="margin: 10px 0;"><strong>Document:</strong> ${doc.document_name}</p>
                                                <p style="margin: 10px 0;"><strong>Expires:</strong> ${doc.expiry_date}</p>
                                                <p style="margin: 10px 0; color: #dc2626; font-size: 18px;"><strong>Days Remaining:</strong> 7</p>
                                            </div>

                                            <div style="background: #fee2e2; border: 2px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 8px;">
                                                <p style="font-size: 14px; color: #991b1b; margin: 0;">
                                                    <strong>⚠️ WARNING:</strong> If this document expires, your account will be AUTOMATICALLY SUSPENDED and you will be unable to work until it's renewed.
                                                </p>
                                            </div>

                                            <p style="font-size: 14px; color: #dc2626;">
                                                <strong>IMMEDIATE ACTION REQUIRED:</strong> Upload your renewed ${doc.document_name} TODAY or contact admin if you need assistance.
                                            </p>
                                        </div>
                                        <div style="background: #991b1b; padding: 20px; text-align: center;">
                                            <p style="color: white; font-size: 14px; margin: 0; font-weight: bold;">THIS IS YOUR FINAL REMINDER - ACT NOW</p>
                                        </div>
                                    </div>
                                `
                            }
                        });

                        // Also send SMS
                        await supabase.functions.invoke('send-sms', {
                            body: {
                                to: staffMember.phone,
                                message: `🚨 URGENT: Your ${doc.document_name} expires in 7 DAYS (${doc.expiry_date}). Upload renewal NOW or your account will be suspended. Contact admin: ${agency.contact_phone}`
                            }
                        });

                        await supabase
                            .from("compliance")
                            .update({
                                reminder_7d_sent: true,
                                reminder_sent: true
                            })
                            .eq("id", doc.id);

                        results.reminders_7d++;

                        // Create workflow for admin to follow up
                        await supabase
                            .from("admin_workflows")
                            .insert({
                                agency_id: agency.id,
                                type: 'expiring_compliance_document',
                                priority: 'high',
                                status: 'pending',
                                title: `⚠️ Follow-up: ${staffMember.first_name} ${staffMember.last_name} - ${doc.document_name} expires in 7 days`,
                                description: `Document expires on ${doc.expiry_date}. Final reminder sent. Please follow up to ensure renewal is in progress.`,
                                related_entity: {
                                    entity_type: 'compliance',
                                    entity_id: doc.id
                                },
                                deadline: new Date(expiryDate.getTime()).toISOString(),
                                auto_created: true
                            });

                        results.workflows_created++;
                    }

                } catch (docError) {
                    console.error(`❌ [Doc ${doc.id}] Error:`, docError.message);
                    results.errors.push({
                        document_id: doc.id,
                        error: docError.message
                    });
                }
            }
        }

        console.log('✅ [Compliance Monitor] Complete:', results);

        return new Response(
            JSON.stringify({
                success: true,
                timestamp: new Date().toISOString(),
                results: results
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error('❌ [Compliance Monitor] Fatal error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
