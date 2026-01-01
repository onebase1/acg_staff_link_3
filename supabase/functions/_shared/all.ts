import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// TEMPLATE LOADER (Embedded Templates)
// ============================================================================

const TEMPLATES: Record<string, string> = {
    batch_confirmation: `<!DOCTYPE html><html><body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f3f4f6;"><div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;"><div style="background-color: #10b981; padding: 30px 20px; text-align: center; color: white;"><h1>✅ Shifts Confirmed</h1></div><div style="padding: 30px 20px;"><p>Dear {{client_name}},</p><p>We're pleased to confirm that <strong>{{shift_count}} shift{{shift_count_plural}}</strong> have been filled{{date_range}}.</p><div style="background-color: #d1fae5; border: 2px solid #059669; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 25px;">📊 Summary<br>{{role_summary_boxes}}<br>Total Hours: {{total_hours}}h</div><h2>📅 Schedule</h2>{{shifts_html}}</div><div style="background: #f9fafb; padding: 15px; text-align: center;"><a href="{{preferences_url}}">Manage email preferences</a></div><div style="background: #1e293b; color: #94a3b8; padding: 20px; text-align: center;"><p>© {{current_year}} {{agency_name}}</p></div></div></body></html>`,
    weekly_summary: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9;">
    <div style="max-width: 700px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
        <!-- HEADER -->
        <div style="background-color: #0284c7; padding: 50px 20px; text-align: center;">
            <div style="display: inline-block; vertical-align: middle;">
                <span style="font-size: 36px; display: inline-block; vertical-align: middle; margin-right: 12px;">📈</span>
                <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: -0.05em; display: inline-block; vertical-align: middle;">{{report_title}}</h1>
            </div>
            <p style="color: #e0f2fe; margin: 15px 0 0 0; font-size: 18px; font-weight: 500; opacity: 0.9;">{{date_range}}</p>
        </div>

        <div style="padding: 50px 40px;">
            <p style="font-size: 18px; color: #1e293b; margin-bottom: 12px; font-weight: 600;">Dear {{contact_name}},</p>
            <p style="font-size: 16px; color: #64748b; line-height: 1.7; margin-bottom: 40px;">Below is the performance and logistics summary for <strong>{{client_name}}</strong>. This report captures the staffing activity and service delivery for the selected period.</p>
            
            <!-- STATS BOXES -->
            <table style="width: 100%; border-collapse: separate; border-spacing: 12px 0; margin-bottom: 50px;">
                <tr>
                    <td style="width: 33%; background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 16px; padding: 25px 15px; text-align: center;">
                        <p style="margin: 0; font-size: 11px; color: #0369a1; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Total Shifts</p>
                        <p style="margin: 10px 0 0 0; font-size: 32px; color: #0c4a6e; font-weight: 900;">{{total_shifts}}</p>
                    </td>
                    <td style="width: 33%; background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 16px; padding: 25px 15px; text-align: center;">
                        <p style="margin: 0; font-size: 11px; color: #0369a1; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Total Hours</p>
                        <p style="margin: 10px 0 0 0; font-size: 32px; color: #0c4a6e; font-weight: 900;">{{total_hours}}</p>
                    </td>
                    <td style="width: 33%; background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 16px; padding: 25px 15px; text-align: center;">
                        <p style="margin: 0; font-size: 11px; color: #0369a1; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Staff Count</p>
                        <p style="margin: 10px 0 0 0; font-size: 32px; color: #0c4a6e; font-weight: 900;">{{total_staff}}</p>
                    </td>
                </tr>
            </table>

            <!-- TABLE SECTION -->
            <div style="margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px;">
                <h3 style="font-size: 20px; color: #0f172a; margin: 0; font-weight: 800;">📋 Service Breakdown</h3>
            </div>

            <div style="border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; margin-bottom: 30px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f8fafc;">
                            <th style="padding: 16px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0;">Date</th>
                            <th style="padding: 16px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0;">Times</th>
                            <th style="padding: 16px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0;">Staff Role</th>
                            <th style="padding: 16px; text-align: center; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0;">Qty</th>
                            <th style="padding: 16px; text-align: right; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0;">Hours</th>
                        </tr>
                    </thead>
                    <tbody>
                        {{shifts_html}}
                    </tbody>
                </table>
            </div>

            <p style="font-size: 16px; color: #64748b; line-height: 1.7; margin-bottom: 10px;">If you have any questions regarding this summary, please feel free to reach out to our team.</p>
            <p style="font-size: 16px; color: #1e293b; margin-bottom: 40px; font-weight: 600;">Sincerely,<br>{{agency_name}} Team</p>

            <!-- ACTION SECTION -->
            <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); border-radius: 16px; padding: 40px; text-align: center; color: #ffffff;">
                <h3 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 800;">Real-time Coordination</h3>
                <p style="margin: 0 0 30px 0; color: #e0f2fe; font-size: 16px; opacity: 0.9;">Manage your temporary staffing needs and view live rotas via your portal.</p>
                <a href="{{preferences_url}}" style="display: inline-block; background-color: #ffffff; color: #0284c7; padding: 16px 35px; border-radius: 10px; font-weight: 800; text-decoration: none; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);">Go to Dashboard</a>
            </div>
        </div>

        <!-- FOOTER -->
        <div style="background-color: #0f172a; padding: 50px 40px; text-align: center;">
            <p style="margin: 0; font-size: 16px; color: #ffffff; font-weight: 800; letter-spacing: 0.025em;">{{agency_name}}</p>
            <p style="margin: 10px 0 30px 0; font-size: 14px; color: #94a3b8; font-weight: 500;">{{agency_email}} • {{agency_phone}}</p>
            <div style="height: 1px; background-color: #334155; margin-bottom: 30px;"></div>
            <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 500;">© {{current_year}} {{agency_name}}. All rights reserved.</p>
            <p style="margin: 20px 0 0 0; font-size: 10px; color: #475569; letter-spacing: 0.01em; opacity: 0.8;">Sent on behalf of {{agency_name}} via Agile Care Management</p>
        </div>
    </div>
