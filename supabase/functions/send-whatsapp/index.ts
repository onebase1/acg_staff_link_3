import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Authentication check
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        const { to, message } = await req.json();

        if (!to || !message) {
            return new Response(JSON.stringify({ error: 'Missing required fields: to, message' }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
        const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
        const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER"); // ✅ CHANGED: Use WhatsApp-specific number

        if (!TWILIO_WHATSAPP_NUMBER) {
            console.error('❌ TWILIO_WHATSAPP_NUMBER not configured');
            return new Response(JSON.stringify({ error: 'WhatsApp number not configured' }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

        // Ensure phone number has whatsapp: prefix
        const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

        // ✅ IMPROVED: Handle whatsapp: prefix intelligently
        const whatsappFrom = TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:')
            ? TWILIO_WHATSAPP_NUMBER
            : `whatsapp:${TWILIO_WHATSAPP_NUMBER}`;

        console.log(`📤 Sending WhatsApp from ${whatsappFrom} to ${whatsappTo}`);

        const response = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    To: whatsappTo,
                    From: whatsappFrom,
                    Body: message,
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Twilio error:', data);
            return new Response(JSON.stringify({ error: 'Failed to send WhatsApp', details: data }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        console.log('✅ WhatsApp sent successfully:', data.sid);
        return new Response(JSON.stringify({ success: true, messageId: data.sid }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error('❌ sendWhatsApp error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
});
