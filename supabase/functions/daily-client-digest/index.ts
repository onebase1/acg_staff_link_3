import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * DAILY CLIENT DIGEST
 *
 * Sends a "Ready for Tomorrow" email to each client with a summary of their
 * confirmed shifts for the next day.
 *
 * TRIGGER:
 * - Runs once per day via a cron job (e.g., at 10:00 AM).
 *   `0 10 * * *`
 */

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("📧 [Client Digest] Starting daily client digest job...");

    // 1. Calculate tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // 2. Fetch all shifts for tomorrow that are confirmed or in_progress
    const { data: shifts, error: shiftsError } = await supabase
      .from("shifts")
      .select("*, staff:assigned_staff_id(first_name, last_name)")
      .eq("date", tomorrowStr)
      .in("status", ["confirmed", "in_progress"]);

    if (shiftsError) {
      throw new Error(`Failed to fetch shifts for tomorrow: ${shiftsError.message}`);
    }

    if (!shifts || shifts.length === 0) {
      console.log("✅ [Client Digest] No shifts scheduled for tomorrow. Job complete.");
      return new Response(JSON.stringify({ success: true, message: "No shifts for tomorrow." }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`📊 [Client Digest] Found ${shifts.length} shifts for ${tomorrowStr}.`);

    // 3. Group shifts by client
    const shiftsByClient = shifts.reduce((acc, shift) => {
      if (!acc[shift.client_id]) {
        acc[shift.client_id] = [];
      }
      acc[shift.client_id].push(shift);
      return acc;
    }, {});

    // 4. Fetch all clients
    const clientIds = Object.keys(shiftsByClient);
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, name, contact_person")
      .in("id", clientIds);

    if (clientsError) {
      throw new Error(`Failed to fetch clients: ${clientsError.message}`);
    }

    let emailsSent = 0;
    const errors = [];

    // 5. Loop through clients and send digest emails
    for (const client of clients) {
      if (!client.contact_person?.email) {
        console.warn(`⚠️ [Client Digest] Skipping client ${client.name} (ID: ${client.id}) - no contact email.`);
        continue;
      }

      const clientShifts = shiftsByClient[client.id];
      const subject = `Your ACG Staffing Schedule for Tomorrow, ${tomorrowStr}`;
      const shiftsHtml = clientShifts
        .map(
          (shift) => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${shift.start_time} - ${shift.end_time}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${shift.role_required.replace(/_/g, ' ')}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${shift.staff?.first_name || 'Staff'} ${shift.staff?.last_name || ''}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">✅ Confirmed</td>
            </tr>
          `
        )
        .join("");

      const body_html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f3f4f6; padding: 20px; text-align: center;">
                <h2 style="margin: 0; color: #1f2937;">Your Schedule for Tomorrow</h2>
            </div>
            <div style="padding: 30px;">
                <p>Hi ${client.contact_person.name || 'Team'},</p>
                <p>Here is a summary of your scheduled staff for tomorrow, <strong>${tomorrowStr}</strong>. All staff have confirmed their attendance and have been sent automated reminders.</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <thead>
                        <tr>
                            <th style="padding: 8px; border-bottom: 2px solid #e5e7eb; text-align: left;">Time</th>
                            <th style="padding: 8px; border-bottom: 2px solid #e5e7eb; text-align: left;">Role</th>
                            <th style="padding: 8px; border-bottom: 2px solid #e5e7eb; text-align: left;">Staff Member</th>
                            <th style="padding: 8px; border-bottom: 2px solid #e5e7eb; text-align: left;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${shiftsHtml}
                    </tbody>
                </table>
                <p style="margin-top: 20px; color: #6b7280; font-size: 12px;">This is an automated daily summary from ACG StaffLink.</p>
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
        console.log(`✅ [Client Digest] Email sent to ${client.name}.`);
      } catch (emailError) {
        console.error(`❌ [Client Digest] Failed to send email to ${client.name}:`, emailError);
        errors.push({ client_id: client.id, error: emailError.message });
      }
    }

    console.log(`✅ [Client Digest] Job complete. Sent ${emailsSent} emails. Encountered ${errors.length} errors.`);

    return new Response(JSON.stringify({ success: true, emailsSent, errors }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ [Client Digest] Fatal error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
