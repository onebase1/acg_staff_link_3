import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "npm:openai@4.28.0";

/**
 * 🤖 INCOMING WHATSAPP HANDLER - n8n Integration
 *
 * Receives incoming WhatsApp messages from n8n receiver workflow
 * Processes with OpenAI GPT-4o-mini for conversational AI
 * Handles: shift queries, timesheet submission, availability
 *
 * Input format (from n8n):
 * {
 *   "from": "+447557679989",
 *   "message": "What's my shifts this week?",
 *   "profileName": "John Doe"
 * }
 */

const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    try {
        const { from, message, profileName, message_type, image_url, image_id, caption } = await req.json();

        console.log(`📱 [WhatsApp Incoming] From: ${from} (${profileName})`);
        console.log(`📱 [WhatsApp Incoming] Type: ${message_type || 'text'}`);
        console.log(`📱 [WhatsApp Incoming] Message: ${message || caption}`);

        if (!from) {
            return new Response(JSON.stringify({ error: 'Missing required field: from' }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Route image messages to timesheet upload handler
        if (message_type === 'image' && image_url) {
            console.log(`📸 [WhatsApp Incoming] Image detected - routing to timesheet upload handler`);

            const { data: uploadResult, error: uploadError } = await supabase.functions.invoke(
                'whatsapp-timesheet-upload-handler',
                {
                    body: {
                        from,
                        message_type,
                        image_url,
                        image_id,
                        caption,
                        profileName
                    }
                }
            );

            if (uploadError) {
                console.error('❌ [WhatsApp Incoming] Timesheet upload handler error:', uploadError);
                return new Response(JSON.stringify({
                    success: false,
                    error: uploadError.message
                }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            console.log(`✅ [WhatsApp Incoming] Timesheet upload handled:`, uploadResult);
            return new Response(JSON.stringify({
                success: true,
                routed_to: 'timesheet-upload-handler',
                result: uploadResult
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Handle text messages
        if (!message) {
            return new Response(JSON.stringify({ error: 'Missing required field: message' }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Check if this is a YES/NO reply to timesheet confirmation
        const normalizedMessage = message.trim().toUpperCase();
        const isConfirmationReply = ['YES', 'Y', 'NO', 'N', '✅', '❌'].includes(normalizedMessage);

        if (isConfirmationReply) {
            console.log(`✅ [WhatsApp Incoming] Confirmation reply detected - routing to interactive handler`);

            const { data: interactiveResult, error: interactiveError } = await supabase.functions.invoke(
                'whatsapp-timesheet-interactive',
                {
                    body: {
                        phone: from,
                        message,
                        profileName
                    }
                }
            );

            if (interactiveError) {
                console.error('❌ [WhatsApp Incoming] Interactive handler error:', interactiveError);
                // Fall through to AI handler if interactive handler fails
            } else {
                console.log(`✅ [WhatsApp Incoming] Interactive confirmation handled:`, interactiveResult);
                return new Response(JSON.stringify({
                    success: true,
                    routed_to: 'interactive-confirmation-handler',
                    result: interactiveResult
                }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }
        }

        // Normalize phone number
        const phone = from.replace(/[^\d+]/g, '');

        // Find staff by phone number
        const staff = await findStaffByPhone(supabase, phone);

        if (!staff) {
            console.log(`❌ [WhatsApp] No staff found for phone: ${phone}`);
            await sendWhatsAppResponse(supabase, phone,
                `👋 Hi! We couldn't find your staff profile.\n\n` +
                `Please contact your agency admin to link your WhatsApp number.`
            );
            return new Response(JSON.stringify({ success: true, message: 'Staff not found' }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        console.log(`✅ [WhatsApp] Staff found: ${staff.first_name} ${staff.last_name}`);

        // Process message with AI
        const response = await processConversationalMessage(supabase, staff, message);

        // Send response via WhatsApp
        await sendWhatsAppResponse(supabase, phone, response);

        return new Response(JSON.stringify({ success: true, response }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('❌ [WhatsApp Incoming] Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});

/**
 * Find staff by phone number (tries multiple formats)
 */
async function findStaffByPhone(supabase: any, phone: string) {
    // Try exact match first
    let { data: staff } = await supabase
        .from("staff")
        .select("*")
        .eq("phone", phone)
        .single();

    if (staff) return staff;

    // Try without country code
    const phoneWithoutCountry = phone.replace(/^\+44/, '0');
    ({ data: staff } = await supabase
        .from("staff")
        .select("*")
        .eq("phone", phoneWithoutCountry)
        .single());

    if (staff) return staff;

    // Try with +44
    const phoneWithCountry = phone.startsWith('+') ? phone : `+44${phone.replace(/^0/, '')}`;
    ({ data: staff } = await supabase
        .from("staff")
        .select("*")
        .eq("phone", phoneWithCountry)
        .single());

    return staff;
}

/**
 * Send WhatsApp response via send-whatsapp Edge Function
 */
async function sendWhatsAppResponse(supabase: any, to: string, message: string) {
    try {
        const { data, error } = await supabase.functions.invoke('send-whatsapp', {
            body: { to, message }
        });

        if (error) {
            console.error('❌ [WhatsApp] Failed to send response:', error);
        } else {
            console.log(`✅ [WhatsApp] Response sent to ${to}`);
        }
    } catch (error) {
        console.error('❌ [WhatsApp] Error sending response:', error);
    }
}

/**
 * Process conversational message with OpenAI
 */
async function processConversationalMessage(supabase: any, staff: any, message: string): Promise<string> {
    const now = new Date();

    // Get staff's upcoming shifts
    const { data: shifts } = await supabase
        .from("shifts")
        .select("*, clients(*)")
        .eq("assigned_staff_id", staff.id);

    const upcomingShifts = shifts?.filter((s: any) => {
        const shiftDate = new Date(s.date);
        return shiftDate >= now && ['confirmed', 'assigned', 'in_progress'].includes(s.status);
    }).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()) || [];

    // Get agency info
    const { data: agency } = await supabase
        .from("agencies")
        .select("*")
        .eq("id", staff.agency_id)
        .single();

    const agencyName = agency?.name || 'your agency';

    console.log(`🤖 [AI] Processing for ${staff.first_name}: "${message}"`);

    // Use OpenAI function calling for intent detection
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: `You are a helpful healthcare staffing assistant for ${agencyName}.

**Context:**
- Staff: ${staff.first_name} ${staff.last_name}
- Upcoming shifts: ${upcomingShifts.length}
- Current date: ${now.toISOString().split('T')[0]}

**Your capabilities:**
1. Show upcoming shifts → Use show_schedule function
2. Show today's shifts → Use show_today function
3. Show this week's shifts → Use show_week function
4. Provide timesheet submission link → Use timesheet_help function
5. Answer general questions about shifts and schedules

**Response rules:**
- Be friendly, professional, and concise
- Use emojis for clarity (📅 dates, 💰 money, ✅ confirmed)
- Keep responses under 1000 characters
- If you call a function, provide a brief confirmation message

Respond naturally to the user's work-related query.`
            },
            {
                role: "user",
                content: message
            }
        ],
        tools: [
            {
                type: "function",
                function: {
                    name: "show_schedule",
                    description: "Show all upcoming confirmed shifts",
                    parameters: { type: "object", properties: {}, required: [] }
                }
            },
            {
                type: "function",
                function: {
                    name: "show_today",
                    description: "Show today's shifts only",
                    parameters: { type: "object", properties: {}, required: [] }
                }
            },
            {
                type: "function",
                function: {
                    name: "show_week",
                    description: "Show this week's shifts",
                    parameters: { type: "object", properties: {}, required: [] }
                }
            },
            {
                type: "function",
                function: {
                    name: "timesheet_help",
                    description: "Provide timesheet submission instructions and link",
                    parameters: { type: "object", properties: {}, required: [] }
                }
            }
        ],
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 500
    });

    const choice = response.choices[0];

    // Check if AI called a function
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        const toolCall = choice.message.tool_calls[0];
        const functionName = toolCall.function.name;

        console.log(`🔧 [AI] Function called: ${functionName}`);

        switch (functionName) {
            case "show_schedule":
                return formatUpcomingShifts(upcomingShifts, staff.first_name);

            case "show_today":
                return formatTodayShifts(upcomingShifts, staff.first_name);

            case "show_week":
                return formatWeekShifts(upcomingShifts, staff.first_name);

            case "timesheet_help":
                return formatTimesheetHelp(staff.first_name);

            default:
                return choice.message.content || "I'm here to help with your shifts!";
        }
    }

    // No function called - return AI's natural response
    return choice.message.content || "I'm here to help with your shifts!";
}


/**
 * Format upcoming shifts for WhatsApp
 */
function formatUpcomingShifts(shifts: any[], staffName: string): string {
    if (shifts.length === 0) {
        return `Hi ${staffName}! 👋\n\nYou have no upcoming shifts scheduled.\n\nCheck the app for available shifts in the marketplace! 📱`;
    }

    let response = `📅 *Your Upcoming Shifts* (${shifts.length})\n\n`;

    shifts.slice(0, 5).forEach((shift: any, index: number) => {
        const date = new Date(shift.date);
        const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });
        const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

        response += `${index + 1}. *${dayName}, ${dateStr}*\n`;
        response += `   📍 ${shift.clients?.name || 'Client'}\n`;
        response += `   ⏰ ${shift.start_time} - ${shift.end_time}\n`;
        if (shift.pay_rate) {
            response += `   💰 £${shift.pay_rate}/hr\n`;
        }
        response += `\n`;
    });

    if (shifts.length > 5) {
        response += `_...and ${shifts.length - 5} more shifts_\n\n`;
    }

    response += `View all shifts in the app! 📱`;

    return response;
}

/**
 * Format today's shifts
 */
function formatTodayShifts(shifts: any[], staffName: string): string {
    const today = new Date().toISOString().split('T')[0];
    const todayShifts = shifts.filter((s: any) => s.date === today);

    if (todayShifts.length === 0) {
        return `Hi ${staffName}! 👋\n\nYou have *no shifts today*.\n\nEnjoy your day off! 😊`;
    }

    let response = `📅 *Today's Shifts* (${todayShifts.length})\n\n`;

    todayShifts.forEach((shift: any) => {
        response += `📍 *${shift.clients?.name || 'Client'}*\n`;
        response += `⏰ ${shift.start_time} - ${shift.end_time}\n`;
        if (shift.work_location_within_site) {
            response += `🏥 ${shift.work_location_within_site}\n`;
        }
        if (shift.pay_rate) {
            response += `💰 £${shift.pay_rate}/hr\n`;
        }
        response += `\n`;
    });

    response += `Good luck with your shift! 💪`;

    return response;
}

/**
 * Format this week's shifts
 */
function formatWeekShifts(shifts: any[], staffName: string): string {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() + 7);

    const weekShifts = shifts.filter((s: any) => {
        const shiftDate = new Date(s.date);
        return shiftDate >= now && shiftDate <= weekEnd;
    });

    if (weekShifts.length === 0) {
        return `Hi ${staffName}! 👋\n\nYou have *no shifts this week*.\n\nCheck the app for available shifts! 📱`;
    }

    let response = `📅 *This Week's Shifts* (${weekShifts.length})\n\n`;

    weekShifts.forEach((shift: any, index: number) => {
        const date = new Date(shift.date);
        const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });
        const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

        response += `${index + 1}. *${dayName}, ${dateStr}*\n`;
        response += `   📍 ${shift.clients?.name || 'Client'}\n`;
        response += `   ⏰ ${shift.start_time} - ${shift.end_time}\n`;
        response += `\n`;
    });

    response += `View details in the app! 📱`;

    return response;
}

/**
 * Format timesheet submission help
 */
function formatTimesheetHelp(staffName: string): string {
    return `Hi ${staffName}! 📋\n\n` +
        `*Timesheet Submission:*\n\n` +
        `1️⃣ *GPS Staff:* Your timesheets are auto-created when you clock in/out via the app. No action needed! ✅\n\n` +
        `2️⃣ *Non-GPS Staff:* Submit your paper timesheet via the Staff Portal:\n` +
        `👉 https://agilecaremanagement.netlify.app/staff/timesheets\n\n` +
        `Need help? Contact your agency admin! 📞`;
}


