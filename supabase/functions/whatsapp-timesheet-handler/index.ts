import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * WhatsApp Timesheet Handler
 *
 * Processes incoming WhatsApp messages for timesheet submission
 *
 * Expected message formats:
 * - "8 hours, 30 min break"
 * - "8.5 hours no break"
 * - "Worked 12 hours with 1 hour break"
 * - Or: Reply to shift confirmation with just "YES" to auto-create
 *
 * Webhook URL: This function is called by Twilio WhatsApp webhook
 * Setup: Dashboard -> Functions -> whatsappTimesheetHandler -> Copy URL -> Add to Twilio
 */

serve(async (req) => {
    try {
        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Parse Twilio webhook data
        const formData = await req.formData();
        const from = formData.get('From'); // Format: whatsapp:+447123456789
        const body = formData.get('Body'); // Message text
        const messageId = formData.get('MessageSid');

        console.log(`📱 [WhatsApp Timesheet] RAW from field: ${JSON.stringify(from)}`);
        console.log(`📱 [WhatsApp Timesheet] Message: "${body}"`);

        if (!from || !body) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Missing required fields'
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Extract phone number and ULTRA-AGGRESSIVELY clean it
        let phone = from.replace('whatsapp:', '').trim();

        // NUCLEAR OPTION: Extract ONLY digits and + symbol using regex
        // This removes ALL Unicode control characters by only keeping valid phone characters
        phone = phone.replace(/[^\d+]/g, '');

        // Log cleaned phone for debugging
        console.log(`🔍 Cleaned phone: "${phone}" (length: ${phone.length})`);
        console.log(`🔍 Phone char codes: ${Array.from(phone).map(c => c.charCodeAt(0)).join(',')}`);

        // Find staff member by phone - try multiple formats
        let { data: staff, error: staffError1 } = await supabase
            .from("staff")
            .select("*")
            .eq("phone", phone);

        console.log(`🔍 Try 1 (exact): ${phone} - Found: ${staff?.length || 0}`);

        // If not found, try without + prefix
        if (!staff || staff.length === 0) {
            const phoneWithoutPlus = phone.replace('+', '');
            console.log(`🔍 Try 2 (no +): ${phoneWithoutPlus}`);
            const result = await supabase
                .from("staff")
                .select("*")
                .eq("phone", phoneWithoutPlus);
            staff = result.data;
            console.log(`🔍 Try 2 result - Found: ${staff?.length || 0}`);
        }

        // If still not found, try with +44 prefix if it starts with 07 or 447
        if (!staff || staff.length === 0) {
            if (phone.startsWith('07') || phone.startsWith('447')) {
                const normalizedPhone = '+44' + (phone.startsWith('07') ? phone.substring(1) : phone.substring(2));
                console.log(`🔍 Try 3 (UK normalized): ${normalizedPhone}`);
                const result = await supabase
                    .from("staff")
                    .select("*")
                    .eq("phone", normalizedPhone);
                staff = result.data;
                console.log(`🔍 Try 3 result - Found: ${staff?.length || 0}`);
            }
        }

        // Last resort: Try adding + at the beginning if not present
        if (!staff || staff.length === 0) {
            if (!phone.startsWith('+')) {
                const phoneWithPlus = '+' + phone;
                console.log(`🔍 Try 4 (add +): ${phoneWithPlus}`);
                const result = await supabase
                    .from("staff")
                    .select("*")
                    .eq("phone", phoneWithPlus);
                staff = result.data;
                console.log(`🔍 Try 4 result - Found: ${staff?.length || 0}`);
            }
        }

        if (!staff || staff.length === 0) {
            console.log(`❌ No staff found after all attempts. Original: "${from}", Cleaned: "${phone}"`);

            // Send helpful response
            await supabase.functions.invoke('send-whatsapp', {
                body: {
                    to: phone,
                    message: `⚠️ We couldn't find your profile in the system.\n\nYour phone number: ${phone}\n\nPlease contact your agency admin to verify your phone number is registered correctly.`
                }
            });

            return new Response(
                JSON.stringify({
                    success: false,
                    message: 'Staff not found',
                    phone_searched: phone,
                    phone_original: from
                }),
                { headers: { "Content-Type": "application/json" } }
            );
        }

        const staffMember = staff[0];
        console.log(`✅ Found staff: ${staffMember.first_name} ${staffMember.last_name} (ID: ${staffMember.id})`);
        console.log(`✅ Staff phone in database: ${staffMember.phone}`);

        // Check for recent shifts that need timesheet submission
        const today = new Date();
        const twoDaysAgo = new Date(today);
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

        console.log(`🔍 Looking for completed shifts since ${twoDaysAgoStr}`);

        // Find completed shifts without timesheets (last 2 days)
        const { data: recentShifts, error: shiftsError } = await supabase
            .from("shifts")
            .select("*")
            .eq("assigned_staff_id", staffMember.id)
            .eq("status", "completed")
            .gte("date", twoDaysAgoStr);

        if (shiftsError) {
            throw shiftsError;
        }

        console.log(`📋 Found ${recentShifts?.length || 0} completed shifts`);

        const shiftsNeedingTimesheets = [];
        for (const shift of recentShifts || []) {
            // Check if timesheet already exists
            const { data: existingTimesheets } = await supabase
                .from("timesheets")
                .select("*")
                .eq("booking_id", shift.booking_id)
                .eq("staff_id", staffMember.id)
                .eq("shift_date", shift.date);

            console.log(`  Shift ${shift.id} (${shift.date}): ${existingTimesheets?.length || 0} existing timesheets`);

            if (!existingTimesheets || existingTimesheets.length === 0) {
                shiftsNeedingTimesheets.push(shift);
            }
        }

        console.log(`✅ ${shiftsNeedingTimesheets.length} shifts need timesheets`);

        if (shiftsNeedingTimesheets.length === 0) {
            console.log('⚠️ No shifts needing timesheets found');

            await supabase.functions.invoke('send-whatsapp', {
                body: {
                    to: phone,
                    message: "ℹ️ You don't have any recent shifts needing timesheet submission.\n\nIf you just completed a shift, please wait a few minutes and try again.\n\nOr contact your agency if you believe this is an error."
                }
            });

            return new Response(
                JSON.stringify({
                    success: true,
                    message: 'No shifts needing timesheets',
                    staff_id: staffMember.id,
                    staff_name: `${staffMember.first_name} ${staffMember.last_name}`
                }),
                { headers: { "Content-Type": "application/json" } }
            );
        }

        // Parse the message - Simple parsing for now (would use OpenAI in production)
        console.log(`🤖 Parsing message...`);

        // Simple parsing logic
        const bodyLower = body.toLowerCase();
        let understood = false;
        let hoursWorked = null;
        let breakMinutes = 0;
        let notes = '';
        let needsClarification = false;

        // Check for simple confirmation
        if (bodyLower === 'yes' || bodyLower === 'confirm') {
            understood = true;
            hoursWorked = shiftsNeedingTimesheets[0].duration_hours;
            breakMinutes = 30;
        } else {
            // Try to extract hours
            const hoursMatch = body.match(/(\d+\.?\d*)\s*(hours?|h)/i);
            if (hoursMatch) {
                understood = true;
                hoursWorked = parseFloat(hoursMatch[1]);
            }

            // Try to extract break
            const breakMatch = body.match(/(\d+)\s*(min|minutes)/i);
            if (breakMatch) {
                breakMinutes = parseInt(breakMatch[1]);
            } else if (body.match(/no\s*break/i)) {
                breakMinutes = 0;
            }

            if (!hoursWorked) {
                needsClarification = true;
            }
        }

        console.log(`🤖 Parse result:`, { understood, hoursWorked, breakMinutes, needsClarification });

        if (!understood || needsClarification) {
            console.log('⚠️ Could not parse timesheet data');

            await supabase.functions.invoke('send-whatsapp', {
                body: {
                    to: phone,
                    message: `❓ Could not understand your timesheet. Please reply with:\n\n"11 hours, 30 min break"\n\nOr just "YES" to confirm you worked the full scheduled shift.`
                }
            });

            return new Response(
                JSON.stringify({
                    success: false,
                    message: 'Could not parse timesheet'
                }),
                { headers: { "Content-Type": "application/json" } }
            );
        }

        // Use the most recent shift
        const targetShift = shiftsNeedingTimesheets[0];

        console.log(`📋 Creating timesheet for shift ${targetShift.id}`);

        // Get client details
        const { data: client } = await supabase
            .from("clients")
            .select("*")
            .eq("id", targetShift.client_id)
            .single();

        // Create timesheet
        const hoursWorkedFinal = hoursWorked || targetShift.duration_hours;

        // Calculate pay amounts
        const staffPayAmount = hoursWorkedFinal * targetShift.pay_rate;
        const clientChargeAmount = hoursWorkedFinal * targetShift.charge_rate;

        const { data: timesheet, error: timesheetError } = await supabase
            .from("timesheets")
            .insert({
                agency_id: targetShift.agency_id,
                booking_id: targetShift.booking_id,
                staff_id: staffMember.id,
                client_id: targetShift.client_id,
                shift_date: targetShift.date,
                total_hours: hoursWorkedFinal,
                break_duration_minutes: breakMinutes,
                pay_rate: targetShift.pay_rate,
                charge_rate: targetShift.charge_rate,
                staff_pay_amount: staffPayAmount,
                client_charge_amount: clientChargeAmount,
                status: 'submitted',
                notes: notes ? `WhatsApp: ${notes}` : 'Submitted via WhatsApp',
                staff_signature: `WhatsApp confirmation ${new Date().toISOString()}`,
                staff_approved_at: new Date().toISOString(),
                submitted_via: 'whatsapp',
                whatsapp_message_id: messageId
            })
            .select()
            .single();

        if (timesheetError) {
            throw timesheetError;
        }

        console.log(`✅ Timesheet created: ${timesheet.id}`);

        // Update shift status
        await supabase
            .from("shifts")
            .update({
                status: 'awaiting_admin_closure',
                staff_confirmed_completion: true,
                staff_confirmed_at: new Date().toISOString(),
                staff_confirmation_method: 'whatsapp'
            })
            .eq("id", targetShift.id);

        console.log(`✅ Shift status updated`);

        // Send confirmation to staff
        await supabase.functions.invoke('send-whatsapp', {
            body: {
                to: phone,
                message: `✅ *Timesheet Submitted!*

📋 Shift: ${client?.name || 'Client'}
📅 Date: ${targetShift.date}
⏱️ Hours: ${hoursWorkedFinal}h (${breakMinutes} min break)
💰 You'll earn: £${staffPayAmount.toFixed(2)}

Your timesheet is now awaiting client approval. We'll notify you when it's approved!

_Have a great day!_ 🎉`
            }
        });

        console.log(`✅ Confirmation sent to staff`);

        // Trigger intelligent validation
        try {
            await supabase.functions.invoke('intelligent-timesheet-validator', {
                body: {
                    timesheet_id: timesheet.id
                }
            });
            console.log('✅ Triggered intelligent validation');
        } catch (validationError) {
            console.error('⚠️ Validation trigger failed:', validationError);
        }

        return new Response(
            JSON.stringify({
                success: true,
                timesheet_id: timesheet.id,
                hours_worked: hoursWorkedFinal,
                earnings: staffPayAmount,
                staff_name: `${staffMember.first_name} ${staffMember.last_name}`
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error('❌ [WhatsApp Timesheet Handler] Fatal error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message,
                stack: error.stack
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
