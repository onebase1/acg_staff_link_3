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

        // Authentication check - support both user auth AND service-to-service calls
        const authHeader = req.headers.get('Authorization');
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        // Check if this is a service-to-service call (from another edge function)
        const isServiceCall = authHeader?.replace('Bearer ', '') === serviceRoleKey;

        if (!isServiceCall) {
            // Validate user authentication for direct client calls
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
        }

        console.log(`🔐 [WhatsApp] Auth: ${isServiceCall ? 'service-to-service' : 'user'}`);

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

        let providerUsed = "none";
        let messageId = null;
        let lastError = null;

        // ========================================
        // 1. TRY N8N (WhatsApp Business Cloud API - FREE)
        // ========================================
        if (USE_N8N && N8N_WHATSAPP_WEBHOOK_URL) {
            try {
                console.log(`📤 [n8n] Attempting WhatsApp to ${to}`);
                const response = await fetch(N8N_WHATSAPP_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ to, message }),
                });

                const data = await response.json();
                if (response.ok) {
                    console.log('✅ WhatsApp sent successfully via n8n:', data.messageId || 'Success');
                    return new Response(JSON.stringify({ 
                        success: true, 
                        provider: 'n8n', 
                        messageId: data.messageId 
                    }), {
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                } else {
                    console.error('⚠️ n8n returned error, checking fallback:', data);
                    lastError = data;
                }
            } catch (err) {
                console.error('❌ n8n connection failed, checking fallback:', err.message);
                lastError = err;
            }
        }

        // ========================================
        // 2. FALLBACK TO TWILIO (PAID)
        // ========================================
        const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
        const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
        const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

        if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
            const errorReason = !USE_N8N ? "Twilio credentials missing and n8n disabled" : "n8n failed and Twilio credentials missing";
            console.error(`❌ [Fallback] ${errorReason}`);
            return new Response(JSON.stringify({ 
                error: errorReason, 
                n8nError: lastError 
            }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        try {
            const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
            const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
            const whatsappFrom = TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:')
                ? TWILIO_WHATSAPP_NUMBER
                : `whatsapp:${TWILIO_WHATSAPP_NUMBER}`;

            console.log(`📤 [Twilio] Falling back: Sending WhatsApp from ${whatsappFrom} to ${whatsappTo}`);

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
                return new Response(JSON.stringify({ 
                    error: 'Both n8n and Twilio failed', 
                    twilioError: data, 
                    n8nError: lastError 
                }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            console.log('✅ WhatsApp successfully sent via Twilio Fallback:', data.sid);
            return new Response(JSON.stringify({ 
                success: true, 
                provider: 'twilio', 
                fallback: true, 
                messageId: data.sid 
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });

        } catch (error) {
            console.error('❌ Twilio fallback crash:', error);
            return new Response(JSON.stringify({ error: error.message, n8nError: lastError }), {
                status: 500,
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
