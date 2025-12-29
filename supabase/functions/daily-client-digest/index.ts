import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Database import removed to reduce deployment size
import { 
    shouldSendNotification,
    logNotificationSent,
    logNotificationFailed,
    logNotificationSkipped,
    getBranding,
    loadTemplate,
    generateStaffProfileLink
} from "../_shared/all.ts";
import { scheduleRetry } from "../_shared/retryHandler.ts";

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
    const supabase = createClient<Database>(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check for trigger type
    let body: { manual_trigger?: boolean; client_id?: string; agency_id?: string } = {};
    try {
        const json = await req.json();
        body = json;
    } catch {
        // No body
    }

    const isManualTrigger = body.manual_trigger === true;
    const targetClientId = body.client_id;

    console.log(`📧 [Client Digest] Starting daily client digest job... Manual: ${isManualTrigger}`);

    // 1. Calculate tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // ...
    const tomorrowDisplay = tomorrow.toLocaleDateString('en-GB', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });

    // 2. Fetch all shifts for tomorrow that are confirmed or in_progress
    const { data: shifts, error: shiftsError } = await supabase
      .from("shifts")
      .select("*, staff:assigned_staff_id(first_name, last_name)") // removed phone
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
    const clientIds = [...new Set(shifts.map(s => s.client_id))];

    // 4. Fetch all clients and their linked agencies
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, name, contact_person, agency_id, agencies(name, email, phone, address)")
      .in("id", clientIds);

    if (clientsError) {
      throw new Error(`Failed to fetch clients: ${clientsError.message}`);
    }

    let emailsSent = 0;
    const errors = [];

    // 5. Loop through clients and send digest emails
    for (const client of clients) {
      const recipientEmail = client.contact_person?.email;
      if (!recipientEmail) {
        console.warn(`⚠️ [Client Digest] Skipping client ${client.name} (ID: ${client.id}) - no contact email.`);
        continue;
      }

      const agency = (client as any).agencies;
      const clientShifts = shifts.filter(s => s.client_id === client.id);
      
      // Get branding for this agency
      const branding = await getBranding(supabase, client.agency_id);
      
      // Override SaaS branding with Agency specific "From" name as requested by user
      // "from needs to be {{agency_name}} not our saas name"
      const { from_name } = getEmailFrom(branding, agency?.name || branding.saasName);

      const subject = `Your ${agency?.name || 'Staffing'} Schedule for Tomorrow, ${tomorrowStr}`;
      
      // Build shift rows HTML
      const shiftsHtml = await Promise.all(clientShifts.map(async (shift) => {
        let profileLinkHtml = '';
        if (shift.assigned_staff_id) {
          try {
            const profileLink = await generateStaffProfileLink(
              supabase,
              shift.assigned_staff_id,
              client.id,
              client.agency_id
            );
            profileLinkHtml = `<br><a href="${profileLink}" style="color: #0284c7; text-decoration: none; font-size: 11px; font-weight: bold;">[📋 View Profile]</a>`;
          } catch (err) {
            console.warn(`⚠️ [Client Digest] Failed to generate profile link for staff ${shift.assigned_staff_id}:`, err);
          }
        }

        const staffName = shift.staff ? (([shift.staff.first_name, shift.staff.last_name].filter(Boolean).join(' ')) || 'Staff') : 'TBC';

        return `
            <tr>
              <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151;">
                <strong>${shift.start_time} - ${shift.end_time}</strong>
              </td>
              <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151;">
                ${shift.role_required.replace(/_/g, ' ')}
              </td>
              <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151;">
                <strong>${staffName}</strong>${profileLinkHtml}
              </td>
              <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; text-align: right;">
                <span style="display: inline-block; background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 12px;">
                  ✅ Confirmed
                </span>
              </td>
            </tr>
          `;
      }));

      const shiftsHtmlString = shiftsHtml.join("");

      // Populate template
      const body_html = await loadTemplate('daily_client_digest', {
        contact_name: client.contact_person.name || 'Team',
        tomorrow_date: tomorrowDisplay,
        shift_rows: shiftsHtmlString,
        portal_url: branding.clientPortalUrl,
        client_name: client.name,
        agency_name: agency?.name || branding.saasName,
        agency_email: agency?.email || branding.supportEmail,
        agency_phone: agency?.phone || branding.supportPhone,
        agency_address: agency?.address || '',
        current_year: new Date().getFullYear().toString()
      });

      try {
        // Check preference
        const preferenceCheck = await shouldSendNotification(
            supabase,
            recipientEmail,
            'daily_digest',
            'email',
            'client'
        );

        if (!preferenceCheck.allowed) {
            console.log(`⏭️ [Client Digest] Skipped for ${client.name} - ${preferenceCheck.reason}`);
            await logNotificationSkipped(supabase, {
                recipientEmail: recipientEmail,
                recipientType: 'client',
                clientId: client.id,
                agencyId: client.agency_id,
                notificationType: 'daily_digest',
                channel: 'email',
                preferenceChecked: preferenceCheck.preferenceChecked,
                preferenceStatus: preferenceCheck.preferenceStatus,
                skippedReason: preferenceCheck.reason,
                metadata: { shift_count: clientShifts.length }
            });
            continue;
        }

        const emailResult = await supabase.functions.invoke('send-email', {
          body: {
            to: recipientEmail,
            from_name: from_name, // Use the agency-branded name
            subject: subject,
            html: body_html,
          },
        });

        if (emailResult.error) throw new Error(emailResult.error);

        // Log success
        await logNotificationSent(supabase, {
            recipientEmail: recipientEmail,
            recipientType: 'client',
            clientId: client.id,
            agencyId: client.agency_id,
            notificationType: 'daily_digest',
            channel: 'email',
            provider: 'resend',
            providerMessageId: emailResult?.data?.id,
            preferenceChecked: preferenceCheck.preferenceChecked,
            preferenceStatus: preferenceCheck.preferenceStatus,
            metadata: { shift_count: clientShifts.length }
        });

        emailsSent++;
        console.log(`✅ [Client Digest] Email sent to ${client.name}.`);
      } catch (emailError: any) {
        console.error(`❌ [Client Digest] Failed to send email to ${client.name}:`, emailError);
        
        // Log failure
        await logNotificationFailed(supabase, {
            recipientEmail: recipientEmail,
            recipientType: 'client',
            clientId: client.id,
            agencyId: client.agency_id,
            notificationType: 'daily_digest',
            channel: 'email',
            errorMessage: emailError.message,
            errorCode: 'send_failed'
        });

        // Schedule retry
        await scheduleRetry(supabase, {
            notificationType: 'daily_digest',
            recipientEmail: recipientEmail,
            recipientId: client.id,
            agencyId: client.agency_id,
            channel: 'email',
            metadata: { clientId: client.id } 
        });

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
