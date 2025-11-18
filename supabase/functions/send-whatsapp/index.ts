import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for all responses
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

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
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const { to, message } = await req.json();

        if (!to || !message) {
            return new Response(JSON.stringify({ error: 'Missing required fields: to, message' }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // ✅ NEW: Use n8n workflow instead of Twilio
        // This allows using WhatsApp Business Cloud API (FREE) instead of Twilio (PAID)
        const N8N_WHATSAPP_WEBHOOK_URL = Deno.env.get("N8N_WHATSAPP_WEBHOOK_URL");
        const USE_N8N = Deno.env.get("USE_N8N_WHATSAPP") === "true";

        if (USE_N8N) {
            // ========================================
            // N8N WORKFLOW PATH (WhatsApp Business Cloud API - FREE)
            // ========================================
            if (!N8N_WHATSAPP_WEBHOOK_URL) {
                console.error('❌ N8N_WHATSAPP_WEBHOOK_URL not configured');
                return new Response(JSON.stringify({ error: 'n8n webhook not configured' }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            console.log(`📤 [n8n] Sending WhatsApp to ${to}`);

            const response = await fetch(N8N_WHATSAPP_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: to,
                    message: message
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('❌ n8n error:', data);
                return new Response(JSON.stringify({ error: 'Failed to send WhatsApp via n8n', details: data }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            console.log('✅ WhatsApp sent successfully via n8n:', data.messageId);
            return new Response(JSON.stringify({ success: true, messageId: data.messageId }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });

        } else {
            // ========================================
            // TWILIO PATH (LEGACY - PAID)
            // ========================================
            const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
            const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
            const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

            if (!TWILIO_WHATSAPP_NUMBER) {
                console.error('❌ TWILIO_WHATSAPP_NUMBER not configured');
                return new Response(JSON.stringify({ error: 'WhatsApp number not configured' }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

            // Ensure phone number has whatsapp: prefix
            const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
            const whatsappFrom = TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:')
                ? TWILIO_WHATSAPP_NUMBER
                : `whatsapp:${TWILIO_WHATSAPP_NUMBER}`;

            console.log(`📤 [Twilio] Sending WhatsApp from ${whatsappFrom} to ${whatsappTo}`);

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
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            console.log('✅ WhatsApp sent successfully via Twilio:', data.sid);
            return new Response(JSON.stringify({ success: true, messageId: data.sid }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }
    } catch (error) {
        console.error('❌ sendWhatsApp error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
