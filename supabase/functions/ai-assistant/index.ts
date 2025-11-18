import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.28.0";

/**
 * 🤖 GENERIC AI ASSISTANT
 *
 * Centralized AI gateway for all LLM operations across the app.
 * Supports multiple modes to handle different AI tasks.
 *
 * Modes:
 * - extract_shifts: Parse natural language into structured shift data
 * - generate_description: Create professional shift descriptions
 * - conversational: General Q&A and assistance
 * - validate: Validate data with AI reasoning
 *
 * Benefits:
 * - Single source of truth for OpenAI integration
 * - Consistent error handling and retry logic
 * - Easy to extend with new AI capabilities
 * - Centralized prompt management
 */

// CORS headers for all responses
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

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
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Parse request body
        const {
            mode = 'conversational',
            prompt,
            response_json_schema = false,
            temperature = 0.7,
            max_tokens = 1000,
            model = 'gpt-4o-mini'
        } = await req.json();

        if (!prompt) {
            return new Response(JSON.stringify({ error: 'Missing required field: prompt' }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        console.log(`🤖 [AI Assistant] Mode: ${mode}, User: ${user.email}`);

        // Initialize OpenAI
        const openai = new OpenAI({
            apiKey: Deno.env.get("OPENAI_API_KEY"),
        });

        // Build messages array based on mode
        const messages: any[] = [];

        // Add system message based on mode
        switch (mode) {
            case 'extract_shifts':
                messages.push({
                    role: 'system',
                    content: 'You are a helpful AI assistant for a healthcare staffing agency. Extract shift details from natural language and return structured JSON data.'
                });
                break;
            case 'generate_description':
                messages.push({
                    role: 'system',
                    content: 'You are a professional healthcare staffing coordinator writing shift descriptions for qualified healthcare workers.'
                });
                break;
            case 'validate':
                messages.push({
                    role: 'system',
                    content: 'You are a data validation assistant. Analyze the provided data and identify any issues, inconsistencies, or missing information.'
                });
                break;
            default: // conversational
                messages.push({
                    role: 'system',
                    content: 'You are a helpful AI assistant for a healthcare staffing agency. Provide clear, concise, and professional responses.'
                });
        }

        // Add user prompt
        messages.push({
            role: 'user',
            content: prompt
        });

        // Call OpenAI with retry logic
        let response;
        let retries = 3;
        
        while (retries > 0) {
            try {
                response = await openai.chat.completions.create({
                    model: model,
                    messages: messages,
                    temperature: temperature,
                    max_tokens: max_tokens,
                    ...(response_json_schema && {
                        response_format: { type: 'json_object' }
                    })
                });
                break; // Success, exit retry loop
            } catch (error: any) {
                retries--;
                if (retries === 0) throw error;
                
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, (3 - retries) * 1000));
                console.log(`⚠️ [AI Assistant] Retry ${3 - retries}/3 after error: ${error.message}`);
            }
        }

        const responseText = response!.choices[0].message.content;

        // Parse JSON if schema was requested
        let data;
        if (response_json_schema) {
            try {
                data = JSON.parse(responseText || '{}');
            } catch (parseError) {
                console.error('❌ [AI Assistant] JSON parse error:', parseError);
                return new Response(JSON.stringify({ 
                    error: 'Failed to parse AI response as JSON',
                    raw_response: responseText 
                }), {
                    status: 500,
                    headers: { "Content-Type": "application/json" }
                });
            }
        } else {
            data = responseText;
        }

        console.log(`✅ [AI Assistant] Success - Mode: ${mode}, Tokens: ${response!.usage?.total_tokens}`);

        return new Response(JSON.stringify({ 
            success: true,
            data: data,
            usage: {
                prompt_tokens: response!.usage?.prompt_tokens,
                completion_tokens: response!.usage?.completion_tokens,
                total_tokens: response!.usage?.total_tokens
            }
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error: any) {
        console.error('❌ [AI Assistant] Error:', error);
        return new Response(JSON.stringify({
            error: error.message || 'Internal server error',
            details: error.toString()
        }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});

