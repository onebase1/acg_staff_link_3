import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * TYPE DEFINITIONS
 */
interface InteractionLog {
    call_id: string;
    caller_phone: string;
    interaction_type: string;
    payload: unknown;
    summary: string;
    agency_id?: string | null;
    client_id?: string | null;
}

interface NotificationItem {
    recipient_email: string;
    recipient_type: 'staff' | 'client' | 'admin' | 'agency_admin' | 'client_contact';
    notification_type: string;
    item: Record<string, unknown>;
    agency_id: string;
    recipient_first_name?: string;
}

interface VapiIdentity {
    status: 'recognized' | 'unrecognized' | 'error' | 'anonymous' | 'unknown';
    id?: string;
    name?: string;
    email?: string;
    type?: 'staff' | 'client' | 'admin' | 'agency_admin';
    agency_id?: string;
    client_id?: string;
    client_name?: string;
    message?: string;
    defaults?: {
        day?: string;
        night?: string;
        roles?: string;
        locations?: string;
    };
    [key: string]: unknown; // Index signature for ToolResult compatibility
}

interface ClientContract {
    settings: Record<string, unknown>;
    contract_terms?: {
        advanced_rate_card?: {
            enabled: boolean;
            rate_structure: Record<string, Record<string, { pay_rate: number; charge_rate: number }>>;
        };
        rates_by_role?: Record<string, { pay_rate: number; charge_rate: number }>;
    };
}

interface ToolResult {
    success?: boolean;
    error?: string;
    agency_id?: string | null;
    client_id?: string | null;
    [key: string]: unknown;
}

interface BookingShift {
    role: string;
    date: string;
    startTime: string;
    endTime: string;
    staffCount?: number;
    onDutyManager?: string;
    onDutyPhone?: string;
    internalLocation?: string;
}

// CORS headers for Vapi and direct browser testing
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * 🤖 VAPI MCP ROUTER (Direct Edge Implementation)
 * 
 * Replaces n8n as the brain for Vapi tool calls.
 * Fast, multi-tenant with RLS, and zero licensing fees.
 */

/**
 * HELPER:
 * Normalizes time strings like "8 PM", "8", "20:00" to "HH:mm:ss"
 */
