import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * INTERNAL ADMIN NOTIFIER
 *
 * A simple, internal-only function to send critical alerts and updates
 * to a predefined admin email group.
 *
 * SECURITY:
 * - Requires authenticated user to invoke.
 * - Sends emails ONLY to the hardcoded ADMIN_EMAIL_GROUP from env vars.
 */

serve(async (req) => {
  try {
    // 1. Initialize Supabase client with SERVICE_ROLE_KEY
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 2. Authenticate the user who is making the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // 3. Get subject and body from the request
    const { subject, body_html, change_type } = await req.json();
    if (!subject || !body_html) {
      return new Response(
        JSON.stringify({ error: 'Subject and body_html are required.' }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 4. Get the destination email from environment variables
    const adminEmail = Deno.env.get("ADMIN_EMAIL_GROUP");
    if (!adminEmail) {
      console.error("CRITICAL: ADMIN_EMAIL_GROUP environment variable is not set.");
      // Don't throw an error, just log it. The primary action (e.g., confirming a shift) should still succeed.
      return new Response(
        JSON.stringify({ success: false, message: "Admin email not configured." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Invoke the send-email function
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: adminEmail,
        subject: subject,
        html: body_html
      }
    });

    if (emailError) {
      throw new Error(`Email sending failed: ${emailError.message}`);
    }

    // 6. Log the notification for audit purposes
    try {
      await supabase.from("change_logs").insert({
        change_type: change_type || 'internal_notification',
        new_value: subject,
        reason: `Internal notification sent to admin group.`,
        changed_by: user.id,
        changed_by_email: user.email,
        risk_level: 'low',
      });
    } catch (logError) {
      console.warn("Failed to create change log for internal notification:", logError);
    }

    // 7. Return a success response
    return new Response(
      JSON.stringify({ success: true, message: `Notification sent to admin group.` }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Internal Admin Notifier Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
