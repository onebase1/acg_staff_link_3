import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.28.0";

serve(async (req) => {
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
                headers: { "Content-Type": "application/json" }
            });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        const { role, client_name, shift_type, requirements } = await req.json();

        if (!role) {
            return new Response(JSON.stringify({ error: 'Missing required field: role' }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const openai = new OpenAI({
            apiKey: Deno.env.get("OPENAI_API_KEY"),
        });

        const prompt = `Generate a professional shift description for a healthcare agency.

Role: ${role}
Client: ${client_name || 'Care facility'}
Shift Type: ${shift_type || 'Standard shift'}
Special Requirements: ${requirements || 'Standard care duties'}

Write a concise, professional description (2-3 sentences) that would appeal to qualified healthcare workers. Focus on key responsibilities and any special requirements. Keep it professional but friendly.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a professional healthcare staffing coordinator writing shift descriptions for qualified healthcare workers."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 200,
        });

        const description = response.choices[0].message.content.trim();

        return new Response(JSON.stringify({ success: true, description }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
});
