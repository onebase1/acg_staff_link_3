import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * OPTION A: Interactive Timesheet Confirmation (High Confidence)
 * 
 * When OCR confidence ≥80%, send extracted data to staff for confirmation.
 * Staff replies YES to confirm or NO to flag for review.
 * 
 * This function handles the staff's YES/NO reply.
 */
serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { phone, message, timesheet_id } = await req.json();

        console.log(`📱 [Interactive Confirmation] Received reply from ${phone}: "${message}"`);

        // Normalize reply
        const reply = message.trim().toUpperCase();
        const isConfirmed = reply === 'YES' || reply === 'Y' || reply === '✅';
        const isRejected = reply === 'NO' || reply === 'N' || reply === '❌';

        if (!isConfirmed && !isRejected) {
            // Invalid reply - send help message
            await sendWhatsAppResponse(supabase, phone,
                `⚠️ *Invalid Reply*\n\n` +
                `Please reply with:\n` +
                `• YES to confirm the timesheet\n` +
                `• NO if the data needs review\n\n` +
                `_Reply to your most recent timesheet confirmation._`
            );
            return new Response(JSON.stringify({ success: false, error: 'Invalid reply' }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Find staff by phone
        const staff = await findStaffByPhone(supabase, phone);
        if (!staff) {
            return new Response(JSON.stringify({ success: false, error: 'Staff not found' }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Get pending timesheet (most recent with status 'pending_confirmation')
        const { data: timesheet, error: timesheetError } = await supabase
            .from('timesheets')
            .select('*, shifts!inner(*, clients(*))')
            .eq('staff_id', staff.id)
            .eq('status', 'pending_confirmation')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (timesheetError || !timesheet) {
            await sendWhatsAppResponse(supabase, phone,
                `⚠️ *No Pending Timesheet*\n\n` +
                `We couldn't find a timesheet waiting for your confirmation.\n\n` +
                `If you just uploaded one, please wait a moment and try again.`
            );
            return new Response(JSON.stringify({ success: false, error: 'No pending timesheet' }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        if (isConfirmed) {
            // Staff confirmed - auto-approve timesheet
            console.log(`✅ [Interactive Confirmation] Staff confirmed timesheet ${timesheet.id}`);

            const { error: updateError } = await supabase
                .from('timesheets')
                .update({
                    status: 'submitted',
                    staff_approved_at: new Date().toISOString(),
                    notes: (timesheet.notes || '') + '\n[Staff Confirmed] Data verified by staff via WhatsApp'
                })
                .eq('id', timesheet.id);

            if (updateError) {
                console.error('❌ Update error:', updateError);
                throw updateError;
            }

            // Send confirmation
            await sendWhatsAppResponse(supabase, phone,
                `✅ *Timesheet Confirmed!*\n\n` +
                `Thank you for confirming your timesheet for ${timesheet.shifts.clients?.name} (${timesheet.shifts.date}).\n\n` +
                `Your timesheet is now submitted for approval.\n\n` +
                `We'll notify you when it's approved! 🎉`
            );

            // Trigger validation
            await supabase.functions.invoke('intelligent-timesheet-validator', {
                body: { timesheet_id: timesheet.id }
            });

        } else {
            // Staff rejected - flag for admin review
            console.log(`⚠️ [Interactive Confirmation] Staff rejected timesheet ${timesheet.id}`);

            const { error: updateError } = await supabase
                .from('timesheets')
                .update({
                    status: 'pending_review',
                    notes: (timesheet.notes || '') + '\n[Staff Rejected] Staff indicated data needs review via WhatsApp'
                })
                .eq('id', timesheet.id);

            if (updateError) {
                console.error('❌ Update error:', updateError);
                throw updateError;
            }

            // Create admin workflow
            await supabase.from('admin_workflows').insert({
                agency_id: staff.agency_id,
                type: 'timesheet_review_requested',
                priority: 'medium',
                status: 'pending',
                title: `Staff Requested Timesheet Review - ${staff.first_name} ${staff.last_name}`,
                description: `Staff member ${staff.first_name} ${staff.last_name} indicated that their timesheet data needs review.\n\n` +
                    `Timesheet ID: ${timesheet.id}\n` +
                    `Shift: ${timesheet.shifts.clients?.name} (${timesheet.shifts.date})\n\n` +
                    `Please review the extracted data and make any necessary corrections.`,
                related_entity: {
                    entity_type: 'timesheet',
                    entity_id: timesheet.id
                },
                auto_created: true,
                deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            });

            // Send confirmation
            await sendWhatsAppResponse(supabase, phone,
                `✅ *Review Requested*\n\n` +
                `Thank you for letting us know.\n\n` +
                `Your agency admin will review your timesheet for ${timesheet.shifts.clients?.name} (${timesheet.shifts.date}) and make any necessary corrections.\n\n` +
                `We'll notify you when it's approved! 🎉`
            );
        }

        return new Response(JSON.stringify({ success: true, confirmed: isConfirmed }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('❌ [Interactive Confirmation] Error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});

/**
 * Find staff by phone number (tries multiple formats)
 */
async function findStaffByPhone(supabase: any, phone: string) {
    // Try exact match first
    let { data: staff } = await supabase
        .from("staff")
        .select("*")
        .eq("phone", phone)
        .single();

    if (staff) return staff;

    // Try with +44 prefix
    const phoneWith44 = phone.startsWith('+') ? phone : `+44${phone.replace(/^0/, '')}`;
    ({ data: staff } = await supabase
        .from("staff")
        .select("*")
        .eq("phone", phoneWith44)
        .single());

    if (staff) return staff;

    // Try without +44 prefix
    const phoneWithout44 = phone.replace(/^\+44/, '0');
    ({ data: staff } = await supabase
        .from("staff")
        .select("*")
        .eq("phone", phoneWithout44)
        .single());

    return staff;
}

/**
 * Send WhatsApp response via send-whatsapp Edge Function
 */
async function sendWhatsAppResponse(supabase: any, to: string, message: string) {
    try {
        const { data, error } = await supabase.functions.invoke('send-whatsapp', {
            body: { to, message }
        });

        if (error) {
            console.error('❌ [WhatsApp] Failed to send response:', error);
        } else {
            console.log(`✅ [WhatsApp] Response sent to ${to}`);
        }
    } catch (error) {
        console.error('❌ [WhatsApp] Error sending response:', error);
    }
}

