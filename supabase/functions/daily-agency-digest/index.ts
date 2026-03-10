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

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Deep link base URL
const SITE_URL = Deno.env.get("SITE_URL") || "https://agilecaremanagement.co.uk";
const APP_BASE_URL = SITE_URL.replace("app.", "").replace(/\/$/, "");

serve(async (req) => {
  const logs: string[] = [];
  const log = (msg: string, data?: any) => {
    const s = `${msg} ${data ? JSON.stringify(data) : ""}`;
    console.log(s);
    logs.push(s);
  };

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request
    const body = await req.json().catch(() => ({}));
    const { agency_id, report_date, test_mode = false, return_payload = false } = body;

    const targetDate = report_date || new Date().toISOString().split('T')[0];
    const results: any[] = [];

    // Get agencies to process
    let agenciesToProcess: any[] = [];

    if (agency_id) {
      const { data: agency } = await supabase
        .from("agencies")
        .select("id, name, contact_email, phone, email_notifications, whatsapp_global_notifications, notify_admins_daily")
        .eq("id", agency_id)
        .single();
      if (agency) agenciesToProcess = [agency];
    } else {
      const { data: agencies } = await supabase
        .from("agencies")
        .select("id, name, contact_email, phone, email_notifications, whatsapp_global_notifications, notify_admins_daily")
        .or("whatsapp_global_notifications.eq.true,email_notifications.eq.true");
      agenciesToProcess = agencies || [];
    }
    
    log(`🏢 Found ${agenciesToProcess.length} agencies to process`);

    if (agenciesToProcess.length === 0) {
      return new Response(JSON.stringify({ message: "No agencies to process" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Process each agency
    for (const agency of agenciesToProcess) {
      log(`🔍 Processing agency: ${agency.name}`, { id: agency.id });
      const payloads = await prepareAgencyDigest(supabase, agency, targetDate, !!test_mode, !!return_payload, log);
      if (payloads && Array.isArray(payloads)) {
        log(`✅ Generated ${payloads.length} payloads for ${agency.name}`);
        results.push(...payloads);
      } else {
        log(`⚠️ No payloads generated for ${agency.name}`);
      }
    }

    // Return JSON if requested (for n8n pull model)
    if (return_payload) {
      return new Response(JSON.stringify({ 
        processed: agenciesToProcess.length,
        results: results,
        debug_logs: logs
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ message: `Handoff complete for ${agenciesToProcess.length} agencies` }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("❌ Critical error in daily-agency-digest:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});

/**
 * Prepares the digest data for a single agency.
 * Handles stats fetching, short link generation, and payload sanitization.
 */
async function prepareAgencyDigest(supabase: any, agency: any, targetDate: string, test_mode: boolean, return_payload: boolean, log: Function) {
  try {
    log(`💉 Calling RPC get_daily_agency_report for ${agency.name} on ${targetDate}`);
    const { data: reportData, error: reportError } = await supabase.rpc(
      "get_daily_agency_report",
      {
        p_agency_id: agency.id,
        p_report_date: targetDate,
      }
    );

    if (reportError) {
      log(`❌ RPC Error for ${agency.name}`, reportError);
      throw reportError;
    }
    
    if (!reportData) {
      log(`⚠️ No report data for ${agency.name} on ${targetDate}`);
      return null;
    }

    log(`📊 Report data fetched for ${agency.name}`, { stats: reportData.stats });

    // Get recipients (Agency Admins/Managers)
    log(`👤 Fetching recipients for ${agency.name}`);
    
    let recipientsQuery = supabase
      .from("profiles")
      .select("full_name, email, phone, report_email_enabled, report_whatsapp_enabled")
      .eq("agency_id", agency.id);

    if (agency.notify_admins_daily) {
      // Fetch all admins with either email or whatsapp reports enabled
      recipientsQuery = recipientsQuery.eq("user_type", "agency_admin")
        .or("report_email_enabled.eq.true,report_whatsapp_enabled.eq.true");
    } else {
      // Legacy: only those with WhatsApp reporting explicitly enabled
      recipientsQuery = recipientsQuery.eq("report_whatsapp_enabled", true);
    }

    const { data: recipients, error: recError } = await recipientsQuery;

    if (recError) {
      log(`❌ Recipient Query Error for ${agency.name}`, recError);
      throw recError;
    }

    log(`👤 Found ${recipients?.length || 0} recipients`);

    const dateLabel = new Date(targetDate).toLocaleDateString('en-GB', { 
        weekday: 'short', day: 'numeric', month: 'short' 
    });

    // --- SHORT LINK GENERATION ---
    log(`🔗 Generating short link for ${agency.name}`);
    const { data: linkRecord, error: linkError } = await supabase
      .from("short_links")
      .insert({
        target_url: `${APP_BASE_URL}/DailyReportView?agencyId=${agency.id}&date=${targetDate}`,
        agency_id: agency.id
      })
      .select("id")
      .single();

    if (linkError) {
      log(`❌ Short Link Error for ${agency.name}`, linkError);
    }

    const shortId = linkRecord?.id;
    // Construct the direct function URL for redirection
    const shortUrl = shortId 
      ? `${SUPABASE_URL}/functions/v1/url-shortener/${shortId}`
      : `${APP_BASE_URL}/DailyReportView?agencyId=${agency.id}&date=${targetDate}`;

    log(`🔗 Short link ready`, { shortId, url: shortUrl });

    // Meta API Compliant Teaser (ASCII only, no newlines)
    const statsResult = reportData.stats || {};
    const criticals = reportData.actionItems?.criticalAlerts?.length || 0;
    const warnings = reportData.actionItems?.warningAlerts?.length || 0;
    const totalAlerts = criticals + warnings;

    const normalizedStats = {
      active_shifts: statsResult.confirmedShifts || 0,
      filled_rate: statsResult.staffUtilization || 0,
      pending_alerts: totalAlerts,
      total_shifts: statsResult.totalShifts || 0,
      pending_shifts: statsResult.pendingShifts || 0,
    };

    const teaserText = `*${normalizedStats.total_shifts}* shifts scheduled, *${normalizedStats.filled_rate}%* filled. Please verify & update the roster before client alert dispatch.`;

    const agencyPayloads: any[] = [];
    for (const recipient of recipients || []) {
      // Extract first name only for the greeting
      const firstName = (recipient.full_name || "Agency Admin").trim().split(' ')[0];

      const payload = {
        agency_name: agency.name,
        date_label: dateLabel,
        stats: normalizedStats,
        recipient: {
          phone: recipient.phone,
          email: recipient.email,
          first_name: firstName,
          full_name: recipient.full_name,
          email_enabled: recipient.report_email_enabled,
          whatsapp_enabled: recipient.report_whatsapp_enabled
        },
        alert_text: teaserText,
        report_url: shortUrl,
        short_link_id: shortId || "missing"
      };
      
      agencyPayloads.push(payload);
    }

    log(`✅ Prepared ${agencyPayloads.length} payloads for ${agency.name}`);
    return agencyPayloads;
  } catch (error: any) {
    console.error(`❌ prepareAgencyDigest error for ${agency.name}:`, error);
    return null;
  }
}
