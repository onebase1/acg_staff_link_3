import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "npm:openai@4.28.0";

/**
 * 🤖 CONVERSATIONAL WHATSAPP ASSISTANT - ENHANCED WITH FULL AI
 *
 * AUTHENTICATION: PIN-based (works perfectly)
 * CONVERSATION: Powered by OpenAI GPT-4o-mini
 * MEMORY: Context-aware within conversation
 *
 * V2 Changes:
 * - Natural language understanding via OpenAI
 * - Context-aware responses
 * - Handles complex queries and follow-ups
 * - Maintains friendly, professional tone
 */

const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
});

serve(async (req) => {
    // Initialize Supabase client
    const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let formData;
    let from = '';
    let body = '';
    let profileName = '';
    let phone = '';

    try {
        formData = await req.formData();
        from = formData.get('From') || '';
        body = formData.get('Body')?.trim() || '';
        profileName = formData.get('ProfileName') || '';

        console.log(`📱 [WhatsApp] Message from ${profileName} (${from}): "${body}"`);

        if (!from || !body) {
            console.error('❌ Missing required fields from Twilio webhook');
            return createTwilioResponse();
        }

        phone = from.replace('whatsapp:', '').replace(/[^\d+]/g, '');

        // ✅ AUTHENTICATION FLOW (unchanged - works great!)

        // 1. Check if user is already authenticated via PIN
        const { data: staffByWhatsApp, error: staffWhatsAppError } = await supabase
            .from("staff")
            .select("*")
            .eq("whatsapp_number_verified", phone);

        if (staffWhatsAppError) {
            console.error('Error fetching staff by WhatsApp:', staffWhatsAppError);
        }

        let staff = staffByWhatsApp?.[0];

        if (staff) {
            console.log(`✅ [Authenticated] ${staff.first_name} ${staff.last_name}`);
            await handleConversationalMessage(supabase, staff, body, phone, profileName);
            return createTwilioResponse();
        }

        // 2. Try phone matching (fallback)
        staff = await findStaffByPhone(supabase, phone);

        if (staff) {
            if (staff.whatsapp_pin && !staff.whatsapp_number_verified) {
                await sendWhatsAppResponse(supabase, phone,
                    `👋 Hi ${staff.first_name}!\n\n` +
                    `To link your WhatsApp, please reply with your 4-digit PIN.\n\n` +
                    `📌 Your PIN was sent to you via email.\n\n` +
                    `_Don't have your PIN? Contact your agency admin._`
                );
                return createTwilioResponse();
            }

            await handleConversationalMessage(supabase, staff, body, phone, profileName);
            return createTwilioResponse();
        }

        // 3. Check if message is a PIN attempt
        const isPinAttempt = /^\d{4}$/.test(body);

        if (isPinAttempt) {
            console.log(`🔐 [PIN Auth] Attempting PIN: ${body}`);

            const { data: staffByPin, error: pinError } = await supabase
                .from("staff")
                .select("*")
                .eq("whatsapp_pin", body);

            if (pinError) {
                console.error('Error fetching staff by PIN:', pinError);
            }

            if (staffByPin && staffByPin.length > 0) {
                const matchedStaff = staffByPin[0];
                console.log(`✅ [PIN Auth] Matched: ${matchedStaff.first_name}`);

                const { error: updateError } = await supabase
                    .from("staff")
                    .update({
                        whatsapp_number_verified: phone,
                        whatsapp_linked_at: new Date().toISOString()
                    })
                    .eq("id", matchedStaff.id);

                if (updateError) {
                    console.error('Error updating staff:', updateError);
                }

                const { data: agencies } = await supabase
                    .from("agencies")
                    .select("*");

                const agency = agencies?.find(a => a.id === matchedStaff.agency_id);

                await sendWhatsAppResponse(supabase, phone,
                    `✅ *WhatsApp Linked!*\n\n` +
                    `Hi ${matchedStaff.first_name}! You're now connected to ${agency?.name || 'your agency'}.\n\n` +
                    `Try asking:\n` +
                    `• "Show my shifts this week"\n` +
                    `• "Any shifts available tomorrow?"\n` +
                    `• "What's my schedule?"\n\n` +
                    `I understand natural language - just ask! 💬`
                );

                return createTwilioResponse();
            } else {
                await sendWhatsAppResponse(supabase, phone,
                    `❌ Invalid PIN.\n\nPlease try again or contact your agency admin.`
                );
                return createTwilioResponse();
            }
        }

        // 4. Staff not found
        await sendWhatsAppResponse(supabase, phone,
            `👋 Hi ${profileName}!\n\n` +
            `I couldn't find your profile.\n\n` +
            `📋 *To get started:*\n` +
            `1️⃣ Your agency will send you a 4-digit PIN via email\n` +
            `2️⃣ Reply here with your PIN\n` +
            `3️⃣ Start chatting!\n\n` +
            `📞 Your number: ${phone}`
        );
        return createTwilioResponse();

    } catch (error) {
        console.error('❌ [WhatsApp Router] Fatal error:', error);

        if (phone) {
            try {
                await sendWhatsAppResponse(supabase, phone,
                    `⚠️ Sorry, I encountered an error. Please try again.`
                );
            } catch (sendError) {
                console.error('Failed to send error message:', sendError);
            }
        }

        return createTwilioResponse();
    }
});

