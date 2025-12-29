import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// TEMPLATE LOADER (Embedded Templates)
// ============================================================================

const TEMPLATES: Record<string, string> = {
    batch_confirmation: `<!DOCTYPE html><html><body style="margin: 0; padding: 0; font-family: sans-serif; background-color: #f3f4f6;"><div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;"><div style="background-color: #10b981; padding: 30px 20px; text-align: center; color: white;"><h1>✅ Shifts Confirmed</h1></div><div style="padding: 30px 20px;"><p>Dear {{client_name}},</p><p>We're pleased to confirm that <strong>{{shift_count}} shift{{shift_count_plural}}</strong> have been filled{{date_range}}.</p><div style="background-color: #d1fae5; border: 2px solid #059669; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 25px;">📊 Summary<br>{{role_summary_boxes}}<br>Total Hours: {{total_hours}}h</div><h2>📅 Schedule</h2>{{grouped_shifts_html}}</div><div style="background: #f9fafb; padding: 15px; text-align: center;"><a href="{{preferences_url}}">Manage email preferences</a></div><div style="background: #1e293b; color: #94a3b8; padding: 20px; text-align: center;"><p>© {{current_year}} {{agency_name}}</p></div></div></body></html>`,
    weekly_summary: `<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:sans-serif;background-color:#f9fafb;"><div style="max-width:600px;margin:20px auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;"><div style="background:#0284c7;color:#fff;padding:30px 20px;text-align:center;"><h1>{{report_title}}</h1><p>{{date_range}}</p></div><div style="padding:20px;"><p>Hi {{contact_name}},</p><p>Here is your summary for {{client_name}}.</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin:20px 0;"><div style="background:#f0f9ff;padding:15px;border-radius:8px;text-align:center;"><strong>This Week</strong><br>{{total_shifts}} Shifts<br>{{total_hours}} Hours</div><div style="background:#f0f9ff;padding:15px;border-radius:8px;text-align:center;"><strong>Month to Date</strong><br>{{total_shifts_mtd}} Shifts<br>{{total_hours_mtd}} Hours</div></div><h3>📅 Shift Details</h3>{{shifts_html}}</div><div style="background:#f3f4f6;padding:20px;text-align:center;font-size:12px;color:#6b7280;"><p>© {{current_year}} {{agency_name}}</p></div></div></body></html>`,
    daily_client_digest: `<!DOCTYPE html><html><body style="margin:0;padding:0;font-family:sans-serif;background-color:#f9fafb;"><div style="max-width:600px;margin:20px auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;"><div style="background:#0284c7;color:#fff;padding:30px 20px;text-align:center;"><h1>☀️ Daily Digest</h1><p>{{date}}</p></div><div style="padding:20px;"><p>Hi {{contact_name}},</p><p>Here are the staff scheduled for tomorrow:</p><div style="margin:20px 0;">{{shifts_html}}</div></div><div style="background:#f3f4f6;padding:20px;text-align:center;font-size:12px;color:#6b7280;"><p>© {{current_year}} {{agency_name}}</p></div></div></body></html>`
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
