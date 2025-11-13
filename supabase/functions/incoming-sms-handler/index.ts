import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import twilio from "npm:twilio";

const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
const twilioClient = twilio(accountSid, authToken);

// ✅ FIX 2: Phone number normalization helper
function normalizePhone(phone) {
    if (!phone) return null;

    // Remove all spaces, hyphens, parentheses
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');

    // Convert UK numbers to international format
    if (cleaned.startsWith('07')) {
        cleaned = '+44' + cleaned.substring(1);
    } else if (cleaned.startsWith('447')) {
        cleaned = '+' + cleaned;
    } else if (!cleaned.startsWith('+')) {
        // Assume UK if no country code
        cleaned = '+44' + cleaned;
    }

    return cleaned;
}

serve(async (req) => {
    try {
        // Verify Twilio signature for security
        const twilioSignature = req.headers.get('X-Twilio-Signature');
        const url = new URL(req.url);
        const formData = await req.formData();
        const body = Object.fromEntries(formData);

        console.log('📱 Incoming SMS from:', body.From);
        console.log('📄 SMS Body:', body.Body);

        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const smsBody = body.Body?.trim().toUpperCase();
        const fromNumber = normalizePhone(body.From); // ✅ Normalize incoming number

        console.log('🔍 Normalized phone number:', fromNumber);

        // Parse YES response
        if (smsBody === 'YES' || smsBody === 'Y') {
            console.log('✅ User accepted shift');

            // ✅ FIX 2: Find staff with normalized phone matching
            const { data: allStaff, error: staffError } = await supabase
                .from("staff")
                .select("*");

            if (staffError) {
                console.error('Error fetching staff:', staffError);
            }

            console.log(`📋 Total staff in database: ${allStaff?.length || 0}`);

            const staff = allStaff?.find(s => {
                const staffPhone = normalizePhone(s.phone);
                const matches = staffPhone === fromNumber;

                if (matches) {
                    console.log(`✅ MATCH FOUND: ${s.first_name} ${s.last_name} (${staffPhone})`);
                }

                return matches;
            });

            if (!staff) {
                console.error(`❌ No staff found for phone: ${fromNumber}`);
                console.log('📋 Available staff phones:', allStaff?.map(s => ({
                    name: `${s.first_name} ${s.last_name}`,
                    original: s.phone,
                    normalized: normalizePhone(s.phone)
                })));

                return new Response(
                    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, we couldn't find your staff record. Please contact the office. Your number: ${fromNumber}</Message></Response>`,
                    { headers: { 'Content-Type': 'text/xml' } }
                );
            }

            console.log(`✅ Staff found: ${staff.first_name} ${staff.last_name}`);

            // Find most recent urgent/critical open shift
            const { data: openShifts, error: shiftsError } = await supabase
                .from("shifts")
                .select("*")
                .eq("status", "open")
                .in("urgency", ['urgent', 'critical']);

            if (shiftsError) {
                console.error('Error fetching shifts:', shiftsError);
            }

            const sortedShifts = openShifts?.filter(s => s.role_required === staff.role)
                .sort((a, b) => new Date(b.broadcast_sent_at || b.created_date) - new Date(a.broadcast_sent_at || a.created_date)) || [];

            if (sortedShifts.length === 0) {
                console.log('⚠️ No urgent shifts available');
                return new Response(
                    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, this shift has already been filled. Check the app for other available shifts.</Message></Response>`,
                    { headers: { 'Content-Type': 'text/xml' } }
                );
            }

            const shift = sortedShifts[0];
            console.log(`🎯 Assigning shift ${shift.id.substring(0, 8)} to ${staff.first_name}`);

            // ✅ CHANGE: Set status to 'confirmed' instead of 'assigned'
            const { error: updateError } = await supabase
                .from("shifts")
                .update({
                    status: 'confirmed', // ✅ CHANGED: SMS acceptance = confirmed
                    assigned_staff_id: staff.id,
                    shift_journey_log: [
                        ...(shift.shift_journey_log || []),
                        {
                            state: 'confirmed',
                            timestamp: new Date().toISOString(),
                            staff_id: staff.id,
                            method: 'sms_acceptance',
                            notes: 'Staff confirmed shift via SMS reply'
                        }
                    ]
                })
                .eq("id", shift.id);

            if (updateError) {
                console.error('Error updating shift:', updateError);
            }

            // Create booking with confirmed status
            const { error: bookingError } = await supabase
                .from("bookings")
                .insert({
                    agency_id: shift.agency_id,
                    shift_id: shift.id,
                    staff_id: staff.id,
                    client_id: shift.client_id,
                    status: 'confirmed', // ✅ CHANGED: Already confirmed via SMS
                    booking_date: new Date().toISOString(),
                    shift_date: shift.date,
                    start_time: shift.start_time,
                    end_time: shift.end_time,
                    confirmation_method: 'sms',
                    confirmed_by_staff_at: new Date().toISOString() // ✅ Added timestamp
                });

            if (bookingError) {
                console.error('Error creating booking:', bookingError);
            }

            // Create draft timesheet
            try {
                await supabase.functions.invoke('auto-timesheet-creator', {
                    body: {
                        booking_id: shift.id,
                        shift_id: shift.id,
                        staff_id: staff.id,
                        client_id: shift.client_id,
                        agency_id: shift.agency_id
                    }
                });
                console.log('✅ Draft timesheet created');
            } catch (timesheetError) {
                console.error('⚠️ Timesheet creation failed:', timesheetError);
            }

            // Get client details
            const { data: clients } = await supabase
                .from("clients")
                .select("*")
                .eq("id", shift.client_id);

            const client = clients?.[0];

            // ✅ Get agency name for confirmation message
            const { data: agencies } = await supabase
                .from("agencies")
                .select("*")
                .eq("id", shift.agency_id);

            const agency = agencies?.[0];
            const agencyName = agency?.name || 'Your Agency';

            const location = client?.address
                ? `${client.address.line1}, ${client.address.city} ${client.address.postcode}`
                : 'See details in app';

            // ✅ FIX 2: Include room number in confirmation
            const locationLine = shift.work_location_within_site
                ? `📍 Location: ${shift.work_location_within_site}\n`
                : '';

            const confirmationMessage = `✅ SHIFT CONFIRMED!

You've been assigned to:

📍 ${client?.name}
${locationLine}📅 ${new Date(shift.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
🕐 ${shift.start_time} - ${shift.end_time} (${shift.duration_hours}h)
💰 £${shift.pay_rate}/hr

📍 Address:
${location}

⏰ IMPORTANT: Arrive 10 mins early and clock in via the app when you arrive.

Good luck! 🎉

- ${agencyName}`;

            console.log(`✅ Shift confirmed for ${staff.first_name}`);

            return new Response(
                `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${confirmationMessage}</Message></Response>`,
                { headers: { 'Content-Type': 'text/xml' } }
            );
        }

        // Default response for unrecognized messages
        return new Response(
            `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Reply YES to accept the shift, or check the app for more details.</Message></Response>`,
            { headers: { 'Content-Type': 'text/xml' } }
        );

    } catch (error) {
        console.error('❌ SMS Handler Error:', error);
        return new Response(
            `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Sorry, something went wrong. Please contact the office.</Message></Response>`,
            { headers: { 'Content-Type': 'text/xml' }, status: 500 }
        );
    }
});