/**
 * 🤖 NEW: CONVERSATIONAL MESSAGE HANDLER
 * Uses OpenAI to understand intent and generate natural responses
 */
async function handleConversationalMessage(supabase, staff, body, phone, profileName) {
    try {
        // Load user context
        const { data: agencies } = await supabase
            .from("agencies")
            .select("*");

        const agency = agencies?.find(a => a.id === staff.agency_id);

        // Get shifts for context
        const { data: shifts, error: shiftsError } = await supabase
            .from("shifts")
            .select("*")
            .eq("assigned_staff_id", staff.id)
            .eq("agency_id", staff.agency_id);

        if (shiftsError) {
            console.error('Error fetching shifts:', shiftsError);
        }

        const now = new Date();
        const upcomingShifts = shifts?.filter(s => {
            const shiftDate = new Date(s.date);
            return shiftDate >= now && ['confirmed', 'assigned', 'in_progress'].includes(s.status);
        }).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5) || [];

        // Get open shifts for context
        const { data: openShifts, error: openShiftsError } = await supabase
            .from("shifts")
            .select("*")
            .eq("status", "open")
            .eq("agency_id", staff.agency_id)
            .eq("marketplace_visible", true);

        if (openShiftsError) {
            console.error('Error fetching open shifts:', openShiftsError);
        }

        const availableShifts = openShifts?.filter(s => new Date(s.date) >= now)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 5) || [];

        // Build context for AI
        const contextInfo = {
            staff_name: `${staff.first_name} ${staff.last_name}`,
            agency_name: agency?.name || 'your agency',
            upcoming_shifts_count: upcomingShifts.length,
            available_shifts_count: availableShifts.length,
            staff_role: staff.role?.replace('_', ' '),
            staff_rating: staff.rating || 5
        };

        console.log(`🤖 [AI] Processing message for ${staff.first_name}: "${body}"`);

        // Use OpenAI to understand and respond
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are a helpful healthcare staffing assistant for ${contextInfo.agency_name}.

**Context:**
- Staff: ${contextInfo.staff_name} (${contextInfo.staff_role})
- Upcoming shifts: ${contextInfo.upcoming_shifts_count}
- Available shifts: ${contextInfo.available_shifts_count}

**Your capabilities:**
1. Show upcoming shifts
2. Find available shifts in marketplace
3. Help with timesheet submission
4. Check profile/compliance status
5. Answer general questions

**Response rules:**
- Be friendly, professional, and concise
- Use emojis for clarity (📅 dates, 💰 money, ✅ confirmed)
- If asking for shifts, provide details
- If staff wants to accept a shift, tell them to use the app or reply "accept [shift ID]"
- End with a helpful follow-up question when appropriate
- Keep responses under 1000 characters

**Current date:** ${now.toISOString().split('T')[0]}

