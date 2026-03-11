import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getBranding, getEmailFooter } from "../_shared/getBranding.ts";

/**
 * ADMIN UPDATE REMINDER
 *
 * Sends a twice-daily email to the admin group reminding them to keep
 * the system current (shifts, staff assignments, staff changes).
 *
 * Triggered by pg_cron at 10:00 UTC (≈11am UK) and 13:00 UTC (≈2pm UK).
 * From name: "Kylie from ACG" — feels personal, avoids spam filters.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const adminEmail = Deno.env.get("ADMIN_EMAIL_GROUP");
    if (!adminEmail) {
      console.error("ADMIN_EMAIL_GROUP env var not set");
      return new Response(
        JSON.stringify({ error: "ADMIN_EMAIL_GROUP not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load branding (SaaS defaults — no specific agency)
    const branding = await getBranding(supabase);

    // Determine session: 10:00 UTC = morning check, 13:00 UTC = afternoon check
    const hour = new Date().getUTCHours();
    const isMorning = hour < 12;

    // Subject lines that feel like internal ops comms, not mass mail
    const subject = isMorning
      ? "Quick check — anything to update on the system this morning?"
      : "Afternoon check — any shifts or staff changes to add before close?";

    const greeting = isMorning
      ? "Hope your morning is going well."
      : "Hope the afternoon is going smoothly.";

    const context = isMorning
      ? "Before the day gets busy, it's worth a quick check to make sure everything is loaded and up to date."
      : "Before you wrap up for the day, here's a quick checklist to make sure nothing has been missed.";

    const footer = getEmailFooter(branding, false);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>System Check</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;padding:24px 0;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header gradient bar -->
          <tr>
            <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:28px 36px;">
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.75);letter-spacing:1px;text-transform:uppercase;">ACG StaffLink</p>
              <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;font-weight:700;">
                ${isMorning ? "Morning" : "Afternoon"} System Check
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 36px;">

              <p style="margin:0 0 8px;color:#374151;font-size:15px;">Hi,</p>
              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
                ${greeting} ${context}
              </p>

              <!-- Checklist -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8f7ff;border-left:4px solid #667eea;border-radius:0 8px 8px 0;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#667eea;text-transform:uppercase;letter-spacing:0.5px;">Today's checklist</p>

                    <!-- Item 1 -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
                      <tr>
                        <td width="28" valign="top" style="padding-top:1px;">
                          <div style="width:22px;height:22px;background:#667eea;border-radius:50%;text-align:center;line-height:22px;font-size:12px;color:#fff;font-weight:700;">1</div>
                        </td>
                        <td style="padding-left:10px;">
                          <span style="font-weight:700;color:#1f2937;font-size:14px;">New shifts</span><br>
                          <span style="color:#6b7280;font-size:13px;">Any new shifts confirmed or received today that need adding?</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Item 2 -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
                      <tr>
                        <td width="28" valign="top" style="padding-top:1px;">
                          <div style="width:22px;height:22px;background:#667eea;border-radius:50%;text-align:center;line-height:22px;font-size:12px;color:#fff;font-weight:700;">2</div>
                        </td>
                        <td style="padding-left:10px;">
                          <span style="font-weight:700;color:#1f2937;font-size:14px;">Staff assignments</span><br>
                          <span style="color:#6b7280;font-size:13px;">Are all upcoming shifts assigned to the right staff members?</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Item 3 -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
                      <tr>
                        <td width="28" valign="top" style="padding-top:1px;">
                          <div style="width:22px;height:22px;background:#667eea;border-radius:50%;text-align:center;line-height:22px;font-size:12px;color:#fff;font-weight:700;">3</div>
                        </td>
                        <td style="padding-left:10px;">
                          <span style="font-weight:700;color:#1f2937;font-size:14px;">Staff changes</span><br>
                          <span style="color:#6b7280;font-size:13px;">New starters, leavers, suspensions, or role changes to record?</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Item 4 -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
                      <tr>
                        <td width="28" valign="top" style="padding-top:1px;">
                          <div style="width:22px;height:22px;background:#764ba2;border-radius:50%;text-align:center;line-height:22px;font-size:12px;color:#fff;font-weight:700;">4</div>
                        </td>
                        <td style="padding-left:10px;">
                          <span style="font-weight:700;color:#1f2937;font-size:14px;">Pending timesheets</span><br>
                          <span style="color:#6b7280;font-size:13px;">Any submitted timesheets waiting for your approval?</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Item 5 -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="28" valign="top" style="padding-top:1px;">
                          <div style="width:22px;height:22px;background:#764ba2;border-radius:50%;text-align:center;line-height:22px;font-size:12px;color:#fff;font-weight:700;">5</div>
                        </td>
                        <td style="padding-left:10px;">
                          <span style="font-weight:700;color:#1f2937;font-size:14px;">Client updates</span><br>
                          <span style="color:#6b7280;font-size:13px;">Any changes to care requirements, locations, or contacts?</span>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
                Keeping things current means staff get the right notifications, payroll runs smoothly, and nothing falls through the gaps.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:8px;">
                    <a href="${branding.adminDashboardUrl}"
                       style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">
                      Open Admin Dashboard →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 36px 28px;">
              ${footer}
              <p style="margin:12px 0 0;color:#d1d5db;font-size:11px;">
                This is sent at 11:00 and 14:00 (UK time) on working days.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>`;

    // Send via the shared send-email function
    const { error: emailError } = await supabase.functions.invoke("send-email", {
      body: {
        to: adminEmail,
        subject,
        html,
        from_name: "Kylie from ACG",
      },
    });

    if (emailError) {
      throw new Error(`Email send failed: ${emailError.message}`);
    }

    const session = isMorning ? "morning" : "afternoon";
    console.log(`✅ Admin update reminder sent (${session}) to ${adminEmail}`);

    return new Response(
      JSON.stringify({ success: true, session, sent_to: adminEmail }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("admin-update-reminder error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
