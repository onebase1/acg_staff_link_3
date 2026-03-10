// =====================================================
// AGENCY CRITICAL ALERT - Edge Function
// =====================================================
// Purpose: Send real-time alerts to agency owners for critical changes
// Triggers: Shift cancellations, staff changes, urgent situations
// Called by: Database triggers or application logic
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logNotificationSent, logNotificationFailed } from "../_shared/notificationLogger.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const APP_BASE_URL = "https://app.agilecaremanagement.co.uk";

interface AlertPayload {
  agency_id: string;
  alert_type: "staff_change" | "shift_cancelled" | "urgent_fill" | "compliance_critical";
  shift_id?: string;
  client_id?: string;
  staff_id?: string;
  old_staff_id?: string;
  new_staff_id?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const payload: AlertPayload = await req.json();

    const {
      agency_id,
      alert_type,
      shift_id,
      client_id,
      staff_id,
      old_staff_id,
      new_staff_id,
      reason,
      metadata = {},
    } = payload;

    if (!agency_id || !alert_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: agency_id, alert_type" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get agency details
    const { data: agency, error: agencyError } = await supabase
      .from("agencies")
      .select("id, name, contact_email, phone, email_notifications, whatsapp_global_notifications")
      .eq("id", agency_id)
      .single();

    if (agencyError || !agency) {
      return new Response(
        JSON.stringify({ error: "Agency not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get contextual data
    let shift = null;
    let client = null;
    let oldStaff = null;
    let newStaff = null;

    if (shift_id) {
      const { data } = await supabase
        .from("shifts")
        .select("*, clients(name)")
        .eq("id", shift_id)
        .single();
      shift = data;
      client = data?.clients;
    }

    if (old_staff_id) {
      const { data } = await supabase
        .from("staff")
        .select("first_name, last_name")
        .eq("id", old_staff_id)
        .single();
      oldStaff = data;
    }

    if (new_staff_id) {
      const { data } = await supabase
        .from("staff")
        .select("first_name, last_name")
        .eq("id", new_staff_id)
        .single();
      newStaff = data;
    }

    // Build alert message based on type
    const alertContent = buildAlertMessage(
      alert_type,
      shift,
      client,
      oldStaff,
      newStaff,
      reason,
      metadata
    );

    // 👥 Multi-Recipient Fetch
    const emailRecipients = new Set<string>();
    const whatsappRecipients = new Map<string, string>(); // phone -> name

    // Add primary contact if enabled
    if (agency.email_notifications && agency.contact_email) {
      emailRecipients.add(agency.contact_email.toLowerCase().trim());
    }
    if (agency.whatsapp_global_notifications && agency.phone) {
      whatsappRecipients.set(agency.phone, agency.name);
    }

    // If multi-admin enabled, fetch additional recipients from profiles
    if (agency.notify_admins_critical) {
      const { data: subscribers } = await supabase
        .from("profiles")
        .select("email, phone, report_email_enabled, report_whatsapp_enabled, full_name")
        .eq("agency_id", agency.id)
        .eq("user_type", "agency_admin");

      if (subscribers) {
        for (const sub of subscribers) {
          if (sub.report_email_enabled && sub.email) {
            emailRecipients.add(sub.email.toLowerCase().trim());
          }
          if (sub.report_whatsapp_enabled && sub.phone) {
            whatsappRecipients.set(sub.phone, sub.full_name || sub.email || "Admin");
          }
        }
      }
    }

    const emailRecipList = Array.from(emailRecipients);
    const whatsappRecipList = Array.from(whatsappRecipients.entries()).map(([phone, name]) => ({ phone, name }));

    // Send Emails
    const emailPromises = emailRecipList.map(email => 
      sendAlertEmail(supabase, agency, alertContent, email, shift_id)
    );

    // Send WhatsApps
    const whatsappPromises = whatsappRecipList.map(rec => 
      sendAlertWhatsApp(supabase, agency, alertContent, rec.phone, shift_id)
    );

    await Promise.allSettled([...emailPromises, ...whatsappPromises]);

    return new Response(
      JSON.stringify({
        message: "Critical alerts processed",
        agency: agency.name,
        alertType: alert_type,
        recipients: {
          emails: emailRecipList.length,
          whatsApp: whatsappRecipList.length,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Critical alert error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

// =====================================================
// BUILD ALERT MESSAGE
// =====================================================

function buildAlertMessage(
  alertType: string,
  shift: any,
  client: any,
  oldStaff: any,
  newStaff: any,
  reason?: string,
  metadata?: Record<string, any>
): {
  title: string;
  subtitle: string;
  details: string[];
  status: string;
  urgency: "critical" | "high" | "medium";
} {
  const shiftDate = shift?.date
    ? new Date(shift.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "";
  const shiftTime = shift?.start_time && shift?.end_time
    ? `${new Date(shift.start_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}-${new Date(shift.end_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
    : "";

  switch (alertType) {
    case "staff_change":
      return {
        title: "Shift Update - Staff Change",
        subtitle: client?.name || "Client",
        details: [
          `Staff change: ${oldStaff ? `${oldStaff.first_name} ${oldStaff.last_name}` : "Unassigned"} → ${newStaff ? `${newStaff.first_name} ${newStaff.last_name}` : "Unassigned"}`,
          `Shift: ${shiftDate} ${shiftTime} ${shift?.role || ""}`,
          `Reason: ${reason || "Not specified"}`,
        ],
        status: newStaff ? "✅ Replacement confirmed" : "⚠️ Needs urgent fill",
        urgency: newStaff ? "medium" : "critical",
      };

    case "shift_cancelled":
      return {
        title: "Shift Cancelled",
        subtitle: client?.name || "Client",
        details: [
          `Cancelled shift: ${shiftDate} ${shiftTime}`,
          `Staff: ${oldStaff ? `${oldStaff.first_name} ${oldStaff.last_name}` : "Unassigned"}`,
          `Role: ${shift?.role || ""}`,
          `Reason: ${reason || "Not specified"}`,
        ],
        status: "❌ Shift cancelled",
        urgency: "high",
      };

    case "urgent_fill":
      return {
        title: "Urgent Shift Needs Filling",
        subtitle: client?.name || "Client",
        details: [
          `Shift: ${shiftDate} ${shiftTime}`,
          `Role: ${shift?.role || ""}`,
          `Starts in: ${metadata?.hoursUntilStart || "less than 24"} hours`,
          `Reason: ${reason || "Unfilled shift"}`,
        ],
        status: "🚨 Immediate action required",
        urgency: "critical",
      };

    case "compliance_critical":
      return {
        title: "Critical Compliance Issue",
        subtitle: "Staff Compliance",
        details: [
          `Staff: ${newStaff ? `${newStaff.first_name} ${newStaff.last_name}` : "Unknown"}`,
          `Issue: ${reason || "Compliance document expired"}`,
          `Affected shift: ${shiftDate} ${shiftTime}`,
        ],
        status: "⚠️ Requires immediate attention",
        urgency: "critical",
      };

    default:
      return {
        title: "Alert",
        subtitle: client?.name || "",
        details: [reason || "No details provided"],
        status: "ℹ️ Review required",
        urgency: "medium",
      };
  }
}

// =====================================================
// SEND ALERT EMAIL
// =====================================================

async function sendAlertEmail(
  supabase: any,
  agency: any,
  alertContent: any,
  recipientEmail: string,
  shiftId?: string
) {
  try {
    const urgencyColors = {
      critical: "#dc3545",
      high: "#ffc107",
      medium: "#17a2b8",
    };

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${urgencyColors[alertContent.urgency]}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; border-radius: 0 0 8px 8px; }
    .detail { margin: 10px 0; padding: 8px; background: white; border-left: 3px solid ${urgencyColors[alertContent.urgency]}; }
    .status { font-weight: bold; color: ${urgencyColors[alertContent.urgency]}; margin: 15px 0; }
    .cta { display: inline-block; padding: 12px 24px; background: ${urgencyColors[alertContent.urgency]}; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0; }
    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 12px; color: #6c757d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">🚨 ${alertContent.title}</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">${alertContent.subtitle}</p>
    </div>
    <div class="content">
      ${alertContent.details.map((detail: string) => `<div class="detail">${detail}</div>`).join("")}
      <div class="status">${alertContent.status}</div>
      ${shiftId ? `<a href="${APP_BASE_URL}/shifts/${shiftId}" class="cta">View Shift Details</a>` : ""}
    </div>
    <div class="footer">
      <p><strong>${agency.name}</strong></p>
      <p>This is an automated critical alert from ACG StaffLink</p>
    </div>
  </div>
</body>
</html>`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${agency.name} <alerts@agilecaremanagement.co.uk>`,
        to: [recipientEmail],
        subject: `🚨 ${alertContent.title} - ${alertContent.subtitle}`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();

    if (emailResponse.ok) {
      await logNotificationSent(supabase, {
        agency_id: agency.id,
        recipient_email: recipientEmail,
        recipient_name: agency.name,
        notification_type: "critical_alert",
        channel: "email",
        provider: "resend",
        provider_message_id: emailResult.id,
      });
      console.log(`✅ Critical alert email sent to ${recipientEmail}`);
    } else {
      throw new Error(`Resend API error: ${emailResult.message}`);
    }
  } catch (error) {
    await logNotificationFailed(supabase, {
      agency_id: agency.id,
      recipient_email: recipientEmail,
      notification_type: "critical_alert",
      channel: "email",
      error_message: error.message,
    });
    console.error(`❌ Critical alert email failed for ${recipientEmail}:`, error);
  }
}

// =====================================================
// SEND ALERT WHATSAPP
// =====================================================

async function sendAlertWhatsApp(
  supabase: any,
  agency: any,
  alertContent: any,
  recipientPhone: string,
  shiftId?: string
) {
  try {
    const { data: rateLimitCheck } = await supabase
      .rpc("is_rate_limited", { p_phone_number: recipientPhone });

    if (rateLimitCheck) {
      console.log(`⚠️ Rate limited: ${recipientPhone}, skipping WhatsApp alert`);
      return;
    }

    const urgencyEmoji = {
      critical: "🚨",
      high: "⚠️",
      medium: "ℹ️",
    };

    const message = `${urgencyEmoji[alertContent.urgency]} ${alertContent.title} - ${alertContent.subtitle}

${alertContent.details.join("\n")}

${alertContent.status}

${shiftId ? `📱 View shift details:\n${APP_BASE_URL}/shifts/${shiftId}` : ""}

Questions? Reply to this message.`;

    if (message.length > 1024) {
      console.warn(`⚠️ WhatsApp alert too long: ${message.length} chars`);
    }

    const whatsappResponse = await supabase.functions.invoke("send-whatsapp", {
      body: {
        to: recipientPhone,
        message,
        notification_type: "critical_alert",
        agency_id: agency.id,
      },
    });

    if (whatsappResponse.error) {
      throw whatsappResponse.error;
    }

    await supabase.rpc("increment_rate_limit", {
      p_phone_number: recipientPhone,
    });

    console.log(`✅ Critical alert WhatsApp sent to ${recipientPhone}`);
  } catch (error) {
    await logNotificationFailed(supabase, {
      agency_id: agency.id,
      recipient_phone: recipientPhone,
      notification_type: "critical_alert",
      channel: "whatsapp",
      error_message: error.message,
    });
    console.error(`❌ Critical alert WhatsApp failed for ${recipientPhone}:`, error);
  }
}
