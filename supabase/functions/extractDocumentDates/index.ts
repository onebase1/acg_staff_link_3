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

        const { image_url, document_type } = await req.json();

        if (!image_url) {
            return new Response(JSON.stringify({ error: 'Missing required field: image_url' }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const openai = new OpenAI({
            apiKey: Deno.env.get("OPENAI_API_KEY"),
        });

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are an OCR expert that extracts key dates and information from compliance documents. Extract: issue date, expiry date, document/certificate number, and issuing authority. Return data in JSON format."
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Extract the following from this ${document_type || 'compliance document'}:
- Issue date (format: YYYY-MM-DD)
- Expiry date (format: YYYY-MM-DD)
- Reference/certificate number
- Issuing authority

Return as JSON: {"issue_date": "...", "expiry_date": "...", "reference_number": "...", "issuing_authority": "..."}`
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: image_url
                            }
                        }
                    ]
                }
            ],
            temperature: 0.1,
            max_tokens: 300,
        });

        const content = response.choices[0].message.content.trim();

        // Try to parse as JSON
        let extracted_data;
        try {
            extracted_data = JSON.parse(content);
        } catch (e) {
            // If not valid JSON, return raw content
            extracted_data = { raw_content: content };
        }

        return new Response(JSON.stringify({ success: true, extracted_data }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
});
