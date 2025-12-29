
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateDatabaseToken } from "../_shared/magic-tokens.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const token = url.searchParams.get('token');

        if (!token) {
            return new Response("Missing token", { status: 400 });
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? "",
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""
        );

        // 1. Validate the token
        const { valid, data, error } = await validateDatabaseToken(supabase, token);

        if (!valid || !data) {
            console.error("❌ Invalid token:", error);
            return new Response("Invalid or expired token", { status: 403 });
        }

        if (data.download_type !== 'profile' || !data.staff_id) {
            console.error("❌ Not a profile token:", data);
            return new Response("Invalid token type", { status: 400 });
        }

        // 2. Log access (Trackable) - For profiles, we DON'T mark it as totally used immediately 
        // so that the client can refresh the page or share the link securely.
        await supabase
            .from('magic_link_tokens')
            .update({ 
                // used_at: new Date().toISOString(), // Remove for profiles to allow multi-read
                metadata: { 
                    ...data.metadata, 
                    last_access: new Date().toISOString(),
                    access_count: (data.metadata?.access_count || 0) + 1,
                    ip: req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')
                }
            })
            .eq('id', data.id);

        // 3. Redirect to staff profile simulation
        // The frontend page is at /staffprofilesimulation?id=[STAFF_ID]
        // We include the token so the frontend can securely fetch data anonymously
        let appUrl = Deno.env.get('VITE_APP_URL');
        
        if (!appUrl) {
           appUrl = 'https://agilecaremanagement.co.uk'; 
        }

        const redirectUrl = `${appUrl}/staffprofilesimulation?id=${data.staff_id}&token=${token}`;
        
        console.log(`✅ Redirecting to staff profile: ${redirectUrl}`);

        return Response.redirect(redirectUrl, 302);

    } catch (err) {
        console.error("Fatal error in staff-profile-linker:", err);
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});
