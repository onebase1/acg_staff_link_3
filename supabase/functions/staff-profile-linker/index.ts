
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

        // 2. Log access (Trackable)
        await supabase
            .from('magic_link_tokens')
            .update({ 
                used_at: new Date().toISOString(),
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
        // We derive the app URL from the request origin or a setting
        let appUrl = Deno.env.get('VITE_APP_URL');
        
        // Fallback: If we don't have VITE_APP_URL, we try to guess based on the Supabase URL
        // or just use a relative redirect if possible (but we are in a different domain usually)
        if (!appUrl) {
           const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
           // Common pattern: project-ref.supabase.co -> project-ref.netlify.app or similar
           // But safer to assume the user has configured it. 
           // For now, let's look at what we have in metadata or use a hardcoded fallback 
           // that the user can change.
           appUrl = 'https://agilecaremanagement.co.uk'; // From user screenshot
        }

        const redirectUrl = `${appUrl}/staffprofilesimulation?id=${data.staff_id}`;
        
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
