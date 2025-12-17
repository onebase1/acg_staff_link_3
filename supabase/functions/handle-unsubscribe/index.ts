import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logNotification } from "../_shared/notificationLogger.ts";
import { getBranding } from "../_shared/getBranding.ts";

/**
 * 🔕 UNSUBSCRIBE HANDLER
 * 
 * Handles unsubscribe link clicks from notification emails.
 * Updates user preferences in database and logs the unsubscribe event.
 * 
 * Usage: GET /handle-unsubscribe?email=user@example.com&type=shift_assigned
 * 
 * Supported types:
 * - specific type (e.g., 'shift_assigned', 'payment_reminder')
 * - 'all' = unsubscribe from all non-critical notifications
 * 
 * Critical notifications (invoices, compliance) cannot be unsubscribed.
 */

serve(async (req) => {
    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const url = new URL(req.url);
        const email = url.searchParams.get("email");
        const type = url.searchParams.get("type");

        console.log(`🔕 [Unsubscribe] Request for ${email}, type: ${type}`);

        // Validation
        if (!email) {
            return new Response(getErrorPage("Email address is required"), {
                status: 400,
                headers: { "Content-Type": "text/html" }
            });
        }

        if (!type) {
            return new Response(getErrorPage("Notification type is required"), {
                status: 400,
                headers: { "Content-Type": "text/html" }
            });
        }

        // Get client contact
        const { data: contact, error: contactError } = await supabase
            .from("client_contacts")
            .select("*")
            .eq("email", email)
            .maybeSingle();

        if (contactError) {
            console.error("❌ [Unsubscribe] Database error:", contactError);
            return new Response(getErrorPage("Database error occurred"), {
                status: 500,
                headers: { "Content-Type": "text/html" }
            });
        }

        if (!contact) {
            console.log(`⚠️ [Unsubscribe] Contact not found: ${email}`);
            return new Response(getErrorPage("Email address not found in our system"), {
                status: 404,
                headers: { "Content-Type": "text/html" }
            });
        }

        // Get current preferences
        const currentPrefs = contact.notification_preferences || {};

        // Update preferences based on unsubscribe type
        let updatedPrefs = { ...currentPrefs };
        let unsubscribeMessage = "";

        if (type === "all") {
            // Unsubscribe from ALL non-critical notifications
            updatedPrefs = {
                ...currentPrefs,
                shift_assigned: false,
                shift_confirmed: false,
                shift_24h_reminder: false,
                shift_2h_reminder: false,
                shift_complete: false,
                rating_reminder: false,
                system_updates: false,
                promotional: false,
                daily_digest: false,
                weekly_digest: false,
                // Keep critical ones enabled (legal requirement)
                invoice_notifications: true,
                payment_reminders: true,
                compliance_notifications: true
            };
            unsubscribeMessage = "all non-critical notifications";
        } else {
            // Unsubscribe from specific type
            updatedPrefs[type] = false;
            unsubscribeMessage = type.replace(/_/g, " ");
        }

        // Update in database
        const { error: updateError } = await supabase
            .from("client_contacts")
            .update({ notification_preferences: updatedPrefs })
            .eq("id", contact.id);

        if (updateError) {
            console.error("❌ [Unsubscribe] Update failed:", updateError);
            return new Response(getErrorPage("Failed to update preferences"), {
                status: 500,
                headers: { "Content-Type": "text/html" }
            });
        }

        // Log the unsubscribe event
        await logNotification(supabase, {
            recipientEmail: email,
            recipientType: 'client',
            contactId: contact.id,
            agencyId: contact.agency_id,
            clientId: contact.client_id,
            notificationType: 'unsubscribe',
            channel: 'email',
            status: 'sent',
            metadata: {
                unsubscribe_type: type,
                unsubscribed_from: unsubscribeMessage
            }
        });

        console.log(`✅ [Unsubscribe] ${email} unsubscribed from ${unsubscribeMessage}`);

        // Get dynamic branding for this agency
        const branding = await getBranding(supabase, contact.agency_id);

        // Return success page
        return new Response(getSuccessPage(email, unsubscribeMessage, branding), {
            status: 200,
            headers: { "Content-Type": "text/html" }
        });

    } catch (error) {
        console.error("❌ [Unsubscribe] Fatal error:", error);
        return new Response(getErrorPage("An unexpected error occurred"), {
            status: 500,
            headers: { "Content-Type": "text/html" }
        });
    }
});

/**
 * Generate success HTML page
 */
