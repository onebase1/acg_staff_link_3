import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * POST-SHIFT FEEDBACK ENGINE
 *
 * Sends a "How did we do?" email to clients 24 hours after a shift
 * is completed, asking for a rating of the staff member.
 *
 * TRIGGER:
 * - Runs once per day via a cron job (e.g., at 11:00 AM).
 *   `0 11 * * *`
 */

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("📧 [Feedback Engine] Starting post-shift feedback job...");

    // 1. Define the time window (24 to 48 hours ago)
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

    // 2. Fetch shifts completed within the window that haven't had a feedback email sent
    const { data: shifts, error: shiftsError } = await supabase
      .from("shifts")
      .select("*, staff:assigned_staff_id(first_name, last_name), client:client_id(name, contact_person)")
      .eq("status", "completed")
      .eq("feedback_email_sent", false) // Ensure we don't send duplicates
      .gte("admin_closed_at", fortyEightHoursAgo) // 'admin_closed_at' is when the shift is truly completed
      .lte("admin_closed_at", twentyFourHoursAgo);

    if (shiftsError) {
      throw new Error(`Failed to fetch completed shifts: ${shiftsError.message}`);
    }

    if (!shifts || shifts.length === 0) {
      console.log("✅ [Feedback Engine] No completed shifts in the time window need a feedback email. Job complete.");
      return new Response(JSON.stringify({ success: true, message: "No shifts to process." }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`📊 [Feedback Engine] Found ${shifts.length} shifts to process.`);

    let emailsSent = 0;
    const errors = [];
    const updatedShiftIds = [];

    // 3. Loop through shifts and send emails
    for (const shift of shifts) {
      const client = shift.client;
      const staff = shift.staff;

      if (!client?.contact_person?.email) {
        console.warn(`⚠️ [Feedback Engine] Skipping shift ${shift.id} - client has no contact email.`);
        continue;
      }
      if (!staff) {
        console.warn(`⚠️ [Feedback Engine] Skipping shift ${shift.id} - no staff member found.`);
        continue;
      }

      const subject = `How was your experience with ${staff.first_name}?`;
      // TODO: Replace with the actual frontend URL for feedback
      const feedbackBaseUrl = `https://your-app-domain.com/feedback`;
      const feedbackLink = (rating) => `${feedbackBaseUrl}?shift_id=${shift.id}&staff_id=${shift.assigned_staff_id}&rating=${rating}`;

      const body_html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 10px;">
            <div style="padding: 30px; text-align: center;">
                <h2 style="margin: 0; color: #1f2937;">How was your experience?</h2>
            </div>
            <div style="padding: 0 30px 30px 30px;">
                <p>Hi ${client.contact_person.name || 'Team'},</p>
                <p>We hope you had a great experience with <strong>${staff.first_name} ${staff.last_name}</strong> during their shift on ${shift.date}.</p>
                <p>Your feedback is crucial for us to ensure we're always providing the best possible service. If you have 30 seconds, would you be willing to leave a quick rating?</p>
                <div style="margin: 30px 0; text-align: center;">
                    <a href="${feedbackLink(1)}" style="text-decoration: none; font-size: 24px; margin: 0 5px;">⭐</a>
                    <a href="${feedbackLink(2)}" style="text-decoration: none; font-size: 24px; margin: 0 5px;">⭐</a>
                    <a href="${feedbackLink(3)}" style="text-decoration: none; font-size: 24px; margin: 0 5px;">⭐</a>
                    <a href="${feedbackLink(4)}" style="text-decoration: none; font-size: 24px; margin: 0 5px;">⭐</a>
                    <a href="${feedbackLink(5)}" style="text-decoration: none; font-size: 24px; margin: 0 5px;">⭐</a>
                </div>
                <p style="color: #6b7280; font-size: 12px; text-align: center;">
                    Thank you for choosing ACG StaffLink. We appreciate your partnership.
                </p>
            </div>
        </div>
      `;

      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: client.contact_person.email,
            subject: subject,
            html: body_html,
          },
        });
        emailsSent++;
        updatedShiftIds.push(shift.id);
        console.log(`✅ [Feedback Engine] Email sent to ${client.name} for shift ${shift.id}.`);
      } catch (emailError) {
        console.error(`❌ [Feedback Engine] Failed to send email for shift ${shift.id}:`, emailError);
        errors.push({ shift_id: shift.id, error: emailError.message });
      }
    }

    // 4. Mark shifts as having had the feedback email sent
    if (updatedShiftIds.length > 0) {
      const { error: updateError } = await supabase
        .from("shifts")
        .update({ feedback_email_sent: true })
        .in("id", updatedShiftIds);

      if (updateError) {
        console.error("❌ [Feedback Engine] CRITICAL: Failed to mark shifts as feedback_email_sent. This may cause duplicate emails.", updateError);
        errors.push({ issue: "Failed to update shifts", details: updateError.message });
      }
    }

    console.log(`✅ [Feedback Engine] Job complete. Sent ${emailsSent} emails. Encountered ${errors.length} errors.`);

    return new Response(JSON.stringify({ success: true, emailsSent, errors }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ [Feedback Engine] Fatal error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