</body>
</html>`,
    daily_client_digest: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f7fa;">
    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 40px 20px; text-align: center;">
            <div style="background: rgba(255, 255, 255, 0.2); width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 30px;">🌟</span>
            </div>
            <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: bold;">Tomorrow's Schedule</h1>
            <p style="color: #e0f2fe; margin: 10px 0 0 0; font-size: 15px; font-weight: 500;">{{date_range}}</p>
        </div>
        <div style="padding: 30px;">
            <p style="font-size: 16px; color: #1f2937; margin-bottom: 20px;">Hi {{contact_name}},</p>
            <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin-bottom: 30px;">We're all set for tomorrow! Here are the staff members scheduled to support <strong>{{client_name}}</strong> on <strong>{{date_range}}</strong>.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <thead>
                    <tr style="background-color: #f8fafc;">
                        <th style="padding: 12px 15px; text-align: left; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase;">Time</th>
                        <th style="padding: 12px 15px; text-align: left; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase;">Role</th>
                        <th style="padding: 12px 15px; text-align: left; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase;">Staff Name</th>
                        <th style="padding: 12px 15px; text-align: right; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {{shifts_html}}
                </tbody>
            </table>

            <div style="text-align: center; margin-top: 30px;">
                <a href="{{portal_url}}" style="display: inline-block; background-color: #0284c7; color: #ffffff; padding: 14px 28px; border-radius: 8px; font-weight: bold; text-decoration: none; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.4);">View Live Schedule</a>
            </div>
        </div>
        <div style="background-color: #f9fafb; padding: 25px; border-top: 1px solid #f1f5f9; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #64748b; font-weight: 600;">{{agency_name}}</p>
            <p style="margin: 5px 0 0 0; font-size: 13px; color: #94a3b8;">{{agency_email}} | {{agency_phone}}</p>
            <p style="margin: 20px 0 0 0; font-size: 11px; color: #cbd5e1;">© {{current_year}} {{agency_name}}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`
};

export async function loadTemplate(name: string, variables: Record<string, any>): Promise<string> {
    let html = TEMPLATES[name] || '';
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, String(value ?? ''));
    }
    return html;
}

// ============================================================================
// BRANDING
// ============================================================================

