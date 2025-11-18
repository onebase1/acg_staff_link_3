import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * 📧 PROFESSIONAL EMAIL SERVICE
 *
 * NOW WITH PROPER SENDER HANDLING:
 * - Staff emails: FROM agency name (e.g., "Dominion Healthcare")
 * - Admin/Client emails: FROM "ACG StaffLink"
 * - All emails: Professional templates with structure
 */

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

        const { to, subject, html, from_name } = await req.json();

        if (!to || !subject || !html) {
            return new Response(JSON.stringify({
                error: 'Missing required fields: to, subject, html'
            }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        const RESEND_FROM_DOMAIN = Deno.env.get("RESEND_FROM_DOMAIN") || "guest-glow.com";

        if (!RESEND_API_KEY) {
            console.error('❌ RESEND_API_KEY not set in environment');
            return new Response(JSON.stringify({
                error: 'Email service not configured. Contact administrator.'
            }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Use provided from_name or default to "ACG StaffLink"
        const senderName = from_name || 'ACG StaffLink';

        console.log(`📧 Sending email to: ${to}`);
        console.log(`📧 Subject: ${subject}`);
        console.log(`📧 From: ${senderName} <noreply@${RESEND_FROM_DOMAIN}>`);

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: `${senderName} <noreply@${RESEND_FROM_DOMAIN}>`,
                to: [to],
                subject: subject,
                html: html,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Resend API error:', data);
            return new Response(JSON.stringify({
                error: 'Failed to send email',
                details: data,
                resendError: true
            }), {
                status: response.status,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        console.log(`✅ Email sent successfully: ${data.id} (from: ${senderName})`);

        return new Response(JSON.stringify({
            success: true,
            messageId: data.id,
            sender: senderName
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error('❌ Email function error:', error);
        const err = error as Error;
        return new Response(JSON.stringify({
            error: err.message,
            stack: err.stack
        }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});





