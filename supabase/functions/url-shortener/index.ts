import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const slug = pathParts[pathParts.length - 1];

    // GET /url-shortener/:slug -> Redirection logic
    if (req.method === "GET") {
      // If we are at the root, redirect to home or show error
      if (!slug || slug === "url-shortener") {
        return new Response("Missing link ID. Usage: /url-shortener/:id", { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
      }

      console.log(`🔍 Redirecting for slug: ${slug}`);
      const { data, error } = await supabaseClient
        .from("short_links")
        .select("target_url")
        .eq("id", slug)
        .single();

      if (error || !data) {
        console.error("❌ Link not found:", error);
        return new Response("Report link not found or expired.", { 
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "text/plain" }
        });
      }

      const redirectUrl = new URL(data.target_url);
      redirectUrl.searchParams.set("token", slug);
      return Response.redirect(redirectUrl.toString(), 302);
    }

    // POST /url-shortener -> Creation logic
    if (req.method === "POST") {
      const { target_url, agency_id, recipient_id, expires_days = 7 } = await req.json();

      if (!target_url) {
        return new Response(JSON.stringify({ error: "target_url is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const expires_at = new Date();
      expires_at.setDate(expires_at.getDate() + expires_days);

      const { data, error } = await supabaseClient
        .from("short_links")
        .insert({
          target_url,
          agency_id,
          recipient_id,
          expires_at: expires_at.toISOString(),
        })
        .select("id")
        .single();

      if (error) {
        console.error("❌ Error creating short link:", error);
        throw error;
      }

      const short_url = `${url.origin}/functions/v1/url-shortener/${data.id}`;

      return new Response(JSON.stringify({ short_url, id: data.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error) {
    console.error("❌ Server Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
