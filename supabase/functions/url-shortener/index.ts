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
    
    // Improved slug detection: Look for an 8-character hex string or the last part
    let slug = pathParts.find(p => p.length === 8 && /^[a-f0-9]+$/.test(p)) || pathParts[pathParts.length - 1];
    
    // Fallback: If slug is missing or matches function name, check query params
    if (!slug || slug === "url-shortener" || slug === "v1" || slug === "functions") {
      slug = url.searchParams.get("id") || url.searchParams.get("token") || "";
    }

    console.log(`[url-shortener] Method: ${req.method}, Path: ${url.pathname}, Resolved Slug: ${slug}`);

    // GET /url-shortener/:slug -> Redirection logic
    if (req.method === "GET") {
      // If still missing a slug, show a nice HTML error
      if (!slug || slug === "url-shortener") {
        return new Response(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Invalid Report Link | ACG StaffLink</title>
              <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f1f5f9; color: #1e293b; }
                  .card { background: white; padding: 2.5rem; border-radius: 1.5rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); text-align: center; max-width: 420px; border: 1px solid #e2e8f0; }
                  .icon { font-size: 4rem; margin-bottom: 1.5rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.05)); }
                  h1 { font-size: 1.5rem; font-weight: 800; margin-bottom: 1rem; color: #0f172a; letter-spacing: -0.025em; }
                  p { font-size: 1rem; color: #64748b; line-height: 1.6; margin-bottom: 2rem; }
                  .btn { display: inline-block; background: #4f46e5; color: white; padding: 0.75rem 1.5rem; border-radius: 0.75rem; text-decoration: none; font-weight: 600; transition: background 0.2s; }
                  .btn:hover { background: #4338ca; }
              </style>
          </head>
          <body>
              <div class="card">
                  <div class="icon">🔗</div>
                  <h1>Link ID Missing</h1>
                  <p>The operational report link you followed is incomplete. Please try clicking the button in WhatsApp again or refresh the page.</p>
                  <a href="https://agilecaremanagement.co.uk" class="btn">Go to Dashboard</a>
              </div>
          </body>
          </html>
        `, { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "text/html" }
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
