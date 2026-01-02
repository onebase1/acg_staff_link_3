
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// import { validateDatabaseToken } from "../_shared/magic-tokens.ts";

/**
 * Validate a database-backed token
 */
export async function validateDatabaseToken(
    supabase: any,
    token: string
): Promise<{ valid: boolean; data?: any; error?: string }> {
    const { data, error } = await supabase
        .from('magic_link_tokens')
        .select('*')
        .eq('token', token)
        .single();

    if (error || !data) {
        return { valid: false, error: 'Invalid token' };
    }

    if (new Date(data.expires_at) < new Date()) {
        return { valid: false, error: 'Token expired' };
    }

    return { valid: true, data };
}


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? "",
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""
    );

    // 1. Validate the token
    const { valid, data, error } = await validateDatabaseToken(supabase, token);

    if (!valid || !data) {
      console.error("❌ Invalid magic link token:", error);
      return new Response(JSON.stringify({ error: "Invalid or expired link" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Identify recipient
    const recipientEmail = data.client_email || data.metadata?.email;
    const clientId = data.client_id;
    const agencyId = data.agency_id;

    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: "Token missing email context" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`🔑 [Auth Magic Link] Authenticating ${recipientEmail} for client ${clientId}`);

    // 3. Ensure User Exists
    // We attempt to create. If they exist, we just proceed.
    let user;
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: recipientEmail,
        email_confirm: true,
        user_metadata: { role: 'OPERATIONS_MANAGER', agency_id: agencyId, client_id: clientId }
    });

    if (createData?.user) {
        user = createData.user;
    } else if (createError && !createError.message?.includes("already registered")) {
        // If error is ANYTHING other than "already registered", throw it
        throw createError;
    }
    // If "already registered", user is null here, but we will get it from generateLink below
    
    // 4. Generate Link (This also returns the User object)
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: recipientEmail,
        options: { redirectTo: `${Deno.env.get('SITE_URL') ?? 'https://agilecaremanagement.co.uk'}/ClientPortal` }
    });

    if (linkError) throw linkError;

    // Ensure we have the user object
    if (!user && linkData.user) {
        user = linkData.user;
    }

    if (!user) {
        throw new Error("Failed to retrieve User ID for linking");
    }

    // Now we have 'user', we can link the contact
    console.log(`🔗 Linking auth user ${user.id} to client contact...`);

    // 4. Ensure client_contacts link exists
    const { data: contact, error: contactError } = await supabase
      .from('client_contacts')
      .select('id')
      .eq('email', recipientEmail)
      .single();

    if (contactError && contactError.code !== 'PGRST116') throw contactError;

    if (!contact) {
      console.log(`📂 Creating client_contact record for ${recipientEmail}`);
      await supabase.from('client_contacts').insert({
        email: recipientEmail,
        client_id: clientId,
        agency_id: agencyId,
        role: 'OPERATIONS_MANAGER',
        profile_id: user.id
      });
    } else {
        // Update profile ID if missing
        if (!contact.profile_id) {
            await supabase.from('client_contacts').update({ profile_id: user.id }).eq('id', contact.id);
        }
    }

    // 5. Generate a magic link session (Duplicate removed, use linkData from above)
    // We already have linkData from step 4.

    // 6. Mark token as used
    await supabase.from('magic_link_tokens').update({ used_at: new Date().toISOString() }).eq('id', data.id);

    // 7. Audit Log
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';

    const { error: logError } = await supabase.from('magic_link_audit_logs').insert({
        token_id: data.id,
        action: 'authenticated_success',
        email: recipientEmail,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: {
            client_id: clientId,
            agency_id: agencyId,
            auth_user_id: user.id
        }
    });
    
    if (logError) console.error("⚠️ Failed to write audit log:", logError);


    return new Response(JSON.stringify({ 
        success: true, 
        redirect_url: linkData.properties.action_link 
    }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (err) {
    console.error("❌ Fatal error in auth-magic-link:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
