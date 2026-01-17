import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * 🛠️ SHIFT ENRICHMENT ENGINE
 * 
 * Triggered by: DB Webhook on 'shifts' INSERT
 * Goal: Populate on_duty_contact for non-AI bookings (Zero-Touch UI)
 */

serve(async (req) => {
    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const payload = await req.json();
        const shift = payload.record;

        console.log(`🧹 [Enrichment] Processing new shift ${shift.id}...`);

        // If on_duty_contact is already set (AI booking), skip
        if (shift.on_duty_contact && Object.keys(shift.on_duty_contact).length > 0) {
            console.log(`⏭️ [Enrichment] Shift ${shift.id} already has contact info. Skipping.`);
            return new Response(JSON.stringify({ success: true, message: "Skipped" }));
        }

        // 1. Find the Primary Contact for this client
        const { data: primaryContact, error: contactError } = await supabase
            .from('client_contacts')
            .select('first_name, last_name, phone_number')
            .eq('client_id', shift.client_id)
            .eq('is_primary_contact', true)
            .maybeSingle();

        if (contactError) throw contactError;

        if (!primaryContact) {
            console.warn(`⚠️ [Enrichment] No primary contact found for client ${shift.client_id}`);
            return new Response(JSON.stringify({ success: false, message: "No primary contact" }));
        }

        // 2. Update the shift with the primary contact as fallback
        const { error: updateError } = await supabase
            .from('shifts')
            .update({
                on_duty_contact: {
                    name: `${primaryContact.first_name} ${primaryContact.last_name}`,
                    phone: primaryContact.phone_number,
                    source: "automatic_enrichment"
                }
            })
            .eq('id', shift.id);

        if (updateError) throw updateError;

        console.log(`✅ [Enrichment] Shift ${shift.id} enriched with contact ${primaryContact.first_name}`);

        // 3. (Optional) Trigger the "Interactive Handover" WhatsApp
        // "Hi [Name], a shift was just booked for tomorrow. Are you the on-site contact? [Yes] [No - Update]"
        // For now, we'll just log this as a next step.

        return new Response(JSON.stringify({ 
            success: true, 
            enriched: true,
            contact_name: primaryContact.first_name 
        }));

    } catch (error) {
        console.error('❌ [Enrichment] Error:', error.message);
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
    }
});
