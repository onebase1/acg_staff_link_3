// =====================================================
// WEEKLY AGENCY SUMMARY - Edge Function
// =====================================================
// Purpose: Send weekly summary email + WhatsApp to agency owners
// Schedule: Weekly on Mondays at 8:00 AM
// Cron: 0 8 * * 1
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadTemplate, formatDateRange } from "../_shared/templateLoader.ts";
import { getBranding } from "../_shared/getBranding.ts";
import { logNotificationSent, logNotificationFailed } from "../_shared/notificationLogger.ts";
import { formatToE164 } from "../_shared/phoneHelper.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") || "https://agilecaremanagement.co.uk";
const APP_BASE_URL = SITE_URL.replace("app.", "").replace(/\/$/, "");

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { agency_id, week_start_date, test_mode = false } = await req.json().catch(() => ({}));

    // Default to start of current week (Monday)
    const weekStart = week_start_date || getWeekStartDate();
    const weekEnd = getWeekEndDate(weekStart);

    // Get agencies to process
    let agenciesToProcess: any[] = [];

    if (agency_id) {
      const { data: agency } = await supabase
        .from("agencies")
        .select("id, name, contact_email, phone, email_notifications, whatsapp_global_notifications")
        .eq("id", agency_id)
        .single();

      if (agency) agenciesToProcess = [agency];
    } else {
      const { data: agencies } = await supabase
        .from("agencies")
        .select("id, name, contact_email, phone, email_notifications, whatsapp_global_notifications, country_code")
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

    for (const agency of agenciesToProcess) {
      try {
        // Get weekly report data
        const { data: reportData, error: reportError } = await supabase
          .rpc("get_weekly_agency_report", {
            p_agency_id: agency.id,
            p_week_start_date: weekStart,
          });

        if (reportError) {
          console.error(`Error fetching weekly report for ${agency.name}:`, reportError);
          results.push({ agency: agency.name, status: "error", error: reportError.message });
          continue;
        }

        // Get notification effectiveness data
        const { data: notificationData } = await supabase
          .rpc("get_notification_effectiveness", {
            p_agency_id: agency.id,
            p_start_date: weekStart,
            p_end_date: weekEnd,
          });

        // Get agency branding
        const branding = await getBranding(supabase, agency.id);

        // 👥 Multi-Recipient Fetch: Get all profiles with reporting enabled
        const { data: subscribers } = await supabase
          .from("profiles")
          .select("email, phone, report_email_enabled, report_whatsapp_enabled, full_name")
          .eq("agency_id", agency.id)
          .or("report_email_enabled.eq.true,report_whatsapp_enabled.eq.true");

        // 📨 Prepare Email Recipients
        const emailRecipients: any[] = subscribers?.filter((s: any) => s.report_email_enabled && s.email) || [];
        // Fallback to agency contact_email if no one is explicitly subscribed
        if (emailRecipients.length === 0 && agency.email_notifications && agency.contact_email) {
          emailRecipients.push({ email: agency.contact_email, full_name: agency.name });
        }

        // 📨 Prepare WhatsApp Recipients
        const whatsappRecipientsMap = new Map();
        subscribers?.forEach((s: any) => {
          if (s.report_whatsapp_enabled && s.phone) {
            const canonical = formatToE164(s.phone, agency.country_code || "UK");
            if (canonical && !whatsappRecipientsMap.has(canonical)) {
              whatsappRecipientsMap.set(canonical, { phone: canonical, full_name: s.full_name });
            }
          }
        });

        // Fallback to agency phone if no one is explicitly subscribed
        if (whatsappRecipientsMap.size === 0 && agency.whatsapp_global_notifications && agency.phone) {
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
          const success = await sendWeeklyEmail(
            supabase,
            agency,
            reportData,
            notificationData,
            branding,
            weekStart,
            weekEnd,
            test_mode,
            recipient.email
          );
          if (success) successfulEmails++;
        }

        // 💬 Send WhatsApps
        let successfulWhatsApps = 0;
        for (const recipient of whatsappRecipients) {
          const success = await sendWeeklyWhatsApp(
            supabase,
            agency,
            reportData,
            notificationData,
            weekStart,
            weekEnd,
            test_mode,
            recipient
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
        message: "Weekly agency summary sent",
        weekStart,
        weekEnd,
        processed: results.length,
        results,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Weekly summary error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// =====================================================
// SEND WEEKLY EMAIL
// =====================================================

async function sendWeeklyEmail(
  supabase: any,
  agency: any,
  reportData: any,
  notificationData: any,
  branding: any,
  weekStart: string,
  weekEnd: string,
  testMode: boolean,
  recipientEmail: string
): Promise<boolean> {
  try {
    const weekRange = formatDateRange(new Date(weekStart), new Date(weekEnd));

    // Calculate trends
    const thisWeekShifts = reportData.summary.shiftsCompleted || 0;
    const lastWeekShifts = reportData.summary.shiftsCompletedLastWeek || 0;
    const shiftsChange = thisWeekShifts - lastWeekShifts;
    const shiftsChangePercent = lastWeekShifts > 0
      ? Math.round((shiftsChange / lastWeekShifts) * 100)
      : 0;

    const thisWeekRevenue = reportData.financial.totalRevenue || 0;
    const lastWeekRevenue = reportData.financial.lastWeekRevenue || 0;
    const revenueChange = thisWeekRevenue - lastWeekRevenue;
    const revenueChangePercent = lastWeekRevenue > 0
      ? Math.round((revenueChange / lastWeekRevenue) * 100)
      : 0;

    const staffCosts = reportData.financial.staffCosts || 0;
    const platformCosts = reportData.financial.platformCosts || 0;
    const netProfit = thisWeekRevenue - staffCosts - platformCosts;
    const lastWeekProfit = lastWeekRevenue - reportData.financial.lastWeekStaffCosts - platformCosts;
    const profitMargin = thisWeekRevenue > 0
      ? Math.round((netProfit / thisWeekRevenue) * 100)
      : 0;

    // Top staff formatting
    const topStaff = reportData.topStaff?.slice(0, 5).map((staff: any, index: number) => ({
      position: index + 1,
      name: staff.name,
      metric: `${staff.on_time_rate}% on-time, ${staff.avg_rating}★`,
    })) || [];

    // Client breakdown
    const clients = reportData.clients?.map((client: any) => ({
      name: client.name,
      shifts: client.shifts,
      hours: Math.round(client.hours),
      revenue: formatCurrency(client.revenue),
    })) || [];

    // Notification channels
    const notificationChannels = notificationData?.channels?.map((channel: any) => ({
      name: channel.channel.charAt(0).toUpperCase() + channel.channel.slice(1),
      icon: channel.icon,
      sent: channel.sent,
      deliveryRate: channel.deliveryRate || 0,
      openRate: channel.openRate || 0,
      clickRate: channel.clickRate || null,
    })) || [];

    // Compliance alerts
    const complianceAlerts = reportData.complianceAlerts?.map((alert: any) => ({
      title: `Documents Expiring in ${alert.period}`,
      items: alert.items || [],
    })).filter((alert: any) => alert.items.length > 0) || null;

    // Generate insights
    const insights = generateInsights(reportData, notificationData);

    // Template variables
    const variables = {
      agencyName: agency.name,
      weekRange,
      primaryColor: branding.primaryColor || "#2563eb",
      secondaryColor: branding.secondaryColor || "#7c3aed",

      // Executive summary
      totalRevenue: formatCurrency(thisWeekRevenue),
      revenueTrend: revenueChangePercent >= 0 ? "trend-up" : "trend-down",
      revenueTrendText: `${revenueChangePercent >= 0 ? "↑" : "↓"} ${Math.abs(revenueChangePercent)}% vs last week`,

      shiftsCompleted: thisWeekShifts,
      shiftsTrend: shiftsChangePercent >= 0 ? "trend-up" : "trend-down",
      shiftsTrendText: `${shiftsChangePercent >= 0 ? "↑" : "↓"} ${Math.abs(shiftsChangePercent)}% vs last week`,

      profitMargin,
      marginTrend: profitMargin >= 20 ? "trend-up" : profitMargin >= 15 ? "trend-neutral" : "trend-down",
      marginTrendText: profitMargin >= 20 ? "↑ Healthy" : profitMargin >= 15 ? "→ Stable" : "↓ Monitor",

      staffUtilization: reportData.summary.staffUtilization || 0,
      fillRate: reportData.summary.fillRate || 0,

      // Financial breakdown
      lastWeekRevenue: formatCurrency(lastWeekRevenue),
      revenueChange: `${revenueChange >= 0 ? "+" : ""}£${Math.abs(revenueChange).toFixed(0)} ${revenueChangePercent >= 0 ? "↑" : "↓"}`,
      staffCosts: formatCurrency(staffCosts),
      lastWeekStaffCosts: formatCurrency(reportData.financial.lastWeekStaffCosts || 0),
      staffCostsChange: formatChange(staffCosts - (reportData.financial.lastWeekStaffCosts || 0)),
      platformCosts: formatCurrency(platformCosts),
      lastWeekPlatformCosts: formatCurrency(platformCosts),
      platformCostsChange: "→",
      netProfit: formatCurrency(netProfit),
      lastWeekNetProfit: formatCurrency(lastWeekProfit),
      profitChange: formatChange(netProfit - lastWeekProfit),
      profitTrend: netProfit >= lastWeekProfit ? "trend-up" : "trend-down",

      // Performance data
      topStaff,
      clients,
      totalNotifications: notificationData?.totalNotifications || 0,
      notificationChannels,
      complianceAlerts,
      insights,

      // URLs
      dashboardUrl: `${APP_BASE_URL}/AdminWorkflows`,
      agencyPhone: agency.phone || "",
      agencyEmail: agency.contact_email || "",
      preferencesUrl: `${APP_BASE_URL}/AgencySettings`,
      supportUrl: `${APP_BASE_URL}/HelpCenter`,
      downloadPdfUrl: `${APP_BASE_URL}/AdminWorkflows`,
    };

    // Load and populate template
    const htmlContent = await loadTemplate("weekly_agency_summary", variables);

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
        subject: `📊 Weekly Summary - ${weekRange}`,
        html: htmlContent,
      }),
    });

    const emailResult = await emailResponse.json();

    if (emailResponse.ok) {
      await logNotificationSent(supabase, {
        agencyId: agency.id,
        recipientEmail: recipientEmail,
        notificationType: "weekly_agency_summary",
        channel: "email",
        provider: "resend",
        providerMessageId: emailResult.id,
      });
      console.log(`✅ Weekly summary email sent to ${recipientEmail}`);
      return true;
    } else {
      throw new Error(`Resend API error: ${emailResult.message}`);
    }
  } catch (error: any) {
    await logNotificationFailed(supabase, {
      agencyId: agency.id,
      recipientEmail: recipientEmail,
      notificationType: "weekly_agency_summary",
      channel: "email",
      errorMessage: error.message,
    });
    console.error(`❌ Weekly email failed for ${agency.name}:`, error);
    return false;
  }
}

// =====================================================
// SEND WEEKLY WHATSAPP
// =====================================================

async function sendWeeklyWhatsApp(
  supabase: any,
  agency: any,
  reportData: any,
  notificationData: any,
  weekStart: string,
  weekEnd: string,
  testMode: boolean,
  recipient: { phone: string; full_name: string }
): Promise<boolean> {
  try {
    const recipientPhone = recipient.phone;
    const { data: rateLimitCheck } = await supabase
      .rpc("is_rate_limited", { p_phone_number: recipientPhone });

    if (rateLimitCheck) {
      console.log(`⚠️ Rate limited: ${recipientPhone}`);
      return false;
    }

    const weekRange = formatDateRange(new Date(weekStart), new Date(weekEnd));
    
    // Process stats for summary
    const shiftsCompleted = reportData.summary.shiftsCompleted || 0;
    const revenue = reportData.financial.totalRevenue || 0;
    const costs = (reportData.financial.staffCosts || 0) + (reportData.financial.platformCosts || 0);
    const profit = revenue - costs;
    const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
    
    // Top 3 staff for "Urgent" or "Highlights" section
    const topStaffList = reportData.topStaff?.slice(0, 3).map((staff: any) =>
      `• ${staff.name} (${staff.on_time_rate}% on-time)`
    ).join("\n") || "No staff data available.";

    // Trigger n8n Meta-Workflow (Reuse same agency-digest template for now with specific parameters)
    const N8N_DIGEST_WEBHOOK = "https://n8n.dreampathai.co.uk/webhook/agency-digest-whatsapp-v3";
    
    const response = await fetch(N8N_DIGEST_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agency_name: agency.name,
        date_label: `WEEK: ${weekRange}`,
        stats: {
          totalShifts: shiftsCompleted,
          staffUtilization: reportData.summary.staffUtilization || 0,
          pendingWorkflows: profit.toFixed(0) // Hijacking this for profit value in weekly
        },
        recipient: {
          phone: testMode ? "+447557679989" : recipientPhone,
          full_name: recipient.full_name
        },
        alert_text: `Highlights:\n${topStaffList}\nProfit: £${Math.round(profit)} (${margin}% margin)`
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`N8N Webhook failed: ${response.status} - ${errorText}`);
    }

    await supabase.rpc("increment_rate_limit", {
      p_phone_number: recipientPhone,
    });

    // 📝 Log successful handoff to n8n
    await logNotificationSent(supabase, {
        agencyId: agency.id,
        recipientEmail: "",
        recipientPhone: recipientPhone,
        notificationType: "weekly_agency_summary",
        channel: "whatsapp",
        provider: "n8n",
        providerMessageId: "n8n_handoff",
    });

    console.log(`✅ Weekly WhatsApp handoff to n8n for ${agency.name}`);
    return true;
  } catch (error: any) {
    await logNotificationFailed(supabase, {
      agencyId: agency.id,
      recipientEmail: "",
      recipientPhone: recipient.phone,
      notificationType: "weekly_agency_summary",
      channel: "whatsapp",
      errorMessage: error.message,
    });
    console.error(`❌ Weekly WhatsApp handoff failed for ${agency.name}:`, error);
    return false;
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getWeekStartDate(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday as start
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

function getWeekEndDate(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end.toISOString().split("T")[0];
}

function formatCurrency(amount: number): string {
  return Math.round(amount).toLocaleString();
}

function formatChange(change: number): string {
  if (change === 0) return "→";
  const sign = change > 0 ? "+" : "";
  const arrow = change > 0 ? "↑" : "↓";
  return `${sign}£${Math.abs(change).toFixed(0)} ${arrow}`;
}

function generateInsights(reportData: any, notificationData: any): any[] | null {
  const insights = [];

  // Revenue growth insight
  const revenueGrowth = reportData.financial.totalRevenue - reportData.financial.lastWeekRevenue;
  const growthPercent = reportData.financial.lastWeekRevenue > 0
    ? Math.round((revenueGrowth / reportData.financial.lastWeekRevenue) * 100)
    : 0;

  if (growthPercent >= 10) {
    insights.push({
      title: "Strong Week Performance",
      content: `Revenue up ${growthPercent}% compared to last week. Fill rate remained high at ${reportData.summary.fillRate}%. Consider adding more shifts to capitalize on demand.`,
    });
  } else if (growthPercent < -10) {
    insights.push({
      title: "Revenue Dip Detected",
      content: `Revenue down ${Math.abs(growthPercent)}% this week. Review shift patterns and client demand to identify opportunities.`,
    });
  }

  // WhatsApp engagement insight
  const whatsappChannel = notificationData?.channels?.find((c: any) => c.channel === "whatsapp");
  const emailChannel = notificationData?.channels?.find((c: any) => c.channel === "email");

  if (whatsappChannel && emailChannel && whatsappChannel.openRate > emailChannel.openRate * 1.5) {
    insights.push({
      title: "WhatsApp Driving Engagement",
      content: `WhatsApp messages have ${whatsappChannel.openRate}% open rate vs ${emailChannel.openRate}% for email. Consider shifting more time-sensitive notifications to WhatsApp.`,
    });
  }

  // Staff utilization insight
  if (reportData.summary.staffUtilization < 70) {
    insights.push({
      title: "Staff Underutilized",
      content: `Only ${reportData.summary.staffUtilization}% of your staff worked this week. Consider marketing to new clients or offering more shifts to existing clients.`,
    });
  }

  return (insights.length > 0 ? insights : null) as any[] | null;
}
