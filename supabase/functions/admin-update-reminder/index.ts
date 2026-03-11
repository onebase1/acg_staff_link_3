import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * ADMIN UPDATE REMINDER
 *
 * Sends a twice-daily email to the admin group reminding them to update
 * the system with any new shifts, staff assignments, or staff changes.
 *
 * Triggered by pg_cron at 9:00 AM and 5:00 PM daily.
 * No user auth required — invoked by service role via cron only.
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

    // Determine morning vs afternoon based on current UTC hour
    const hour = new Date().getUTCHours();
    const session = hour < 14 ? "Morning" : "Afternoon";

    const subject = `⏰ ${session} Reminder: Please Update the System`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { background: #ffffff; border-radius: 8px; max-width: 560px; margin: 0 auto; padding: 32px; }
    h2 { color: #1a1a2e; margin-top: 0; }
    .checklist { background: #f0f4ff; border-left: 4px solid #4f46e5; border-radius: 4px; padding: 16px 20px; margin: 20px 0; }
    .checklist li { margin: 10px 0; color: #374151; font-size: 15px; }
    .btn { display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin-top: 20px; }
    .footer { margin-top: 28px; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <h2>⏰ ${session} Check-in — System Update Required</h2>
    <p>Hi Admin,</p>
    <p>This is your ${session.toLowerCase()} reminder to ensure the system is fully up to date. Please take a moment to review and action the following:</p>

    <div class="checklist">
      <ul>
        <li>✅ <strong>New shifts</strong> — Have any new shifts been created or confirmed?</li>
        <li>✅ <strong>Staff assignments</strong> — Are all shifts assigned to the correct staff members?</li>
        <li>✅ <strong>Staff changes</strong> — Any new starters, leavers, or role/status changes?</li>
        <li>✅ <strong>Client updates</strong> — Any changes to client requirements or locations?</li>
        <li>✅ <strong>Pending timesheets</strong> — Are there any timesheets awaiting approval?</li>
      </ul>
    </div>

    <p>Keeping the system current ensures staff receive accurate shift notifications and payroll runs cleanly.</p>

    <a href="${Deno.env.get("SITE_URL") ?? "https://acgstafflink.netlify.app"}/admin" class="btn">
      Open Admin Dashboard →
    </a>

    <div class="footer">
      <p>This is an automated reminder sent at 9:00 AM and 5:00 PM daily.<br>
      To adjust reminder settings, contact your system administrator.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Send via the existing send-email function
    const { error: emailError } = await supabase.functions.invoke("send-email", {
      body: {
        to: adminEmail,
        subject,
        html,
        from_name: "ACG StaffLink",
      },
    });

    if (emailError) {
      throw new Error(`Email send failed: ${emailError.message}`);
    }

    console.log(`✅ Admin update reminder sent to ${adminEmail} (${session})`);

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