function normalizeTime(timeStr: string): string {
    if (!timeStr || typeof timeStr !== 'string') return "08:00";
    
    const trimStr = timeStr.trim();
    // Check if it's just a number (e.g., "8", "20")
    if (/^\d{1,2}$/.test(trimStr)) {
        let hour = parseInt(trimStr);
        if (hour < 0) hour = 0;
        if (hour > 23) hour = 23;
        return `${hour.toString().padStart(2, '0')}:00`;
    }

    const cleaned = trimStr.toLowerCase();
    const match = cleaned.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    
    if (!match) return "08:00";
    
    let hour = parseInt(match[1]);
    const minute = match[2] || "00";
    const ampm = match[3];

    if (ampm === "pm" && hour < 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;

    return `${hour.toString().padStart(2, '0')}:${minute}`;
}

/**
 * Determines if a shift is 'day' or 'night' based on start time
 */
function determineShiftType(startTime: string): 'day' | 'night' {
    const hour = parseInt(startTime.split(':')[0]);
    // Standard rule: 6 AM to 6 PM is day, otherwise night
    if (hour >= 6 && hour < 18) return 'day';
    return 'night';
}

/**
 * Normalizes Role names to database slugs
 */
function normalizeRole(roleName: string): string {
    if (!roleName || typeof roleName !== 'string') return 'healthcare_assistant';
    const r = roleName.toLowerCase().trim();
    if (r.includes('nurse') || r === 'rgn' || r === 'rn') return 'nurse';
    if (r.includes('senior') || r === 'shca' || r === 'senior care worker') return 'senior_care_worker';
    if (r.includes('hca') || r.includes('healthcare assistant') || r.includes('care worker')) return 'healthcare_assistant';
    if (r.includes('support')) return 'support_worker';
    return r.replace(/\s+/g, '_'); // Fallback: slugify
}

/**
 * Normalizes room/location names
 * Examples: "15" -> "Room 15", "Number 14" -> "Room 14"
 */
function normalizeRoom(roomName: string): string {
    if (!roomName || typeof roomName !== 'string') return roomName;
    const clean = roomName.toLowerCase().replace(/number|room|ward/g, '').trim();
    const num = parseInt(clean);
    if (!isNaN(num) && num > 0 && num <= 20) {
        return `Room ${num}`;
    }
    return roomName;
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const body = await req.json();
        const messageType = body.message?.type || "unknown";
        console.log(`📬 [Vapi Router] Message: ${messageType}`);

        // Get call details for logging
        const callId = body.message?.call?.id || body.call?.id || body.message?.callId;
        const customer = body.message?.customer || body.customer || body.message?.call?.customer;
        const callerPhone = customer?.number || "unknown";

        // Forensically log EVERY incoming message to see what Vapi is sending
        await logInteraction(supabase, {
            call_id: callId,
            caller_phone: callerPhone,
            interaction_type: 'event',
            payload: { type: messageType, body },
            summary: `Incoming Vapi Event: ${messageType}`
        });


        // 1. DYNAMIC ASSISTANT REQUEST (On Inbound Call)
        if (messageType === 'assistant-request') {
            console.log(`📞 [Vapi Router] Inbound Assistant Request from: ${callerPhone}`);
            
            const identity = await handleLookupCaller(supabase, callerPhone);
            
            // 🚨 UAT OVERRIDE: Hard-code Dominion Healthcare Context
            const DOMINION_AGENCY_ID = "c8e84c94-8233-4084-b4c3-63ad9dc81c16";
            const currentAgencyId = identity.agency_id || DOMINION_AGENCY_ID;
            const clientName = identity.client_name || "the site";
            const isDivineCare = clientName.toLowerCase().includes("divine");
            
            let greetingWithFallback = `Hi! You're through to the Dominion Healthcare team. This is Kylie. How can I help with your shifts today?`;
            
            if (identity.status === 'recognized') {
                greetingWithFallback = `Hi ${identity.name}! This is Kylie from Dominion Healthcare. I see you're calling from ${clientName}. How can I help with your shifts today?`;
            }

            // Log session start
            await logInteraction(supabase, {
                call_id: callId,
                caller_phone: callerPhone,
                agency_id: currentAgencyId,
                client_id: identity.client_id,
                interaction_type: 'session_start',
                payload: { ...identity, uat_override: true },
                summary: `Call started for ${identity.name || 'Unknown'} (${identity.type || 'None'}) - Dominion UAT`
            });

            // NEW: Date Context for Test #11 precision
            const now = new Date();
            const todayDate = now.toISOString().split('T')[0];
            const todayDay = now.toLocaleDateString('en-GB', { weekday: 'long' });

            // Return assistant overrides with variableValues and full config hardening
            return new Response(JSON.stringify({
                assistant: {
                    // Grounding instructions for Test #23
                    instructions: `
## Conversational Structure (6-STEP FLOW)
1. GREET: Hi! You're through to the Dominion Healthcare team. This is Kylie. How can I help with your shifts today?
2. COLLECT: Gather all shift details. 
   - SILENCE IS GOLDEN: When the user is listing shifts, stay SILENT. Do NOT use audio back-channel cues (like "Mm-hmm" or "Got it"). Wait for a clear pause or for the user to finish the list before speaking.
   - ANCHORING: If there is long silence (>2 seconds) or a clear interruption, recap to ground the user. "I've noted the 3 long days for Friday. What was next?"
   - VERNACULAR: 
     - "Long Day" is a Day Shift ({{day_shift}}).
     - "Early" is 8 AM to 2 PM. Confirm: "I'll mark that as an Early shift from 8 AM to 2 PM, right?"
     - "Late" is 2 PM to 8 PM. Confirm: "I'll mark that as a Late shift from 2 PM to 8 PM, right?"
     - "Half Day" requires you to ask for start/end times.
   - ROOMS: Map "Number X" or just "X" (1-20) to "Room X". Examples: "Number 14" is Room 14, "15" is Room 15.
   - Mandatory Room/Ward if Divine Care Center.
   - SHIFT TYPES: If user says "Day Shift" or "Long Day", use {{day_shift}}. If "Night Shift", use {{night_shift}}.
   - CHECK: After the user gives shifts, ALWAYS ask: "Is there anything else you'd like to add to this booking, or is that all for now?"
3. CONFIRM: Summarize the FULL weekly rota consolidated by Role and Shift Type. 
   - SMART LABELING: If shifts are standard (8 AM to 8 PM or 8 PM to 8 AM), refer to them only as "Day Shift" or "Night Shift".
   - HIGH-LIGHTING: ONLY speak explicit times (e.g., "10 AM to 4 PM" or "8 AM to 2 PM") for non-standard shifts (Early, Late, Half Days).
   - Speak times using AM or PM (e.g., "8 AM to 2 PM").
   - Ask: "Is that all correct before I book them in for you?"
4. BOOK: Call book_bulk_shifts. Ensure shifts are categorized correctly into Day/Night times.
5. INFORM: "Successfully processed! Those shifts are all live in the portal now." (Keep this short. Do NOT repeat the summary here).
6. FOLLOW-UP (STAY ALIVE): ALWAYS ask: "Is there anything else I can help you with today?" 

## Protocol Rules
- LISTEN-FIRST: Prioritize user input. If the user starts talking, STOP immediately.
- NO VERBAL FILLERS: Do not say "Thank you", "Okay", or "Got it" between every shift details. Stay silent while the user speaks.
- MAPPING: "Long Day" = {{day_shift}}. "Early" = 08:00 - 14:00. "Late" = 14:00 - 20:00. "Number X" = Room X.
- EXACT COUNTS: You MUST preserve the exact quantity requested. NEVER change 2 to 3.
- TIME MAPPING: Map "Day" to {{day_shift}} and "Night" to {{night_shift}}.
- ONE QUESTION RULE: Ask only one question at a time.
- DATE GROUNDING: TODAY IS ${todayDay}, ${todayDate}. Do NOT say the year 2026 in speech unless asked.
- TIME FORMATTING: ALWAYS speak times as AM or PM (e.g., "8 AM"). NEVER use "8 to 20" or 24-hour time.
- MANAGER NOMINATION: Ask for on-site manager name if unknown.
`,
                    
                    variableValues: {
                        agency_name: 'Dominion Healthcare',
                        client_name: clientName,
                        caller_name: identity.name || 'Manager',
                        caller_status: identity.status,
                        day_shift: identity.defaults?.day || '8 AM - 8 PM',
                        night_shift: identity.defaults?.night || '8 PM - 8 AM',
                        enabled_roles: identity.defaults?.roles || 'HCA, RGN, SHCA',
                        locations: identity.defaults?.locations || 'Room 1, Room 2, Room 3, Room 14, Room 15, Room 16',
                        today_date: todayDate,
                        today_day: todayDay,
                        location_mandatory: isDivineCare
                    },
                    
                    // Singular dynamic greeting (prevents duplication)
                    firstMessage: greetingWithFallback,
                    
                    metadata: {
                        agency_id: currentAgencyId,
                        client_id: identity.client_id,
                        caller_phone: callerPhone
                    }
                }
            }), { 
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
        }

        // 2. END OF CALL REPORT
        if (messageType === 'end-of-call-report' && body.message) {
            console.log(`🏁 [Vapi Router] Call Ended. ID: ${callId}`);
            
            await logInteraction(supabase, {
                call_id: callId,
                caller_phone: callerPhone,
                interaction_type: 'call_end',
                payload: body.message,
                summary: body.message.analysis?.summary || body.message.transcript || "Call concluded."
            });

            return new Response(JSON.stringify({ success: true }), { 
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
        }

        // 3. TOOL CALL HANDLING
        const toolCall = body.message?.toolCalls?.[0] || body.toolCalls?.[0];
        const metadata = body.message?.call?.metadata || body.call?.metadata;
        
        if (toolCall) {
            const { name: toolName, arguments: args } = toolCall.function;
            const toolCallId = toolCall.id;

            console.log(`🛠️ [Vapi Router] Handling Tool: ${toolName}`, { args, metadata });

            let result: ToolResult = { status: "pending" };
            try {
                result = await (async () => {
                    switch (toolName) {
                        case 'lookup_caller':
                            return await handleLookupCaller(supabase, callerPhone);
                        
                        case 'check_attendance':
                            return await handleCheckAttendance(supabase, callerPhone, args.shiftId);
                        
                        case 'book_shift':
                        case 'book_shift_fallback': {
                            // If metadata is missing (assistant-request bypassed), lookup identity
                            let clientId = metadata?.client_id;
                            let agencyId = metadata?.agency_id;
                            
                            if (!clientId) {
                                const identity = await handleLookupCaller(supabase, callerPhone);
                                if (identity.status === "recognized") {
                                    clientId = identity.client_id;
                                    agencyId = identity.agency_id;
                                }
                            }
                            
                            return await handleBookShift(
                                supabase,
                                clientId,
                                agencyId,
                                args.role,
                                args.date,
                                args.startTime,
                                args.endTime,
                                callerPhone,
                                args.staffCount,
                                args.onDutyManager,
                                args.onDutyPhone,
                                args.internalLocation
                            );
                        }
                        
                        case 'book_bulk_shifts': {
                            let clientId = metadata?.client_id;
                            let agencyId = metadata?.agency_id;
                            
                            if (!clientId) {
                                const identity = await handleLookupCaller(supabase, callerPhone);
                                if (identity.status === "recognized") {
                                    clientId = identity.client_id;
                                    agencyId = identity.agency_id;
                                }
                            }

                            return await handleBookBulkShifts(
                                supabase,
                                clientId,
                                agencyId,
                                args.shifts,
                                callerPhone
                            );
                        }

                        case 'cancel_shift': {
                            // Reinforce identity for security
                            const identity = await handleLookupCaller(supabase, callerPhone);
                            if (identity.status !== "recognized") return { error: "Unrecognized caller" };
                            
                            return await handleCancelShift(supabase, identity, args.shiftId, args.reason);
                        }
                        
                        case 'transfer_call':
                        case 'handoff_tool':
                            return await handleTransferCall(supabase, callerPhone, args);
                        
                        default:
                            return { error: `Tool ${toolName} not implemented in router` };
                    }
                })();
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                console.error(`❌ [Vapi Router] Tool ${toolName} failed:`, errorMessage);
                result = { error: errorMessage || "Internal tool failure" };
            }

            // Enhanced logging with agency/client context if available in result
            const logAgencyId = result?.agency_id || null;
            const logClientId = result?.client_id || null;

            await logInteraction(supabase, {
                call_id: callId,
                caller_phone: callerPhone,
                agency_id: logAgencyId,
                client_id: logClientId,
                interaction_type: 'tool_call',
                payload: { tool: toolName, args, result },
                summary: result?.success || !result?.error ? `Successfully executed ${toolName}` : `Failed ${toolName}: ${result?.error || 'Unknown error'}`
            });

            return new Response(JSON.stringify({
                results: [
                    {
                        toolCallId: toolCallId,
                        result: result
                    }
                ]
            }), { 
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
        }

        // 4. GRACEFUL FALLTHROUGH (For transcript, updates, etc)
        // We log these as "heartbeat" or "event" to keep the trace but don't error
        if (messageType) {
            console.log(`📡 [Vapi Router] Heartbeat: ${messageType}`);
            return new Response(JSON.stringify({ success: true }), { 
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
        }

        return new Response(JSON.stringify({ error: "Unrecognized request structure" }), { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error('❌ [Vapi Router] Fatal error:', error);
        return new Response(JSON.stringify({ error: errorMessage }), { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
    }
});

/**
 * LOGGING HELPER: ai_interaction_logs
 */
async function logInteraction(supabase: SupabaseClient, log: InteractionLog) {
    try {
        const { error } = await supabase
            .from('ai_interaction_logs')
            .insert({
                call_id: log.call_id,
                caller_phone: log.caller_phone,
                agency_id: log.agency_id,
                client_id: log.client_id,
                interaction_type: log.interaction_type,
                payload: log.payload,
                summary: log.summary
            });
        if (error) console.error('⚠️ [Vapi Router] Logging failed:', error.message);
    } catch (e) {
        console.error('⚠️ [Vapi Router] Logging exception:', e);
    }
}

/**
 * NOTIFICATION HELPER: notification_queue
 */
async function queueNotification(supabase: SupabaseClient, {
    recipient_email,
    recipient_type,
    notification_type,
    item,
    agency_id,
    recipient_first_name
}: NotificationItem) {
    try {
        const { data: queue, error: fetchError } = await supabase
            .from('notification_queue')
            .select('*')
            .eq('recipient_email', recipient_email)
            .eq('notification_type', notification_type)
            .eq('status', 'pending')
            .maybeSingle();

        if (fetchError) throw fetchError;

        if (queue) {
            const updatedItems = [...(queue.pending_items || []), item];
            await supabase
                .from('notification_queue')
                .update({ pending_items: updatedItems, item_count: updatedItems.length })
                .eq('id', queue.id);
        } else {
            await supabase.from('notification_queue').insert({
                agency_id,
                recipient_email,
                recipient_type,
                recipient_first_name,
                notification_type,
                pending_items: [item],
                item_count: 1,
                status: 'pending',
                scheduled_send_at: new Date().toISOString(),
                message: `${notification_type} notification`
            });
        }
    } catch (e) {
        console.error('⚠️ [Vapi Router] Notification queuing failed:', e);
    }
}

/**
 * HELPER:
 * Formats "HH:mm:ss" or "HH:mm" to "h AM/PM" for natural speech
 */
function formatTimeForSpeech(timeStr: string): string {
    if (!timeStr) return "8 AM";
    const parts = timeStr.split(':');
    let hour = parseInt(parts[0]);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour} ${ampm}`;
}

/**
 * IDENTITY TOOL: Lookup Caller
 * Matches phone number to client_contacts or staff.
 */
async function handleLookupCaller(supabase: SupabaseClient, phone: string): Promise<VapiIdentity> {
    if (!phone) return { status: "anonymous", message: "No phone number provided" };

    // Clean phone number for matching (remove +, spaces, etc if needed, but simple eq first)
    // We check client_contacts first as this is Phase 1 focus
    const { data: contact, error } = await supabase
        .from('client_contacts')
        .select(`
            *, 
            clients(
                *, 
                agencies(name),
                day_shift_start,
                day_shift_end,
                night_shift_start,
                night_shift_end,
                enabled_roles,
                internal_locations
            )
        `)
        .eq('phone_number', phone)
        .maybeSingle();

    if (error) throw error;

    if (contact) {
        const client = contact.clients;
        // Format roles: {"nurse":true, "hca":false} -> "Nurse"
        const roles = client?.enabled_roles ? Object.entries(client.enabled_roles)
            .filter(([_, enabled]) => !!enabled)
            .map(([role]) => role.replace(/_/g, ' ').toUpperCase())
            .join(', ') : "Care Workers";

        // Format internal locations: [{"id":"1", "name":"Room 1"}] -> "Room 1, Room 2"
        const locations = Array.isArray(client?.internal_locations) 
            ? client.internal_locations.map((loc: any) => loc.name).join(', ')
            : "";

        const dayStart = formatTimeForSpeech(client?.day_shift_start);
        const dayEnd = formatTimeForSpeech(client?.day_shift_end);
        const nightStart = formatTimeForSpeech(client?.night_shift_start);
        const nightEnd = formatTimeForSpeech(client?.night_shift_end);

        return {
            status: "recognized",
            type: "client",
            name: `${contact.first_name} ${contact.last_name}`,
            email: contact.email,
            client_name: client?.name,
            agency_name: client?.agencies?.name || "Divine Care Support",
            client_id: contact.client_id,
            agency_id: client?.agency_id || (Array.isArray(client) ? client[0]?.agency_id : null),
            is_primary: contact.is_primary_contact,
            defaults: {
                day: `${dayStart} - ${dayEnd}`,
                night: `${nightStart} - ${nightEnd}`,
                roles: roles,
                locations: locations
            }
        };
    }

    // Check if it's staff
    const { data: staff } = await supabase
        .from('staff')
        .select('*, agencies(name)')
        .eq('phone', phone)
        .maybeSingle();

    if (staff) {
        return {
            status: "recognized",
            type: "staff",
            name: `${staff.first_name} ${staff.last_name}`,
            email: staff.email,
            agency_name: staff.agencies?.name || "the agency",
            agency_id: staff.agency_id
        };
    }

    return { status: "unknown", message: "Caller not found in database" };
}

/**
 * SHIFT TOOL: Book Shift
 * Uses natural language data to create shifts.
 */
/**
 * REPLICATED FINANCIAL LOGIC FROM clientHelpers.js
 * Ensures shifts booked via AI have the correct contract rates.
 */
function calculateRates(client: ClientContract | null, role: string, shiftType: 'day' | 'night', shiftDate: string) {
    if (!client) return { pay_rate: 0, charge_rate: 0 };
    
    const normalizedRole = normalizeRole(role);
    const date = new Date(shiftDate);

    // 1. Advanced Rate Card
    const advancedCard = client.contract_terms?.advanced_rate_card;
    if (advancedCard?.enabled && advancedCard.rate_structure) {
        const roleRates = advancedCard.rate_structure[normalizedRole];
        if (roleRates) {
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            // Simple weekday/weekend logic for now
            const rateType = isWeekend 
                ? (shiftType === 'day' ? 'weekend_day' : 'weekend_night')
                : (shiftType === 'day' ? 'weekday_day' : 'weekday_night');
            
            const rates = roleRates[rateType];
            return {
                pay_rate: rates?.pay_rate || 0,
                charge_rate: rates?.charge_rate || 0
            };
        }
    }

    // 2. Simple Rates
    const ratesByRole = client.contract_terms?.rates_by_role || {};
    const simpleRates = ratesByRole[normalizedRole] || ratesByRole[role];

    if (simpleRates) {
        return {
            pay_rate: simpleRates.pay_rate || 0,
            charge_rate: simpleRates.charge_rate || 0
        };
    }

    return { pay_rate: 0, charge_rate: 0 };
}

async function handleBookShift(
    supabase: SupabaseClient,
    clientId: string,
    agencyId: string,
    role: string,
    date: string,
    startTime: string,
    endTime: string,
    callerPhone: string,
    staffCount?: number,
    onDutyManager?: string,
    onDutyPhone?: string,
    internalLocation?: string
) {
    if (!clientId || !agencyId) return { error: "Permission denied. Identity lookup failed." };
    if (!date || !role) return { error: "Missing required fields: 'date' and 'role' are mandatory." };
    
    const dbRole = normalizeRole(role);
    // 1. Validate client/agency IDs
    if (!clientId || !agencyId) {
        return { error: "Permission denied. Client or Agency ID missing." };
    }

    // 2. Fetch Client Contract for Rates
    const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
    
    // Cast to ClientContract or define a local interface
    const clientData = client as unknown as ClientContract;

    if (clientError || !client) {
        console.error(`❌ [Vapi Router] Failed to fetch client for rates: ${clientError?.message}`);
    }

    // 3. Prepare bulk shift data
    const shiftType = determineShiftType(normalizeTime(startTime));
    const rates = calculateRates(clientData, role, shiftType, date);
    
    // 4. Prepare bulk shift data
    const shiftsToCreate = [];
    const count = staffCount || 1;
    
    // 4. Prepare caller identity for on-duty contact
    const identity = await handleLookupCaller(supabase, callerPhone);
    const callerName = identity.status === 'recognized' ? identity.name : "Manager";
    const callerNumber = identity.status === 'recognized' ? callerPhone : callerPhone;

    for (let i = 0; i < count; i++) {
        shiftsToCreate.push({
            agency_id: agencyId,
            client_id: clientId,
            date: date,
            start_time: normalizeTime(startTime),
            end_time: normalizeTime(endTime),
            role_required: dbRole,
            shift_type: shiftType,
            work_location_within_site: normalizeRoom(internalLocation || ""),
            on_duty_contact: {
                name: callerName || "Duty Manager",
                phone: callerNumber || ""
            },
            status: 'open', // ✅ CRITICAL: Force 'open' status for marketplace visibility
            urgency: 'normal',
            break_duration_minutes: 0, // Match BulkShiftCreation.jsx default
            pay_rate: rates.pay_rate,
            charge_rate: rates.charge_rate,
            created_by: "Kylie AI Receptionist" 
        });
    }

    // 3. Call RPC
    const { data, error } = await supabase.rpc('create_bulk_shifts', {
        shifts_data: shiftsToCreate
    });

    if (error) throw error;

    // 6. Queue Receipt Notifications (Parity with BulkShiftCreation.jsx)
    if (callerPhone) {
        if (identity.status === 'recognized' && identity.email) {
            const { data: agency } = await supabase.from('agencies').select('name').eq('id', agencyId).maybeSingle();
            const { data: clientObj } = await supabase.from('clients').select('name').eq('id', clientId).maybeSingle();
            
            await queueNotification(supabase, {
                recipient_email: identity.email,
                recipient_type: (identity.type === 'client' ? 'client' : 'agency_admin') as 'client' | 'agency_admin',
                recipient_first_name: (identity.name || 'Manager').split(' ')[0],
                notification_type: 'shift_receipt',
                agency_id: agencyId,
                item: {
                    client_name: clientObj?.name || "Client",
                    date: date,
                    start_time: normalizeTime(startTime),
                    end_time: normalizeTime(endTime),
                    role: dbRole,
                    agency_name: agency?.name || "Dominion Healthcare",
                    created_at: new Date().toISOString()
                }
            });
        }
    }

    return {
        success: true,
        message: `Successfully booked ${count} shifts for ${dbRole} on ${date}.`,
        booked_shifts: data
    };
}

/**
 * SHIFT TOOL: Book Bulk Shifts
 * Handles multiple shift requests for a week in a single call.
 */
async function handleBookBulkShifts(
    supabase: SupabaseClient,
    clientId: string,
    agencyId: string,
    shifts: BookingShift[],
    callerPhone: string
) {
    if (!clientId || !agencyId) {
        return { error: "Permission denied. Client or Agency ID missing." };
    }

    if (!Array.isArray(shifts)) {
        console.error("❌ [Vapi Router] book_bulk_shifts called without a valid shifts array.");
        return { error: "Missing or invalid 'shifts' array. Please provide the list of shifts to book." };
    }

    const { data: client } = await supabase.from('clients').select('*').eq('id', clientId).single();
    const finalShiftsToCreate = [];
    const notificationItems = [];

    // 4. Prepare caller identity for on-duty contact
    const identity = await handleLookupCaller(supabase, callerPhone);
    const callerName = identity.status === 'recognized' ? identity.name : "Manager";

    for (const s of shifts) {
        // Validate
        if (!s.date || !s.role || !s.startTime || !s.endTime) {
            console.warn("⚠️ [Vapi Router] Skipping invalid shift entry in bulk request:", s);
            continue;
        }

        const dbRole = normalizeRole(s.role);
        const shiftType = determineShiftType(normalizeTime(s.startTime));
        const rates = calculateRates(client, s.role, shiftType, s.date);
        const count = s.staffCount || 1;

        for (let i = 0; i < count; i++) {
            finalShiftsToCreate.push({
                agency_id: agencyId,
                client_id: clientId,
                date: s.date,
                start_time: normalizeTime(s.startTime),
                end_time: normalizeTime(s.endTime),
                role_required: dbRole,
                shift_type: shiftType,
                work_location_within_site: normalizeRoom(s.internalLocation || ""),
                on_duty_contact: { name: callerName || "Duty Manager", phone: callerPhone || "" },
                status: 'open',
                urgency: 'normal',
                break_duration_minutes: 0,
                pay_rate: rates.pay_rate,
                charge_rate: rates.charge_rate,
                created_by: "Kylie AI Receptionist"
            });
        }
        
        notificationItems.push({
            client_name: client?.name || "Client",
            date: s.date,
            start_time: normalizeTime(s.startTime),
            end_time: normalizeTime(s.endTime),
            role: dbRole
        });
    }

    const { data, error } = await supabase.rpc('create_bulk_shifts', {
        shifts_data: finalShiftsToCreate
    });

    if (error) throw error;

    // Queue one consolidated notification? Or one per shift-type... 
    // We'll queue one notification that holds all items if they match the same recipient.
    if (callerPhone) {
        if (identity.status === 'recognized' && identity.email) {
            const { data: agency } = await supabase.from('agencies').select('name').eq('id', agencyId).maybeSingle();
            const recipientType = (identity.type === 'client' ? 'client' : 'agency_admin') as 'client' | 'agency_admin';
            const firstName = (identity.name || 'Manager').split(' ')[0];

            for (const item of notificationItems) {
                await queueNotification(supabase, {
                    recipient_email: identity.email,
                    recipient_type: recipientType,
                    recipient_first_name: firstName,
                    notification_type: 'shift_receipt',
                    agency_id: agencyId,
                    item: { ...item, agency_name: agency?.name || "Dominion Healthcare", created_at: new Date().toISOString() }
                });
            }
        }
    }

    return {
        success: true,
        message: `Successfully booked ${finalShiftsToCreate.length} shifts across ${shifts.length} dates.`,
        booked_shifts_count: finalShiftsToCreate.length
    };
}

/**
 * SHIFT TOOL: Cancel Shift
 * Soft delete by updating status.
 */
async function handleCancelShift(
    supabase: SupabaseClient, 
    identity: VapiIdentity, 
    shiftId: string, 
    reason?: string
) {
    // 2. Update status
    const { data, error } = await supabase
        .from('shifts')
        .update({ 
            status: 'cancelled',
            cancellation_reason: reason || "Cancelled via AI Receptionist",
            cancelled_at: new Date().toISOString(),
            cancelled_by: identity.name || "Kylie AI"
        })
        .eq('id', shiftId)
        .eq('agency_id', identity.agency_id); // Security: RLS reinforcement

    if (error) throw error;

    return {
        success: true,
        message: "Shift has been cancelled successfully."
    };
}

/**
 * ATTENDANCE TOOL: Check Attendance
 * Looks for clock-ins or journey logs.
 */
async function handleCheckAttendance(
    supabase: SupabaseClient, 
    phone: string, 
    shiftId: string
) {
    const identity = await handleLookupCaller(supabase, phone);
    if (identity.status !== "recognized") return { error: "Unrecognized caller" };

    // 1. Find the shift and the latest journey update
    const { data: journey, error: journeyError } = await supabase
        .from('shift_journey_log')
        .select('*')
        .eq('shift_id', shiftId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (journeyError) throw journeyError;

    if (journey) {
        // Map event types to human readable statuses
        const statusMap: Record<string, string> = {
            'confirmed': 'confirmed their shift',
            'on_route': 'is currently on their way',
            'arrived': 'has arrived on-site',
            'delayed': 'is running late'
        };

        const statusLabel = statusMap[journey.event_type] || "sent an update";
        const timeAgo = journey.created_at; // In a real app, calculate "10 mins ago"

        return {
            status: journey.event_type,
            message: `Staff member ${statusLabel}. Their last update was at ${timeAgo}. ${journey.metadata?.eta ? `Their ETA is ${journey.metadata.eta}.` : ''}`,
            details: journey
        };
    }

    return {
        status: "no_data",
        message: "I don't see any check-ins or on-route updates from them yet. I'll escalate this to our management team to give them a nudge."
    };
}

/**
 * UTILITY TOOL: Transfer Call
 * Kylie hands off to a human coordinator.
 */
async function handleTransferCall(supabase: SupabaseClient, phone: string, args: Record<string, unknown>) {
    // 1. Determine target number (Default to Agency Phone)
    const identity = await handleLookupCaller(supabase, phone);
    
    // Fallback if we don't know the agency number
    const fallbackNumber = "+442039239247"; // Standard ACG Support
    
    // Query agency details for their main phone
    let targetPhone = fallbackNumber;
    if (identity.agency_id) {
        const { data: agency } = await supabase
            .from('agencies')
            .select('phone')
            .eq('id', identity.agency_id)
            .maybeSingle();
        
        if (agency?.phone) targetPhone = agency.phone;
    }

    console.log(`📞 [Vapi Router] Handoff requested. Transferring to: ${targetPhone}`);

    return {
        success: true,
        destination: targetPhone,
        message: "I'm transferring you to our specialist team right now. Please stay on the line."
    };
}
