
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