function getSuccessPage(email: string, notificationType: string, branding: any): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Unsubscribed Successfully</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                .container {
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    max-width: 600px;
                    width: 100%;
                    overflow: hidden;
                }
                .header {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    padding: 40px 30px;
                    text-align: center;
                }
                .header-icon {
                    font-size: 64px;
                    margin-bottom: 16px;
                }
                .header h1 {
                    color: white;
                    font-size: 32px;
                    font-weight: bold;
                    margin: 0;
                }
                .content {
                    padding: 40px 30px;
                }
                .message {
                    font-size: 18px;
                    color: #1f2937;
                    line-height: 1.6;
                    margin-bottom: 24px;
                }
                .details {
                    background: #f3f4f6;
                    border-left: 4px solid #10b981;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 24px;
                }
                .details p {
                    margin: 8px 0;
                    color: #374151;
                    font-size: 16px;
                }
                .details strong {
                    color: #1f2937;
                }
                .actions {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin-top: 32px;
                }
                .btn {
                    display: inline-block;
                    padding: 14px 28px;
                    border-radius: 8px;
                    text-decoration: none;
                    font-weight: 600;
                    text-align: center;
                    transition: all 0.2s;
                }
                .btn-primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                }
                .btn-secondary {
                    background: white;
                    color: #667eea;
                    border: 2px solid #667eea;
                }
                .btn-secondary:hover {
                    background: #f5f3ff;
                }
                .footer {
                    padding: 24px 30px;
                    background: #f9fafb;
                    border-top: 1px solid #e5e7eb;
                    text-align: center;
                }
                .footer p {
                    color: #6b7280;
                    font-size: 14px;
                    margin: 4px 0;
                }
                .footer a {
                    color: #667eea;
                    text-decoration: none;
                }
                .footer a:hover {
                    text-decoration: underline;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="header-icon">✅</div>
                    <h1>Unsubscribed Successfully</h1>
                </div>
                
                <div class="content">
                    <div class="message">
                        <p>You have been successfully unsubscribed and will no longer receive <strong>${notificationType}</strong> notifications.</p>
                    </div>
                    
                    <div class="details">
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Unsubscribed from:</strong> ${notificationType}</p>
                        <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}</p>
                    </div>
                    
                    <div class="actions">
                        <a href="${branding.siteUrl}/client/preferences?email=${encodeURIComponent(email)}" class="btn btn-primary">
                            Manage All Preferences
                        </a>
                        <a href="${branding.siteUrl}/client/dashboard" class="btn btn-secondary">
                            Return to Dashboard
                        </a>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Changed your mind? You can update your preferences at any time.</p>
                    <p>Need help? Contact us at <a href="mailto:${branding.supportEmail}">${branding.supportEmail}</a></p>
                    <p style="margin-top: 16px; font-size: 12px;">
                        © ${new Date().getFullYear()} ${branding.companyName}. All rights reserved.
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;
}

/**
 * Generate error HTML page
 */
function getErrorPage(errorMessage: string): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Unsubscribe Error</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                .container {
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    max-width: 600px;
                    width: 100%;
                   overflow: hidden;
                }
                .header {
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    padding: 40px 30px;
                    text-align: center;
                }
                .header-icon {
                    font-size: 64px;
                    margin-bottom: 16px;
                }
                .header h1 {
                    color: white;
                    font-size: 32px;
                    font-weight: bold;
                    margin: 0;
                }
                .content {
                    padding: 40px 30px;
                }
                .message {
                    font-size: 18px;
                    color: #1f2937;
                    line-height: 1.6;
                    margin-bottom: 24px;
                }
                .error-box {
                    background: #fef2f2;
                    border-left: 4px solid #ef4444;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 24px;
                }
                .error-box p {
                    color: #991b1b;
                    font-size: 16px;
                    margin: 0;
                }
                .btn {
                    display: inline-block;
                    padding: 14px 28px;
                    border-radius: 8px;
                    text-decoration: none;
                    font-weight: 600;
                    text-align: center;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    transition: all 0.2s;
                }
                .btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                }
                .footer {
                    padding: 24px 30px;
                    background: #f9fafb;
                    border-top: 1px solid #e5e7eb;
                    text-align: center;
                    color: #6b7280;
                    font-size: 14px;
                }
                .footer a {
                    color: #667eea;
                    text-decoration: none;
                }
                .footer a:hover {
                    text-decoration: underline;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="header-icon">❌</div>
                    <h1>Unsubscribe Failed</h1>
                </div>
                
                <div class="content">
                    <div class="message">
                        <p>We encountered an error while processing your unsubscribe request.</p>
                    </div>
                    
                    <div class="error-box">
                        <p><strong>Error:</strong> ${errorMessage}</p>
                    </div>
                    
                    <div class="message">
                        <p>Please try again later or contact support if the problem persists.</p>
                    </div>
                    
                    <a href="mailto:${Deno.env.get("SAAS_SUPPORT_EMAIL") || "support@agilecaremanagement.co.uk"}?subject=Unsubscribe%20Error" class="btn">
                        Contact Support
                    </a>
                </div>

                <div class="footer">
                    <p>Need help? Email us at <a href="mailto:${Deno.env.get("SAAS_SUPPORT_EMAIL") || "support@agilecaremanagement.co.uk"}">${Deno.env.get("SAAS_SUPPORT_EMAIL") || "support@agilecaremanagement.co.uk"}</a></p>
                    <p style="margin-top: 8px;">© ${new Date().getFullYear()} ${Deno.env.get("SAAS_COMPANY_NAME") || "Agile Care Management"}</p>
                </div>
            </div>
        </body>
        </html>
    `;
}
