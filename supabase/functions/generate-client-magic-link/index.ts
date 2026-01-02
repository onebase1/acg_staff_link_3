
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateDatabaseToken } from "../_shared/all.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { client_email, client_id, agency_id } = await req.json();

    if (!client_email || !client_id) {
      return new Response(JSON.stringify({ error: "Missing email or client_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? "",
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""
    );

    // 1. Generate the token
    // Using 7 days as requested by user to reduce refresh friction
    const { token } = await generateDatabaseToken(supabase, {
      client_id,
      agency_id,
      client_email,
      download_type: 'profile', // We reuse this column or can add 'auth' later
      expires_days: 7,
      metadata: { 
        email: client_email,
        auth_type: 'magic_link',
        portal: 'client'
      }
    });

    // 2. Construct the magic link URL
    // This points to our AuthMagicLink landing page on the frontend
    const appUrl = Deno.env.get('VITE_APP_URL') || 'https://agilecaremanagement.co.uk';
    const magicLink = `${appUrl}/auth/magic?token=${token}`;

    console.log(`✉️ [Generate Magic Link] Created link for ${client_email}: ${magicLink}`);

    // 3. Send Email
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: client_email,
        subject: '🔐 Your Secure Login Link',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4f46e5;">Secure Login Request</h2>
            <p>You requested a secure login link for the Client Portal.</p>
            <p>Click the button below to sign in instantly:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${magicLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Portal</a>
            </div>
            <p style="color: #666; font-size: 12px;">This link expires in 7 days.</p>
          </div>
        `,
        from_name: 'Agile Care Management' // ideally dynamic from agency
      }
    });

    if (emailError) {
        console.error("⚠️ Failed to send email:", emailError);
        // We still return success but maybe warn?
    }

    return new Response(JSON.stringify({ success: true, magicLink, token }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("❌ Fatal error in generate-client-magic-link:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
