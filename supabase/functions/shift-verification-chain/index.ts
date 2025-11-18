import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * PHASE 3A: Shift Verification Chain
 * Sends automated emails at critical stages of shift lifecycle
 *
 * ✅ FIXED: Robust error handling, graceful degradation if data missing
 */

serve(async (req) => {
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
                headers: { "Content-Type": "application/json" }
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
                    headers: { "Content-Type": "application/json" }
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
                headers: { "Content-Type": "application/json" }
            });
        }

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
                    headers: { "Content-Type": "application/json" }
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
                headers: { "Content-Type": "application/json" }
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
                headers: { "Content-Type": "application/json" }
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

        // Build email based on trigger point
        switch (trigger_point) {
            case 'staff_confirmed_shift':
                if (!staffMember) {
                    return new Response(JSON.stringify({ success: false, error: 'Staff member not found for confirmed shift' }), { status: 400, headers: { "Content-Type": "application/json" } });
                }

                emailSubject = `✅ Confirmed: ${staffMember.first_name} for your shift on ${shift.date}`;
                emailBody = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: #10b981; padding: 30px; text-align: center; color: white;">
                            <h1 style="margin: 0;">Shift Confirmed</h1>
                        </div>
                        <div style="padding: 30px; background: #f9fafb;">
                            <p>Dear ${client.contact_person.name || 'Team'},</p>
                            <p>Great news! <strong>${staffMember.first_name} ${staffMember.last_name}</strong> has personally confirmed they will be there for the <strong>${shift.role_required.replace(/_/g, ' ')}</strong> shift on <strong>${shift.date}</strong> at <strong>${shift.start_time}</strong>.</p>
                            <p>We've also sent them the shift details and a reminder. You can rest assured your shift is covered. No further action is needed from you.</p>
                            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                                This is an automated notification from ACG StaffLink to provide you with peace of mind.
                            </p>
                        </div>
                    </div>
                `;
                changeLogDescription = `Client notification sent for staff confirmation (${staffMember.first_name})`;
                break;

            case 'staff_clocked_in':
                if (!staffMember) {
                    console.error('❌ [Verification Chain] Staff member required for staff_clocked_in trigger');
                    return new Response(JSON.stringify({
                        success: false,
                        error: 'Staff member not found for clocked-in shift'
                    }), {
                        status: 400,
                        headers: { "Content-Type": "application/json" }
                    });
                }

                emailSubject = `✅ Staff Clocked In: ${staffMember.first_name} ${staffMember.last_name}`;
                emailBody = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: #22c55e; padding: 30px; text-align: center;">
                            ${agency?.logo_url ? `<img src="${agency.logo_url}" alt="${agency.name}" style="max-width: 120px; margin-bottom: 15px; filter: brightness(0) invert(1);">` : ''}
                            <h1 style="color: white; margin: 0;">Staff Has Arrived & Clocked In</h1>
                        </div>

                        <div style="padding: 30px; background: #f9fafb;">
                            <p>Dear ${client.contact_person.name || 'Team'},</p>

                            <p>This is an automated notification to confirm that <strong>${staffMember.first_name} ${staffMember.last_name}</strong> has arrived on-site and clocked in for their shift.</p>

                            <div style="background: white; border-left: 4px solid #22c55e; padding: 20px; margin: 20px 0;">
                                <h3>Clock-In Details</h3>
                                <p><strong>Clock-In Time:</strong> ${additional_data?.clock_in_time || new Date().toLocaleTimeString()}</p>
                                <p><strong>Geofence Validated:</strong> ${additional_data?.geofence_validated ? 'Yes' : 'No'}</p>
                                ${additional_data?.distance_meters ? `<p><strong>Distance from Site:</strong> ${Math.round(additional_data.distance_meters)} meters</p>` : ''}
                            </div>

                            <div style="background: white; border-left: 4px solid #06b6d4; padding: 20px; margin: 20px 0;">
                                <h3>Shift Details</h3>
                                <p><strong>Date:</strong> ${shift.date}</p>
                                <p><strong>Time:</strong> ${shift.start_time} - ${shift.end_time}</p>
                                ${shift.work_location_within_site ? `<p><strong>Location:</strong> ${shift.work_location_within_site}</p>` : ''}
                            </div>

                            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                                Reference: SHIFT-${shift.id.substring(0, 8).toUpperCase()}<br>
                                ${agency?.name || 'ACG StaffLink'} | ${agency?.contact_email || 'support@acgstafflink.com'}
                            </p>
                        </div>
                    </div>
                `;
                changeLogDescription = `Staff clock-in notification sent to ${client.name}`;

                // 🚨 CRITICAL ALERT: Notify admin if geofence validation failed
                if (additional_data?.geofence_validated === false) {
                    try {
                        const subject = `⚠️ Geofence Mismatch Alert: ${staffMember.first_name} ${staffMember.last_name}`;
                        const body_html = `
                            <p><strong>HIGH PRIORITY ALERT</strong></p>
                            <p>A staff member has clocked in outside the designated geofence for a shift.</p>
                            <ul>
                                <li><strong>Staff:</strong> ${staffMember.first_name} ${staffMember.last_name}</li>
                                <li><strong>Client:</strong> ${client.name}</li>
                                <li><strong>Shift Date:</strong> ${shift.date}</li>
                                <li><strong>Clock-In Time:</strong> ${additional_data?.clock_in_time || 'N/A'}</li>
                                <li><strong>Distance from Site:</strong> ${Math.round(additional_data?.distance_meters || 0)} meters</li>
                            </ul>
                            <p>Please review this clock-in event immediately to ensure accuracy and compliance.</p>
                        `;
                        
                        await supabase.functions.invoke('internal-admin-notifier', {
                            body: { subject, body_html, change_type: 'geofence_mismatch_alert' }
                        });
                        console.log("✅ Admin alert for geofence mismatch sent.");
                    } catch (adminAlertError) {
                        console.error("❌ Failed to send admin geofence alert:", adminAlertError);
                    }
                }
                break;

            case 'staff_assigned':
                if (!staffMember) {
                    console.error('❌ [Verification Chain] Staff member required for staff_assigned trigger');
                    return new Response(JSON.stringify({
                        success: false,
                        error: 'Staff member not found for assigned shift'
                    }), {
                        status: 400,
                        headers: { "Content-Type": "application/json" }
                    });
                }

                emailSubject = `Staff Assigned - ${staffMember.first_name} ${staffMember.last_name}`;
                emailBody = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: #10b981; padding: 30px; text-align: center;">
                            ${agency?.logo_url ? `<img src="${agency.logo_url}" alt="${agency.name}" style="max-width: 120px; margin-bottom: 15px; filter: brightness(0) invert(1);">` : ''}
                            <h1 style="color: white; margin: 0;">Staff Member Assigned</h1>
                        </div>

                        <div style="padding: 30px; background: #f9fafb;">
                            <p>Dear ${client.contact_person.name || 'Team'},</p>

                            <p>A staff member has been assigned to your shift at <strong>${client.name}</strong>.</p>

                            <div style="background: white; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
                                <h3>Staff Member Details</h3>
                                <p><strong>Name:</strong> ${staffMember.first_name} ${staffMember.last_name}</p>
                                <p><strong>Role:</strong> ${staffMember.role.replace('_', ' ')}</p>
                                <p><strong>Contact:</strong> ${staffMember.phone || 'Available on request'}</p>
                            </div>

                            <div style="background: white; border-left: 4px solid #06b6d4; padding: 20px; margin: 20px 0;">
                                <h3>Shift Details</h3>
                                <p><strong>Date:</strong> ${shift.date}</p>
                                <p><strong>Time:</strong> ${shift.start_time} - ${shift.end_time}</p>
                                ${shift.work_location_within_site ? `<p><strong>Location:</strong> ${shift.work_location_within_site}</p>` : ''}
                            </div>

                            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                                Reference: SHIFT-${shift.id.substring(0, 8).toUpperCase()}<br>
                                ${agency?.name || 'ACG StaffLink'} | ${agency?.contact_email || 'support@acgstafflink.com'}
                            </p>
                        </div>
                    </div>
                `;
                changeLogDescription = `Staff assignment notification sent to ${client.name}`;
                break;

            default:
                console.warn(`⚠️ [Verification Chain] Unknown trigger point: ${trigger_point}`);
                return new Response(JSON.stringify({
                    success: false,
                    error: `Unknown trigger point: ${trigger_point}`
                }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                });
        }

        // ✅ FIX 6: Send email with error handling
        try {
            console.log(`📧 [Verification Chain] Sending email to: ${client.contact_person.email}`);

            await supabase.functions.invoke('send-email', {
                body: {
                    to: client.contact_person.email,
                    subject: emailSubject,
                    html: emailBody,
                    from_name: agency?.name || 'ACG StaffLink'
                }
            });

            console.log('✅ [Verification Chain] Email sent successfully');
        } catch (emailError) {
            console.error('❌ [Verification Chain] Email send failed:', emailError);
            return new Response(JSON.stringify({
                success: false,
                error: 'Email send failed',
                details: emailError.message
            }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        // ✅ FIX 7: Log in ChangeLog (optional - don't fail if this fails)
        try {
            await supabase.from("change_logs").insert({
                agency_id: shift.agency_id,
                change_type: 'shift_verification_email',
                affected_entity_type: 'shift',
                affected_entity_id: shift_id,
                old_value: trigger_point,
                new_value: `Email sent to ${client.contact_person.email}`,
                reason: changeLogDescription,
                changed_by: 'system',
                changed_by_email: 'automation@acgstafflink.com',
                changed_at: new Date().toISOString(),
                risk_level: 'low',
                reviewed: false
            });
        } catch (logError) {
            console.warn('⚠️ [Verification Chain] ChangeLog creation failed (non-critical):', logError);
        }

        return new Response(JSON.stringify({
            success: true,
            trigger_point,
            email_sent_to: client.contact_person.email,
            shift_reference: `SHIFT-${shift.id.substring(0, 8).toUpperCase()}`,
            message: 'Verification email sent successfully'
        }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('❌ [Verification Chain] Fatal error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            stack: error.stack
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
});