export async function getBranding(supabase: any, agencyId?: string) {
    if (agencyId) {
        try {
            const { data: config } = await supabase.from('saas_configuration').select('*').eq('agency_id', agencyId).maybeSingle();
            if (config) {
                const baseUrl = config.custom_domain || config.site_url || Deno.env.get("SITE_URL") || "https://agilecaremanagement.co.uk";
                return {
                    saasName: config.saas_name || "ACG StaffLink",
                    companyName: config.saas_company_name || "Agile Care Management",
                    supportEmail: config.support_email || "support@agilecaremanagement.co.uk",
                    supportPhone: config.support_phone || "+44 20 1234 5678",
                    noreplyEmail: config.noreply_email || `noreply@${Deno.env.get("RESEND_FROM_DOMAIN") || "agilecaremanagement.co.uk"}`,
                    siteUrl: baseUrl,
                    appUrl: config.app_url || baseUrl,
                    staffPortalUrl: config.staff_portal_url || `${baseUrl}/staffportal`,
                    clientPortalUrl: config.client_portal_url || `${baseUrl}/ClientPortal`,
                    adminDashboardUrl: config.admin_dashboard_url || `${baseUrl}/Dashboard`
                };
            }
        } catch (err) { console.warn('Branding fetch failed', err); }
    }
    const fromDomain = Deno.env.get("RESEND_FROM_DOMAIN") || "agilecaremanagement.co.uk";
    const baseUrl = Deno.env.get("SITE_URL") || "https://agilecaremanagement.co.uk";
    return {
        saasName: "ACG StaffLink",
        companyName: "Agile Care Management",
        supportEmail: "support@agilecaremanagement.co.uk",
        supportPhone: "+44 20 1234 5678",
        noreplyEmail: `noreply@${fromDomain}`,
        siteUrl: baseUrl,
        appUrl: baseUrl,
        staffPortalUrl: `${baseUrl}/staffportal`,
        clientPortalUrl: `${baseUrl}/ClientPortal`,
        adminDashboardUrl: `${baseUrl}/Dashboard`
    };
}

export function getEmailFrom(branding: any, agencyName?: string) {
    const fromName = agencyName || branding.saasName;
    const fromEmail = branding.noreplyEmail;
    return { from_name: fromName, from_email: fromEmail, combined: `${fromName} <${fromEmail}>` };
}

// ============================================================================
// PREFERENCES
// ============================================================================

export async function shouldSendNotification(supabase: SupabaseClient, email: string, type: string, channel: string = 'email', recipient: 'client'|'staff'|'admin' = 'client') {
    if (Deno.env.get("ENABLE_PREFERENCE_CHECKING") !== "true") return { allowed: true, preferenceChecked: false };
    try {
        if (recipient === 'staff') {
            const { data } = await supabase.from('staff').select('opt_out_shift_reminders').eq('email', email).maybeSingle();
            return { allowed: !data?.opt_out_shift_reminders, preferenceChecked: true, preferenceStatus: data?.opt_out_shift_reminders ? 'opted_out' : 'opted_in' };
        }
        const { data } = await supabase.from('client_contacts').select('notification_preferences').eq('email', email).maybeSingle();
        const prefs = data?.notification_preferences || {};
        const key = { 'shift_assignment': 'shift_assigned', 'shift_confirmed': 'shift_confirmed', 'daily_digest': 'daily_digest', 'weekly_summary': 'weekly_digest' }[type] || type;
        const status = prefs[key];
        if (status === false) return { allowed: false, reason: 'user_opted_out', preferenceStatus: 'opted_out', preferenceChecked: true };
        return { allowed: true, preferenceStatus: status === true ? 'opted_in' : 'not_set', preferenceChecked: true };
    } catch { return { allowed: true, preferenceChecked: false }; }
}

// ============================================================================
// LOGGING
// ============================================================================

export async function logNotification(supabase: SupabaseClient, p: any) {
    if (Deno.env.get("ENABLE_NOTIFICATION_LOGGING") !== "true") return;
    try {
        await supabase.from('notification_log').insert({
            recipient_email: p.recipientEmail,
            agency_id: p.agencyId,
            notification_type: p.notificationType,
            channel: p.channel,
            status: p.status,
            error_message: p.errorMessage,
            provider_message_id: p.providerMessageId,
            metadata: p.metadata || {},
            created_at: new Date().toISOString()
        });
    } catch (err) { console.error('Logging failed', err); }
}

export const logNotificationSent = (s: any, p: any) => logNotification(s, { ...p, status: 'sent' });
export const logNotificationFailed = (s: any, p: any) => logNotification(s, { ...p, status: 'failed' });
export const logNotificationSkipped = (s: any, p: any) => logNotification(s, { ...p, status: 'queued' });

// ============================================================================
// MAGIC TOKENS
// ============================================================================

export { generateDatabaseToken } from "./magic-tokens.ts";

export async function generateStaffProfileLink(supabase: SupabaseClient, staff_id: string, client_id: string, agency_id: string) {
    try {
        const { token } = await generateDatabaseToken(supabase, { staff_id, client_id, agency_id, download_type: 'profile' });
        const baseUrl = Deno.env.get('SUPABASE_URL') || '';
        return `${baseUrl}/functions/v1/staff-profile-linker?token=${token}`;
    } catch { return null; }
}

export async function generateDownloadUrls(supabase: any, i: any) { return { pdf: '', csv: '', ics: '' }; }

export function formatDateRange(s: Date, e: Date): string {
  const opt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${s.toLocaleDateString('en-GB', opt)} - ${e.toLocaleDateString('en-GB', opt)}`;
}
