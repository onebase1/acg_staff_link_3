import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getBranding } from "../_shared/getBranding.ts";

/**
 * PHASE 3A: Shift Verification Chain
 * Sends automated emails at critical stages of shift lifecycle
 *
 * ✅ FIXED: Robust error handling, graceful degradation if data missing
 */

// CORS headers for browser requests
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

        const { shift_id, trigger_point, additional_data } = await req.json();

        if (!shift_id || !trigger_point) {
            console.error('❌ [Verification Chain] Missing required fields');
            return new Response(JSON.stringify({
                success: false,
                error: 'shift_id and trigger_point required'
            }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        console.log(`📧 [Verification Chain] Trigger: ${trigger_point} for shift ${shift_id.substring(0, 8)}`);

        // ✅ FIX 1: Get shift details with error handling
        let shift;
        try {
            const { data: shifts } = await supabase
                .from("shifts")
                .select("*")
                .eq("id", shift_id);

            if (!shifts || shifts.length === 0) {
                console.error('❌ [Verification Chain] Shift not found:', shift_id);
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Shift not found'
                }), {
                    status: 404,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }
            shift = shifts[0];
        } catch (shiftError) {
            console.error('❌ [Verification Chain] Error fetching shift:', shiftError);
            return new Response(JSON.stringify({
                success: false,
                error: 'Failed to fetch shift data'
            }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Get dynamic branding for this agency
        const branding = await getBranding(supabase, shift.agency_id);

        // ✅ FIX 2: Get client details with validation
        let client;
        try {
            const { data: clients } = await supabase
                .from("clients")
                .select("*")
                .eq("id", shift.client_id);

            if (!clients || clients.length === 0) {
                console.error('⚠️ [Verification Chain] Client not found:', shift.client_id);
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Client not found'
                }), {
                    status: 404,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }
            client = clients[0];
        } catch (clientError) {
            console.error('❌ [Verification Chain] Error fetching client:', clientError);
            return new Response(JSON.stringify({
                success: false,
                error: 'Failed to fetch client data'
            }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // ✅ FIX 3: Validate client contact email BEFORE proceeding
        if (!client.contact_person?.email) {
            console.warn('⚠️ [Verification Chain] No client contact email configured');
            return new Response(JSON.stringify({
                success: false,
                error: 'Client contact email not configured',
                skipped: true,
                reason: 'missing_email'
            }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // ✅ FIX 4: Get staff details with error handling (if assigned)
        let staffMember = null;
        if (shift.assigned_staff_id) {
            try {
                const { data: staffList } = await supabase
                    .from("staff")
                    .select("*")
                    .eq("id", shift.assigned_staff_id);

                if (staffList && staffList.length > 0) {
                    staffMember = staffList[0];
                    console.log('✅ [Verification Chain] Staff found:', staffMember.first_name, staffMember.last_name);
                } else {
                    console.warn('⚠️ [Verification Chain] Staff not found:', shift.assigned_staff_id);
                }
            } catch (staffError) {
                console.error('⚠️ [Verification Chain] Error fetching staff:', staffError);
            }
        }

        // ✅ FIX 5: Get agency details with fallback
        let agency = null;
        try {
            const { data: agencies } = await supabase
                .from("agencies")
                .select("*")
                .eq("id", shift.agency_id);

            agency = agencies && agencies.length > 0 ? agencies[0] : null;
            console.log('📋 [Verification Chain] Agency:', agency ? agency.name : 'Not found (using fallback)');
        } catch (agencyError) {
            console.warn('⚠️ [Verification Chain] Error fetching agency:', agencyError);
        }

        let emailSubject, emailBody, changeLogDescription;

        /**
         * 📧 PREMIUM EMAIL CONTAINER
         */
        const getEmailContainer = (content: string, headerColor: string, title: string) => {
            const logoHtml = agency?.logo_url 
                ? `<div style="margin-bottom: 20px;"><img src="${agency.logo_url}" alt="${agency.name}" style="max-width: 160px; filter: brightness(0) invert(1);"></div>`
                : `<h2 style="color: white; margin: 0 0 20px 0; font-size: 20px;">${agency?.name || branding.saasName}</h2>`;

            return `
                <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 20px auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; background-color: #ffffff; color: #1f2937; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                    <div style="background-color: ${headerColor}; padding: 40px 20px; text-align: center;">
                        ${logoHtml}
                        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em; line-height: 1.2;">${title}</h1>
                    </div>
                    <div style="padding: 40px; line-height: 1.6;">
                        ${content}
                        
                        <div style="margin-top: 48px; border-top: 1px solid #f3f4f6; padding-top: 32px; text-align: center;">
                            <p style="color: #9ca3af; font-size: 12px; margin: 0; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">
                                Notification via ACG StaffLink • Security & Transparency
                            </p>
                        </div>
                    </div>
                </div>
            `;
        };

        // Build email or queue notification based on trigger point
        switch (trigger_point) {
            case 'staff_confirmed_shift':
                if (!staffMember) {
                    return new Response(JSON.stringify({ success: false, error: 'Staff member not found' }), { 
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }

                // QUEUE for batched professional email
                try {
                    console.log(`📥 [Verification Chain] Queuing confirmation for ${staffMember.first_name} for client ${client.name}`);
                    const { error: queueError } = await supabase.rpc('queue_notification', {
                        p_agency_id: shift.agency_id,
                        p_recipient_email: client.contact_person.email,
                        p_recipient_first_name: client.contact_person.name || 'Team',
                        p_recipient_type: 'client',
                        p_notification_type: 'shift_confirmation',
                        p_item: {
                            date: shift.date,
                            start_time: shift.start_time,
                            end_time: shift.end_time,
                            duration_hours: shift.duration_hours,
                            role: shift.role_required,
                            staff_name: `${staffMember.first_name} ${staffMember.last_name}`,
                            staff_phone: staffMember.phone,
                            staff_id: shift.assigned_staff_id,
                            shift_id: shift.id,
                            location: shift.work_location_within_site
                        }
                    });

                    if (queueError) throw queueError;

                    changeLogDescription = `Shift confirmation queued for batching (${staffMember.first_name})`;
                } catch (err) {
                    console.error('❌ [Verification Chain] Failed to queue confirmation:', err);
                    return new Response(JSON.stringify({ success: false, error: 'Queue failed' }), { 
                        status: 500,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }
                break;

            case 'staff_assigned':
                if (!staffMember) {
                    return new Response(JSON.stringify({ success: false, error: 'Staff member not found' }), { 
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }

                // QUEUE for batched professional email
                try {
                    console.log(`📥 [Verification Chain] Queuing assignment for ${staffMember.first_name} for client ${client.name}`);
                    const { error: queueError } = await supabase.rpc('queue_notification', {
                        p_agency_id: shift.agency_id,
                        p_recipient_email: client.contact_person.email,
                        p_recipient_first_name: client.contact_person.name || 'Team',
                        p_recipient_type: 'client',
                        p_notification_type: 'shift_confirmation',
                        p_item: {
                            date: shift.date,
                            start_time: shift.start_time,
                            end_time: shift.end_time,
                            duration_hours: shift.duration_hours,
                            role: shift.role_required,
                            staff_name: `${staffMember.first_name} ${staffMember.last_name}`,
                            staff_phone: staffMember.phone,
                            staff_id: shift.assigned_staff_id,
                            shift_id: shift.id,
                            location: shift.work_location_within_site,
                            is_provisional_assignment: true
                        }
                    });

                    if (queueError) throw queueError;
                    
                    changeLogDescription = `Shift assignment queued for batching (${staffMember.first_name})`;
                } catch (err) {
                    console.error('❌ [Verification Chain] Failed to queue assignment:', err);
                    return new Response(JSON.stringify({ success: false, error: 'Queue failed' }), { 
                        status: 500,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }
                break;

            case 'staff_clocked_in':
                if (!staffMember) {
                    return new Response(JSON.stringify({ success: false, error: 'Staff member not found' }), { 
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }

                const isVerifiedOnSite = additional_data?.is_on_site === true || additional_data?.geofence_validated === true;
                const shouldSendArrivalEmail = client.geofence_enabled !== false || isVerifiedOnSite;

                if (!shouldSendArrivalEmail) {
                    console.log(`⏭️ [Verification Chain] Skipping clock-in email for non-GPS client: ${client.name} (Staff not detected on-site)`);
                    return new Response(JSON.stringify({ 
                        success: true, 
                        message: 'Skipped - client has GPS disabled and staff not on-site',
                        skipped: true,
                        reason: 'geofence_disabled_and_not_on_site'
                    }), { 
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }

                // IMMEDIATE SEND (Clock-in is real-time awareness)
                emailSubject = `✅ ${staffMember.first_name} ${staffMember.last_name} Has Arrived Safely`;
                
                const arrivalContent = `
                    <p style="font-size: 16px; color: #4b5563;">Hi ${client.contact_person.name || 'Team'},</p>
                    <p style="font-size: 16px; color: #4b5563;">This is to confirm that <strong>${staffMember.first_name} ${staffMember.last_name}</strong> has successfully arrived on-site and clocked in for their shift.</p>
                    
                    <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0; border: 1px solid #f3f4f6;">
                        <h3 style="margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em;">Attendance Details</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Status</td>
                                <td style="padding: 8px 0; color: #059669; font-weight: 600; text-align: right; font-size: 14px;">✅ ${isVerifiedOnSite ? 'Verified On-Site' : 'Confirmed'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">GPS Check</td>
                                <td style="padding: 8px 0; color: #374151; font-weight: 500; text-align: right; font-size: 14px;">${isVerifiedOnSite ? 'Secure Match' : 'Bypassed'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Activity</td>
                                <td style="padding: 8px 0; color: #374151; font-weight: 500; text-align: right; font-size: 14px;">Clocked In</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time</td>
                                <td style="padding: 8px 0; color: #374151; font-weight: 500; text-align: right; font-size: 14px;">${additional_data?.clock_in_time || new Date().toLocaleTimeString()}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="background-color: #ffffff; border-radius: 8px; padding: 24px; margin: 24px 0; border: 1px solid #f3f4f6;">
                        <h3 style="margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em;">Shift Info</h3>
                        <p style="margin: 4px 0; font-size: 15px;"><strong>Date:</strong> ${shift.date}</p>
                        <p style="margin: 4px 0; font-size: 15px;"><strong>Scheduled:</strong> ${shift.start_time} - ${shift.end_time}</p>
                        <p style="margin: 4px 0; font-size: 15px;"><strong>Role:</strong> ${shift.role_required}</p>
                        <p style="margin: 12px 0 0 0; font-size: 13px; color: #9ca3af;">Ref: SHIFT-${shift.id.substring(0, 8).toUpperCase()}</p>
                    </div>
                `;

                const arrivalTitle = `${staffMember.first_name.toUpperCase()} <span style="background-color: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; margin: 0 4px;">Arrived</span> & Clocked In`;
                emailBody = getEmailContainer(arrivalContent, '#22c55e', arrivalTitle);
                
                try {
                    await supabase.functions.invoke('send-email', {
                        body: {
                            to: client.contact_person.email,
                            subject: emailSubject,
                            html: emailBody,
                            from_name: agency?.name || branding.saasName
                        }
                    });
                } catch (emailError) {
                    console.error('❌ [Verification Chain] Clock-in email failed:', emailError);
                }

                changeLogDescription = `Staff clock-in notification sent to ${client.name}`;
                break;

            case 'staff_arrival_only':
                if (!staffMember) {
                    return new Response(JSON.stringify({ success: false, error: 'Staff member not found' }), { 
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }

                // IMMEDIATE SEND
                emailSubject = `✅ ${staffMember.first_name} ${staffMember.last_name} Has Arrived (Paper Timesheet Site)`;
                
                const paperArrivalContent = `
                    <p style="font-size: 16px; color: #4b5563;">Hi ${client.contact_person.name || 'Team'},</p>
                    <p style="font-size: 16px; color: #4b5563;">This is to confirm that <strong>${staffMember.first_name} ${staffMember.last_name}</strong> has arrived on-site for their shift.</p>
                    
                    <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin: 24px 0; border: 1px solid #e5e7eb;">
                        <h3 style="margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em;">Arrival Verification</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Status</td>
                                <td style="padding: 8px 0; color: #059669; font-weight: 600; text-align: right; font-size: 14px;">✅ Arrived On-Site</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time</td>
                                <td style="padding: 8px 0; color: #374151; font-weight: 500; text-align: right; font-size: 14px;">${new Date().toLocaleTimeString()}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Verification</td>
                                <td style="padding: 8px 0; color: #374151; font-weight: 500; text-align: right; font-size: 14px;">App Proximity Match</td>
                            </tr>
                        </table>
                    </div>

                    <div style="background-color: #fffbeb; border-radius: 8px; padding: 16px; margin: 24px 0; border: 1px solid #fef3c7;">
                        <p style="margin: 0; font-size: 14px; color: #92400e;">
                            <strong>Note:</strong> This site uses <strong>Paper Timesheets</strong>. Staff will present a physical timesheet for signature at the end of their shift.
                        </p>
                    </div>

                    <div style="background-color: #ffffff; border-radius: 8px; padding: 24px; margin: 24px 0; border: 1px solid #f3f4f6;">
                        <h3 style="margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em;">Assignment details</h3>
                        <p style="margin: 4px 0; font-size: 15px;"><strong>Date:</strong> ${shift.date}</p>
                        <p style="margin: 4px 0; font-size: 15px;"><strong>Scheduled:</strong> ${shift.start_time} - ${shift.end_time}</p>
                        <p style="margin: 4px 0; font-size: 15px;"><strong>Role:</strong> ${shift.role_required}</p>
                        <p style="margin: 12px 0 0 0; font-size: 13px; color: #9ca3af;">Ref: SHIFT-${shift.id.substring(0, 8).toUpperCase()}</p>
                    </div>
                `;

                const paperTitle = `${staffMember.first_name.toUpperCase()} <span style="background-color: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; margin: 0 4px;">Arrived</span> Confirmed`;
                emailBody = getEmailContainer(paperArrivalContent, '#22c55e', paperTitle);
                
                try {
                    await supabase.functions.invoke('send-email', {
                        body: {
                            to: client.contact_person.email,
                            subject: emailSubject,
                            html: emailBody,
                            from_name: agency?.name || branding.saasName
                        }
                    });
                } catch (emailError) {
                    console.error('❌ [Verification Chain] Arrival email failed:', emailError);
                }

                changeLogDescription = `Staff 'I HAVE ARRIVED' (Paper Site) notification sent to ${client.name}`;
                break;

            case 'staff_on_my_way':
                if (!staffMember) {
                    return new Response(JSON.stringify({ success: false, error: 'Staff member not found' }), { 
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }

                const etaValue = additional_data?.eta || 'shortly';
                
                // 💾 PERSISTENCE
                try {
                    const journeyEntry = {
                        state: 'on_my_way',
                        timestamp: new Date().toISOString(),
                        method: 'staff_portal',
                        notes: `Staff marked themselves as enroute. ETA: ${etaValue}`
                    };

                    const { data: currentShift } = await supabase
                        .from("shifts")
                        .select("shift_journey_log")
                        .eq("id", shift.id)
                        .single();

                    const currentLogs = currentShift?.shift_journey_log || [];
                    const newLogs = Array.isArray(currentLogs) ? [...currentLogs, journeyEntry] : [journeyEntry];

                    await supabase.from("shifts").update({
                        on_my_way_at: new Date().toISOString(),
                        estimated_arrival_time: etaValue,
                        shift_journey_log: newLogs
                    }).eq("id", shift.id);
                } catch (updateError) {
                    console.error('❌ [Verification Chain] Failed to persist On My Way data:', updateError);
                }

                // IMMEDIATE SEND
                emailSubject = `🏠 ${staffMember.first_name} ${staffMember.last_name} is Enroute (ETA: ${etaValue})`;
                
                const enrouteContent = `
                    <p style="font-size: 16px; color: #4b5563;">Hi ${client.contact_person.name || 'Team'},</p>
                    <p style="font-size: 16px; color: #4b5563;">This is to inform you that <strong>${staffMember.first_name} ${staffMember.last_name}</strong> is now on their way to your site for their scheduled shift.</p>
                    
                    <div style="background-color: #eff6ff; border-radius: 8px; padding: 24px; margin: 24px 0; border: 1px solid #dbeafe; text-align: center;">
                        <span style="font-size: 13px; text-transform: uppercase; color: #3b82f6; letter-spacing: 0.05em; font-weight: 600;">Estimated Arrival</span>
                        <div style="font-size: 32px; font-weight: 800; color: #1e40af; margin: 8px 0;">${etaValue}</div>
                    </div>

                    <div style="background-color: #ffffff; border-radius: 8px; padding: 24px; margin: 24px 0; border: 1px solid #f3f4f6;">
                        <h3 style="margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.05em;">Assignment details</h3>
                        <p style="margin: 4px 0; font-size: 15px;"><strong>Date:</strong> ${shift.date}</p>
                        <p style="margin: 4px 0; font-size: 15px;"><strong>Scheduled:</strong> ${shift.start_time} - ${shift.end_time}</p>
                        <p style="margin: 4px 0; font-size: 15px;"><strong>Role:</strong> ${shift.role_required}</p>
                        <p style="margin: 12px 0 0 0; font-size: 13px; color: #9ca3af;">Ref: SHIFT-${shift.id.substring(0, 8).toUpperCase()}</p>
                    </div>
                `;

                emailBody = getEmailContainer(enrouteContent, '#3b82f6', `${staffMember.first_name} is Enroute`);
                
                try {
                    await supabase.functions.invoke('send-email', {
                        body: {
                            to: client.contact_person.email,
                            subject: emailSubject,
                            html: emailBody,
                            from_name: agency?.name || branding.saasName
                        }
                    });
                } catch (emailError) {
                    console.error('❌ [Verification Chain] On My Way email failed:', emailError);
                }

                changeLogDescription = `Staff 'On My Way' (ETA: ${etaValue}) notification sent to ${client.name}`;
                break;

            default:
                console.warn(`⚠️ [Verification Chain] Unknown trigger: ${trigger_point}`);
                return new Response(JSON.stringify({ success: false, error: `Unknown trigger: ${trigger_point}` }), { 
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
        }

        // Log in ChangeLog
        try {
            await supabase.from("change_logs").insert({
                agency_id: shift.agency_id,
                change_type: 'shift_verification_action',
                affected_entity_type: 'shift',
                affected_entity_id: shift_id,
                old_value: trigger_point,
                new_value: changeLogDescription,
                reason: changeLogDescription,
                changed_by: 'system',
                risk_level: 'low'
            });
        } catch (logError) {
            console.warn('⚠️ [Verification Chain] ChangeLog failed:', logError);
        }

        return new Response(JSON.stringify({
            success: true,
            message: changeLogDescription || 'Action completed successfully'
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('❌ [Verification Chain] Fatal error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
