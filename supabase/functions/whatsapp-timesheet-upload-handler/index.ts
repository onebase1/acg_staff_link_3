import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * 📸 WHATSAPP TIMESHEET UPLOAD HANDLER
 * 
 * Handles timesheet image uploads from WhatsApp:
 * 1. Receives WhatsApp message with image attachment
 * 2. Downloads image from WhatsApp Business Cloud API
 * 3. Uploads to Supabase Storage (documents bucket)
 * 4. Runs OCR extraction via extract-timesheet-data function
 * 5. Creates/updates timesheet record
 * 6. Sends confirmation to staff via WhatsApp
 * 
 * Input (from n8n WhatsApp receiver workflow):
 * {
 *   "from": "+447557679989",
 *   "message_type": "image",
 *   "image_url": "https://...",
 *   "image_id": "...",
 *   "caption": "My timesheet for today",
 *   "profileName": "John Doe"
 * }
 */

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
        const { from, message_type, image_url, image_id, caption, profileName } = await req.json();

        console.log(`📸 [Timesheet Upload] From: ${from} (${profileName})`);
        console.log(`📸 [Timesheet Upload] Image URL: ${image_url}`);

        // Validate required fields
        if (!from || !image_url || message_type !== 'image') {
            return new Response(JSON.stringify({ 
                error: 'Invalid request. Expected WhatsApp image message.' 
            }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Normalize phone number
        const phone = from.replace(/[^\d+]/g, '');

        // Find staff by phone number
        const staff = await findStaffByPhone(supabase, phone);

        if (!staff) {
            console.log(`❌ [Timesheet Upload] No staff found for phone: ${phone}`);
            await sendWhatsAppResponse(supabase, phone,
                `❌ *Staff Profile Not Found*\n\n` +
                `We couldn't find your staff profile.\n\n` +
                `Please contact your agency admin to link your WhatsApp number.`
            );
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Staff not found' 
            }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        console.log(`✅ [Timesheet Upload] Staff found: ${staff.first_name} ${staff.last_name} (ID: ${staff.id})`);

        // Download image from WhatsApp
        console.log(`📥 [Timesheet Upload] Downloading image from WhatsApp...`);
        const imageResponse = await fetch(image_url);
        
        if (!imageResponse.ok) {
            throw new Error(`Failed to download image: ${imageResponse.statusText}`);
        }

        const imageBlob = await imageResponse.blob();
        const imageBuffer = await imageBlob.arrayBuffer();
        
        console.log(`✅ [Timesheet Upload] Image downloaded (${imageBuffer.byteLength} bytes)`);

        // Upload to Supabase Storage
        const fileName = `timesheets/${staff.id}/${Date.now()}-whatsapp-timesheet.jpg`;
        
        console.log(`📤 [Timesheet Upload] Uploading to Supabase Storage: ${fileName}`);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, imageBuffer, {
                contentType: 'image/jpeg',
                upsert: false
            });

        if (uploadError) {
            console.error('❌ [Timesheet Upload] Upload error:', uploadError);
            throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(fileName);

        console.log(`✅ [Timesheet Upload] File uploaded: ${publicUrl}`);

        // Find recent completed shift for this staff
        const { data: recentShifts } = await supabase
            .from('shifts')
            .select('*, clients(*)')
            .eq('assigned_staff_id', staff.id)
            .eq('agency_id', staff.agency_id)
            .in('status', ['completed', 'awaiting_admin_closure', 'in_progress'])
            .order('date', { ascending: false })
            .limit(5);

        if (!recentShifts || recentShifts.length === 0) {
            console.log(`⚠️ [Timesheet Upload] No recent shifts found for staff ${staff.id}`);
            await sendWhatsAppResponse(supabase, phone,
                `ℹ️ *No Recent Shifts Found*\n\n` +
                `We couldn't find any recent shifts needing a timesheet.\n\n` +
                `If you just completed a shift, please wait a few minutes and try again.\n\n` +
                `Or contact your agency if you believe this is an error.`
            );
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'No recent shifts found' 
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const targetShift = recentShifts[0];
        console.log(`🎯 [Timesheet Upload] Target shift: ${targetShift.id} (${targetShift.date})`);

        // Process timesheet upload
        const result = await processTimesheetUpload(supabase, {
            staff,
            shift: targetShift,
            file_url: publicUrl,
            fileName,
            caption,
            phone
        });

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('❌ [Timesheet Upload] Error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
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
 * Process timesheet upload: OCR extraction, timesheet creation, confirmation
 */
async function processTimesheetUpload(supabase: any, params: any) {
    const { staff, shift, file_url, fileName, caption, phone } = params;

    console.log(`🔍 [Timesheet Upload] Running OCR extraction...`);

    // Run OCR extraction
    const { data: ocrResult, error: ocrError } = await supabase.functions.invoke('extract-timesheet-data', {
        body: {
            file_url,
            expected_staff_name: `${staff.first_name} ${staff.last_name}`,
            expected_client_name: shift.clients?.name,
            expected_date: shift.date,
            expected_hours: shift.duration_hours
        }
    });

    if (ocrError) {
        console.error('❌ [Timesheet Upload] OCR error:', ocrError);
        await sendWhatsAppResponse(supabase, phone,
            `⚠️ *OCR Processing Failed*\n\n` +
            `We couldn't extract data from your timesheet image.\n\n` +
            `Please try:\n` +
            `• Taking a clearer photo\n` +
            `• Ensuring good lighting\n` +
            `• Making sure all text is visible\n\n` +
            `Or submit via the Staff Portal:\n` +
            `https://agilecaremanagement.netlify.app/staff/timesheets`
        );
        return { success: false, error: 'OCR extraction failed' };
    }

    console.log(`📊 [Timesheet Upload] OCR Result:`, ocrResult.data);

    const extractedData = ocrResult.data?.extracted_data || {};
    const hoursWorked = extractedData.hours_worked || extractedData.total_hours || shift.duration_hours;
    const breakMinutes = extractedData.break_duration_minutes || 30;
    const confidenceScore = ocrResult.data?.confidence_score || 0;
    const requiresReview = ocrResult.data?.requires_manual_review || confidenceScore < 80;

    // Check if timesheet already exists for this shift
    const { data: existingTimesheets } = await supabase
        .from('timesheets')
        .select('*')
        .eq('booking_id', shift.booking_id)
        .eq('staff_id', staff.id)
        .eq('agency_id', staff.agency_id);

    let timesheet;
    let isUpdate = false;

    if (existingTimesheets && existingTimesheets.length > 0) {
        // Update existing timesheet
        timesheet = existingTimesheets[0];
        isUpdate = true;

        console.log(`📝 [Timesheet Upload] Updating existing timesheet: ${timesheet.id}`);

        const newDocument = {
            file_url,
            uploaded_at: new Date().toISOString(),
            uploaded_by: staff.email || phone,
            file_name: fileName,
            file_type: 'image/jpeg',
            notes: caption || 'Uploaded via WhatsApp',
            extracted_data: extractedData
        };

        const existingDocs = timesheet.uploaded_documents || [];

        const { error: updateError } = await supabase
            .from('timesheets')
            .update({
                uploaded_documents: [...existingDocs, newDocument],
                total_hours: hoursWorked,
                break_duration_minutes: breakMinutes,
                staff_pay_amount: hoursWorked * (timesheet.pay_rate || shift.pay_rate),
                client_charge_amount: hoursWorked * (timesheet.charge_rate || shift.charge_rate),
                status: 'submitted',
                staff_signature: `WhatsApp upload ${new Date().toISOString()}`,
                staff_approved_at: new Date().toISOString(),
                notes: (timesheet.notes || '') + `\n[WhatsApp Upload] ${caption || 'Timesheet uploaded'}`
            })
            .eq('id', timesheet.id);

        if (updateError) {
            console.error('❌ [Timesheet Upload] Update error:', updateError);
            throw updateError;
        }

    } else {
        // Create new timesheet
        console.log(`📝 [Timesheet Upload] Creating new timesheet for shift: ${shift.id}`);

        const staffPayAmount = hoursWorked * shift.pay_rate;
        const clientChargeAmount = hoursWorked * shift.charge_rate;

        const newDocument = {
            file_url,
            uploaded_at: new Date().toISOString(),
            uploaded_by: staff.email || phone,
            file_name: fileName,
            file_type: 'image/jpeg',
            notes: caption || 'Uploaded via WhatsApp',
            extracted_data: extractedData
        };

        const { data: newTimesheet, error: createError } = await supabase
            .from('timesheets')
            .insert({
                agency_id: staff.agency_id,
                booking_id: shift.booking_id,
                staff_id: staff.id,
                client_id: shift.client_id,
                shift_date: shift.date,
                total_hours: hoursWorked,
                break_duration_minutes: breakMinutes,
                pay_rate: shift.pay_rate,
                charge_rate: shift.charge_rate,
                staff_pay_amount: staffPayAmount,
                client_charge_amount: clientChargeAmount,
                status: 'submitted',
                notes: `WhatsApp upload: ${caption || 'Timesheet submitted'}`,
                staff_signature: `WhatsApp upload ${new Date().toISOString()}`,
                staff_approved_at: new Date().toISOString(),
                uploaded_documents: [newDocument]
            })
            .select()
            .single();

        if (createError) {
            console.error('❌ [Timesheet Upload] Create error:', createError);
            throw createError;
        }

        timesheet = newTimesheet;
    }

    // Update shift status
    await supabase
        .from('shifts')
        .update({
            timesheet_id: timesheet.id,
            timesheet_received: true,
            timesheet_received_at: new Date().toISOString()
        })
        .eq('id', shift.id);

    console.log(`✅ [Timesheet Upload] Timesheet ${isUpdate ? 'updated' : 'created'}: ${timesheet.id}`);

    // Send confirmation based on confidence score
    let confirmationMessage;

    if (!requiresReview && confidenceScore >= 80) {
        // HIGH CONFIDENCE - Interactive confirmation (Option A)
        console.log(`✅ [Timesheet Upload] High confidence (${confidenceScore}%) - Requesting staff confirmation`);

        // Update timesheet status to pending_confirmation
        await supabase
            .from('timesheets')
            .update({ status: 'pending_confirmation' })
            .eq('id', timesheet.id);

        confirmationMessage = `✅ *Timesheet Received!*\n\n` +
            `Hi ${staff.first_name},\n\n` +
            `We extracted the following data from your timesheet:\n\n` +
            `📋 Shift: ${shift.clients?.name || 'Client'}\n` +
            `📅 Date: ${shift.date}\n` +
            `⏱️ Hours: ${hoursWorked}h\n` +
            `☕ Break: ${breakMinutes} min\n` +
            `${extractedData.signature_present ? '✅ Signature: Present' : '⚠️ Signature: Not detected'}\n\n` +
            `*Is this correct?*\n\n` +
            `Reply *YES* to confirm\n` +
            `Reply *NO* if it needs review\n\n` +
            `_Confidence: ${confidenceScore}%_`;
    } else {
        // LOW CONFIDENCE - Simple confirmation
        console.log(`⚠️ [Timesheet Upload] Low confidence (${confidenceScore}%) - Simple confirmation`);

        confirmationMessage = `✅ *Timesheet Received!*\n\n` +
            `Hi ${staff.first_name},\n\n` +
            `Thank you! Your timesheet for ${shift.clients?.name || 'your shift'} (${shift.date}) has been received.\n\n` +
            `We'll process it and notify you once it's approved.\n\n` +
            `_Thank you!_ 🎉`;
    }

    await sendWhatsAppResponse(supabase, phone, confirmationMessage);

    return {
        success: true,
        timesheet_id: timesheet.id,
        shift_id: shift.id,
        hours_worked: hoursWorked,
        is_update: isUpdate,
        requires_review: extractedData.requires_manual_review || false
    };
}