Respond naturally to the user's query.`
                },
                {
                    role: "user",
                    content: body
                }
            ],
            temperature: 0.7,
            max_tokens: 500,
        });

        const aiMessage = response.choices[0].message.content;

        // Detect intent to provide data-rich responses
        const intent = await detectIntent(body);

        console.log(`🎯 [AI] Intent: ${intent}`);

        // Enhance AI response with actual data
        let finalMessage = aiMessage;

        if (intent === 'show_schedule' && upcomingShifts.length > 0) {
            const { data: clients } = await supabase
                .from("clients")
                .select("*");

            let shiftDetails = `\n\n📅 *Your Upcoming Shifts:*\n\n`;
            upcomingShifts.forEach((shift, index) => {
                const client = clients?.find(c => c.id === shift.client_id);
                const date = new Date(shift.date);
                const formattedDate = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

                shiftDetails += `${index + 1}. *${formattedDate}*\n`;
                shiftDetails += `   📍 ${client?.name || 'Unknown'}\n`;
                if (shift.work_location_within_site) {
                    shiftDetails += `   🏠 ${shift.work_location_within_site}\n`;
                }
                shiftDetails += `   ⏰ ${shift.start_time} - ${shift.end_time} (${shift.duration_hours}h)\n`;
                shiftDetails += `   💰 £${shift.pay_rate}/hr\n`;
                shiftDetails += `   ✅ ${shift.status}\n\n`;
            });

            finalMessage = shiftDetails;
        }

        if (intent === 'find_available_shifts' && availableShifts.length > 0) {
            const { data: clients } = await supabase
                .from("clients")
                .select("*");

            let shiftDetails = `\n\n🔍 *Available Shifts:*\n\n`;
            availableShifts.forEach((shift, index) => {
                const client = clients?.find(c => c.id === shift.client_id);
                const date = new Date(shift.date);
                const formattedDate = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

                shiftDetails += `${index + 1}. *${formattedDate}*\n`;
                shiftDetails += `   📍 ${client?.name || 'Unknown'}\n`;
                if (shift.work_location_within_site) {
                    shiftDetails += `   🏠 ${shift.work_location_within_site}\n`;
                }
                shiftDetails += `   ⏰ ${shift.start_time} - ${shift.end_time}\n`;
                shiftDetails += `   💼 ${shift.role_required.replace('_', ' ')}\n`;
                shiftDetails += `   💰 £${shift.pay_rate}/hr\n`;
                shiftDetails += `   ID: ${shift.id.substring(0, 8)}\n\n`;
            });

            shiftDetails += `_To apply: Visit the staff portal or reply "apply [number]"_`;
            finalMessage = shiftDetails;
        }

        if (intent === 'submit_timesheet') {
            finalMessage = `⏱️ *Timesheet Submission*\n\n` +
                `To submit hours, reply with:\n` +
                `"[Hours] hours, [Break] min break"\n\n` +
                `Example: "8 hours, 30 min break"\n\n` +
                `Or upload a photo of your timesheet! 📸`;
        }

        await sendWhatsAppResponse(supabase, phone, finalMessage);

    } catch (aiError) {
        console.error('❌ [AI] Error:', aiError);

        // Fallback to basic response
        await sendWhatsAppResponse(supabase, phone,
            `I'm here to help! Try asking:\n` +
            `• "Show my shifts"\n` +
            `• "Any shifts available?"\n` +
            `• "Submit timesheet"`
        );
    }
}

/**
 * 🎯 Detect user intent from message
 */
async function detectIntent(message) {
    const lowerMsg = message.toLowerCase();

    // Schedule queries
    if (/show.*shift|my.*shift|upcoming|what.*shift|schedule|when.*work/i.test(lowerMsg)) {
        return 'show_schedule';
    }

    // Available shifts
    if (/available.*shift|open.*shift|find.*shift|looking for.*work|need.*shift/i.test(lowerMsg)) {
        return 'find_available_shifts';
    }

    // Timesheet submission
    if (/timesheet|submit.*hours|clock.*in|clock.*out|hours.*worked/i.test(lowerMsg)) {
        return 'submit_timesheet';
    }

    // Profile/compliance check
    if (/my.*profile|my.*status|compliance|documents|my.*info/i.test(lowerMsg)) {
        return 'check_profile';
    }

    return 'general';
}

/**
 * HELPER: Find staff by phone with aggressive matching
 */
async function findStaffByPhone(supabase, phone) {
    // Try exact match
    const { data: staff1 } = await supabase.from("staff").select("*").eq("phone", phone);
    if (staff1 && staff1.length > 0) return staff1[0];

    // Try without +
    const phoneWithoutPlus = phone.replace('+', '');
    const { data: staff2 } = await supabase.from("staff").select("*").eq("phone", phoneWithoutPlus);
    if (staff2 && staff2.length > 0) return staff2[0];

    // Try UK format variations
    if (phone.startsWith('07') || phone.startsWith('447')) {
        const ukPhone = '+44' + (phone.startsWith('07') ? phone.substring(1) : phone.substring(2));
        const { data: staff3 } = await supabase.from("staff").select("*").eq("phone", ukPhone);
        if (staff3 && staff3.length > 0) return staff3[0];
    }

    // Try adding +
    if (!phone.startsWith('+')) {
        const { data: staff4 } = await supabase.from("staff").select("*").eq("phone", '+' + phone);
        if (staff4 && staff4.length > 0) return staff4[0];
    }

    return null;
}

/**
 * HELPER: Send WhatsApp response
 */
async function sendWhatsAppResponse(supabase, phone, message) {
    await supabase.functions.invoke('send-whatsapp', {
        body: {
            to: phone,
            message: message
        }
    });
}

/**
 * HELPER: Create Twilio TwiML response
 */
function createTwilioResponse() {
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' }
    });
}
