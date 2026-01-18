// =====================================================
// DAILY AGENCY DIGEST - Edge Function
// =====================================================
// Purpose: Send daily email + WhatsApp digest to agency owners
// Schedule: Daily at 7:00 AM
// Cron: 0 7 * * *
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadTemplate } from "../_shared/templateLoader.ts";
import { getBranding } from "../_shared/getBranding.ts";
import { logNotificationSent, logNotificationFailed } from "../_shared/notificationLogger.ts";
import { formatToE164 } from "../_shared/phoneHelper.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Deep link base URL
const SITE_URL = Deno.env.get("SITE_URL") || "https://agilecaremanagement.co.uk";
const APP_BASE_URL = SITE_URL.replace("app.", "").replace(/\/$/, "");

// Helper for rate limiting
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request (can be called manually or via cron)
    const body = await req.json().catch(() => ({}));
    const { agency_id, report_date, test_mode = false } = body;

    const targetDate = report_date || new Date().toISOString().split('T')[0];

    // Get agencies to process
    let agenciesToProcess: any[] = [];

    if (agency_id) {
      // Single agency (manual trigger or test)
      const { data: agency } = await supabase
        .from("agencies")
        .select("id, name, contact_email, phone, email_notifications, whatsapp_global_notifications")
        .eq("id", agency_id)
        .single();

      if (agency) agenciesToProcess = [agency];
    } else {
      // All agencies with email notifications enabled (cron mode)
      const { data: agencies } = await supabase
        .from("agencies")
        .select("id, name, contact_email, phone, email_notifications, whatsapp_global_notifications")
        .eq("email_notifications", true);

      agenciesToProcess = agencies || [];
    }

    if (agenciesToProcess.length === 0) {
      return new Response(
        JSON.stringify({ message: "No agencies to process" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const results: any[] = [];

    // Process each agency
    for (const agency of agenciesToProcess) {
      try {
        // Get daily report data from RPC function
        const { data: reportData, error: reportError } = await supabase
          .rpc("get_daily_agency_report", {
            p_agency_id: agency.id,
            p_report_date: targetDate,
          });

        if (reportError) {
          console.error(`Error fetching report for ${agency.name}:`, reportError);
          results.push({ agency: agency.name, status: "error", error: reportError.message });
          continue;
        }

        // Skip if no shifts today (optional: can configure per agency)
        if (!reportData.stats.totalShifts || reportData.stats.totalShifts === 0) {
          console.log(`No shifts for ${agency.name}, skipping report`);
          results.push({ agency: agency.name, status: "skipped", reason: "no_shifts" });
          continue;
        }

        // Get agency branding
        const branding = await getBranding(supabase, agency.id);

        // 👥 Multi-Recipient Fetch: Get all profiles with reporting enabled
        const { data: subscribers } = await supabase
          .from("profiles")
          .select("email, phone, report_email_enabled, report_whatsapp_enabled, full_name")
          .eq("agency_id", agency.id)
          .or("report_email_enabled.eq.true,report_whatsapp_enabled.eq.true");

        // 📨 Prepare Email Recipients (Deduplicated)
        const emailRecipientsMap = new Map();
        subscribers?.forEach((s: any) => {
          if (s.report_email_enabled && s.email && !emailRecipientsMap.has(s.email.toLowerCase())) {
            emailRecipientsMap.set(s.email.toLowerCase(), { email: s.email, full_name: s.full_name });
          }
        });
        
        // Fallback to agency contact_email if no one is explicitly subscribed
        if (emailRecipientsMap.size === 0 && agency.email_notifications && agency.contact_email) {
          emailRecipientsMap.set(agency.contact_email.toLowerCase(), { email: agency.contact_email, full_name: agency.name });
        }
        const emailRecipients = Array.from(emailRecipientsMap.values());

        console.log(`🔍 Found ${subscribers?.length || 0} subscribers for ${agency.name}`);
        
        // 📨 Prepare WhatsApp Recipients (Deduplicated)
        const whatsappRecipientsMap = new Map();
        subscribers?.forEach((s: any) => {
          if (s.report_whatsapp_enabled && s.phone) {
            const canonical = formatToE164(s.phone, agency.country_code || "UK");
            console.log(`   - Checked subscriber ${s.full_name}: whatsapp_enabled=${s.report_whatsapp_enabled}, phone=${s.phone}, canonical=${canonical}`);
            if (canonical && !whatsappRecipientsMap.has(canonical)) {
              whatsappRecipientsMap.set(canonical, { phone: canonical, full_name: s.full_name });
            }
          }
        });

        // Fallback to agency phone if no one is explicitly subscribed
        if (whatsappRecipientsMap.size === 0 && agency.whatsapp_global_notifications && agency.phone) {
            console.log(`   - Falling back to agency phone: ${agency.phone}`);
            const canonical = formatToE164(agency.phone, agency.country_code || "UK");
            if (canonical) {
                whatsappRecipientsMap.set(canonical, { phone: canonical, full_name: agency.name });
            }
        }
        
        const whatsappRecipients = Array.from(whatsappRecipientsMap.values());
        console.log(`📱 Final WhatsApp Recipients count: ${whatsappRecipients.length}`);

        // 📧 Send Emails
        let successfulEmails = 0;
        for (const recipient of emailRecipients) {
          const success = await sendDailyEmail(
            supabase,
            agency,
            reportData,
            branding,
            targetDate,
            test_mode,
            recipient.email
          );
          if (success) successfulEmails++;

          // ⚖️ Rate Limiting: Resend free tier allows 2 req/sec
          if (emailRecipients.length > 1) {
            await sleep(600); 
          }
        }

        // 💬 Send WhatsApps
        let successfulWhatsApps = 0;
        for (const recipient of whatsappRecipients) {
          const success = await sendDailyWhatsApp(
            supabase,
            agency,
            reportData,
            targetDate,
            test_mode,
            recipient,
            APP_BASE_URL // Pass the base URL for link generation
          );
          if (success) successfulWhatsApps++;
        }

        results.push({ 
          agency: agency.name, 
          status: "success", 
          emailsSent: successfulEmails,
          whatsAppSent: successfulWhatsApps 
        });
      } catch (error: any) {
        console.error(`Error processing ${agency.name}:`, error);
        results.push({ agency: agency.name, status: "error", error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        message: "Daily agency digest sent",
        date: targetDate,
        processed: results.length,
        results,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Daily digest error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// =====================================================
// SEND DAILY EMAIL
// =====================================================

async function sendDailyEmail(
  supabase: any,
  agency: any,
  reportData: any,
  branding: any,
  reportDate: string,
  testMode: boolean,
  recipientEmail: string
): Promise<boolean> {
  try {
    // Format date for display
    const dateObj = new Date(reportDate);
    const formattedDate = dateObj.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Process clients and shifts for template
    const clients = reportData.clients?.map((client: any) => ({
      name: client.name,
      shifts: client.shifts?.map((shift: any) => ({
        startTime: shift.startTime,
        endTime: shift.endTime,
        role: formatRole(shift.role || "staff"),
        staffName: shift.staffName,
        status: shift.status,
      })) || [],
    })) || [];

    // Process action items
    const criticalAlerts = reportData.actionItems?.criticalAlerts?.map((alert: any) =>
      alert.message
    ) || [];

    const warningAlerts = reportData.actionItems?.warningAlerts?.map((alert: any) =>
      alert.message
    ) || [];

    const hasAlerts = criticalAlerts.length > 0 || warningAlerts.length > 0;

    // Process pending timesheets
    const pendingTimesheets = reportData.pendingTimesheets?.map((ts: any) => ({
      clientName: ts.clientName,
      staffName: ts.staffName,
      shiftDate: new Date(ts.shiftDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      shiftTime: ts.shiftTime,
      approvalLink: `${APP_BASE_URL}/AdminWorkflows?id=${ts.id}`,
    })) || [];

    // Template variables
    const variables = {
      agencyName: agency.name,
      reportDate: formattedDate,
      primaryColor: branding.primaryColor || "#2563eb",
      secondaryColor: branding.secondaryColor || "#7c3aed",
      totalShifts: reportData.stats.totalShifts || 0,
      staffUtilization: reportData.stats.staffUtilization || 0,
      notificationsSent: reportData.stats.notificationsSent || 0,
      hasAlerts,
      criticalAlerts,
      warningAlerts,
      clients,
      pendingTimesheets: pendingTimesheets.length > 0 ? pendingTimesheets : null,
      dashboardUrl: `${APP_BASE_URL}/Dashboard`,
      approveTimesheetsUrl: `${APP_BASE_URL}/AdminWorkflows`,
      agencyPhone: agency.phone || "",
      agencyEmail: agency.contact_email || "",
      preferencesUrl: `${APP_BASE_URL}/AgencySettings`,
      supportUrl: `${APP_BASE_URL}/HelpCenter`,
    };

    // Load and populate template
    const htmlContent = await loadTemplate("daily_agency_digest", variables);

    // Send via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${agency.name} <noreply@agilecaremanagement.co.uk>`,
        to: testMode ? ["test@example.com"] : [recipientEmail],
        subject: `☀️ Daily Digest - ${formattedDate}`,
        html: htmlContent,
      }),
    });

    const emailResult = await emailResponse.json();

    if (emailResponse.ok) {
      await logNotificationSent(supabase, {
        agencyId: agency.id,
        recipientEmail: recipientEmail,
        notificationType: "daily_agency_digest",
        channel: "email",
        provider: "resend",
        providerMessageId: emailResult.id,
      });
      console.log(`✅ Daily email sent to ${agency.name}`);
      return true;
    } else {
      throw new Error(`Resend API error: ${emailResult.message}`);
    }
  } catch (error: any) {
    await logNotificationFailed(supabase, {
      agencyId: agency.id,
      recipientEmail: recipientEmail,
      notificationType: "daily_agency_digest",
      channel: "email",
      errorMessage: error.message,
    });
    console.error(`❌ Email failed for ${agency.name}:`, error);
    return false;
  }
}

// =====================================================
// SEND DAILY WHATSAPP
// =====================================================

async function sendDailyWhatsApp(
  supabase: any,
  agency: any,
  reportData: any,
  reportDate: string,
  testMode: boolean,
  recipient: { id?: string; phone: string; full_name: string },
  appBaseUrl: string
): Promise<boolean> {
  try {
    const recipientPhone = recipient.phone;
    
    // Check rate limits
    const { data: rateLimitCheck } = await supabase
      .rpc("is_rate_limited", { p_phone_number: recipient.phone });

    if (rateLimitCheck) {
      console.log(`⚠️ Rate limited: ${recipient.phone}`);
      return false;
    }

    if (!reportData.clients || reportData.clients.length === 0) return false;

    // Format date for display in WhatsApp
    const dateObj = new Date(reportDate);
    const dateLabel = dateObj.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    // 🔗 Generate Short Link for the Rich Web View
    const targetUrl = `${appBaseUrl}/DailyReportView?token=`; // We'll append the slug after creation
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: linkRecord, error: linkError } = await supabase
      .from("short_links")
      .insert({
        target_url: "", // Temporary, will update after ID generation if needed, but ID is default
        agency_id: agency.id,
        recipient_id: recipient.id,
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();

    if (linkError) {
      console.error("❌ Error creating short link record:", linkError);
      // Fallback: we'll continue without the rich link or use a long one
    }

    const shortId = linkRecord?.id;
    // Update the record with the actual URL if your logic requires absolute target
    // In our case, DailyReportView just needs the token=ID.
    const finalTargetUrl = `${appBaseUrl}/DailyReportView?token=${shortId}`;
    await supabase.from("short_links").update({ target_url: finalTargetUrl }).eq("id", shortId);

    const shortUrl = `${SUPABASE_URL}/functions/v1/url-shortener/${shortId}`;

    // Process alerts for template parameter 6 - now a "TEASER"
    const totalAlerts = (reportData.actionItems?.criticalAlerts?.length || 0) + 
                       (reportData.actionItems?.warningAlerts?.length || 0);
    
    let teaserText = totalAlerts > 0
      ? `🚨 ${totalAlerts} active alerts requiring review.`
      : "✅ No critical issues reported today.";

    // Trigger n8n Meta-Workflow
    const N8N_DIGEST_WEBHOOK = "https://n8n.dreampathai.co.uk/webhook/agency-digest-whatsapp-v3";
    
    console.log(`📤 Triggering n8n webhook with short link: ${shortUrl}`);
    
    const response = await fetch(N8N_DIGEST_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agency_name: agency.name,
        date_label: dateLabel,
        stats: reportData.stats,
        recipient: {
          phone: testMode ? "+447557679989" : recipient.phone,
          full_name: recipient.full_name
        },
        alert_text: teaserText,
        report_url: shortUrl // New parameter for n8n to map to a button or end of message
      })
    });

    console.log(`📥 n8n response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`N8N Webhook failed: ${response.status} - ${errorText}`);
    }

    // Increment rate limit
    await supabase.rpc("increment_rate_limit", {
      p_phone_number: recipient.phone,
    });
    
    // 📝 Log successful handoff to n8n
    await logNotificationSent(supabase, {
        agencyId: agency.id,
        recipientEmail: "",
        recipientPhone: recipient.phone,
        notificationType: "daily_agency_digest",
        channel: "whatsapp",
        provider: "n8n",
        providerMessageId: "n8n_handoff",
    });

    console.log(`✅ Daily WhatsApp handoff to n8n for ${agency.name}`);
    return true;
  } catch (error: any) {
    await logNotificationFailed(supabase, {
      agencyId: agency.id,
      recipientEmail: "",
      recipientPhone: recipient.phone,
      notificationType: "daily_agency_digest",
      channel: "whatsapp",
      errorMessage: error.message,
    });
    console.error(`❌ WhatsApp handoff failed for ${agency.name}:`, error);
    return false;
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function formatRole(role: string | null): string {
  if (!role) return "Staff";

  const roleMap: { [key: string]: string } = {
    healthcare_assistant: "HCA",
    registered_nurse: "RN",
    senior_care_assistant: "Senior HCA",
    care_home_manager: "Manager",
  };

  return roleMap[role] || role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}
