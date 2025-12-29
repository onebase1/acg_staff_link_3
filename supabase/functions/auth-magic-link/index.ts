
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateDatabaseToken } from "../_shared/magic-tokens.ts";

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

    // 3. Find or Create the user in auth.users
    // We search for an existing user with this email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(recipientEmail);
    
    let user = userData?.user;

    if (!user) {
      console.log(`👤 Creating new user for ${recipientEmail}`);
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: recipientEmail,
        email_confirm: true,
        user_metadata: { role: 'OPERATIONS_MANAGER', agency_id: agencyId, client_id: clientId }
      });

      if (createError) throw createError;
      user = newUser.user;
    }

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
        auth_user_id: user.id
      });
    } else {
        // Update user ID if missing
        await supabase.from('client_contacts').update({ auth_user_id: user.id }).eq('id', contact.id);
    }

    // 5. Generate a magic link session (or just sign them in)
    // We use admin.generateLink to get a recovery/login link that Supabase Auth handles
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: recipientEmail,
        options: { redirectTo: `${Deno.env.get('VITE_APP_URL')}/ClientPortal` }
    });

    if (linkError) throw linkError;

    // 6. Mark token as used
    await supabase.from('magic_link_tokens').update({ used_at: new Date().toISOString() }).eq('id', data.id);

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
