import { supabase } from "@/lib/supabase";
import EmailTemplates from "./EmailTemplates";
import { sendSMS as invokeSendSMS, sendWhatsApp as invokeSendWhatsApp } from "@/api/functions";

/**
 * 📧 CENTRALIZED NOTIFICATION SERVICE - MULTI-CHANNEL
 * 
 * ✅ Smart batching for emails (5-minute queue)
 * ✅ SMS + WhatsApp for ALL agency notifications
 * ✅ Parallel delivery (both channels run together)
 * 
 * CHANNELS:
 * - Email: Professional templates, batched
 * - SMS: Instant, concise messages
 * - WhatsApp: Instant, rich formatting
 */

export const NotificationService = {
  /**
   * ✅ FIXED: Send email notification using Supabase Edge Function
   */
  async sendEmail({ to, subject, html, from_name = 'Agile Care Management' }) {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to,
          subject,
          html,
          from_name
        }
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('❌ Email send failed:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * 🆕 QUEUE notification for batching (recommended for bulk operations)
   */
  async queueNotification({
    recipient_email,
    recipient_type,
    notification_type,
    item,
    agency_id,
    recipient_first_name
  }) {
    try {
      console.log(`📥 [Queue] Adding to queue: ${notification_type} for ${recipient_email}`);

      const { data: existingQueues, error: queueError } = await supabase
        .from('notification_queue')
        .select('*')
        .eq('recipient_email', recipient_email)
        .eq('notification_type', notification_type)
        .eq('status', 'pending')
        .order('created_date', { ascending: true })
        .limit(1);

      if (queueError) {
        console.error('❌ [Queue] Error checking existing queues:', queueError);
        throw queueError;
      }

      const queue = existingQueues?.[0];

      if (queue) {
        const updatedItems = [...(queue.pending_items || []), item];

        const { error: updateError } = await supabase
          .from('notification_queue')
          .update({
            pending_items: updatedItems,
            item_count: updatedItems.length
          })
          .eq('id', queue.id);

        if (updateError) {
          console.error('❌ [Queue] Error updating queue:', updateError);
          throw updateError;
        }

        console.log(`✅ [Queue] Added to existing queue ${queue.id} (now ${updatedItems.length} items)`);
      } else {
        // ✅ FIX: Include all required fields and use correct column names
        const queueData = {
          agency_id,
          recipient_email,
          recipient_type,  // ✅ FIX: Added missing NOT NULL field
          recipient_first_name,
          notification_type,
          pending_items: [item],
          item_count: 1,
          status: 'pending',
          scheduled_send_at: new Date().toISOString(),  // ✅ FIX: Changed from next_send_at
          message: `${notification_type} notification`  // ✅ FIX: Added required message field
        };

        console.log('📝 [Queue] Inserting new queue entry:', queueData);

        const { error: insertError } = await supabase
          .from('notification_queue')
          .insert(queueData);

        if (insertError) {
          console.error('❌ [Queue] Error inserting queue:', insertError);
          throw insertError;
        }

        console.log(`✅ [Queue] Created new queue entry. Scheduled for immediate pickup by next digest cycle (within 5 mins). Time: ${queueData.scheduled_send_at}`);
      }

      return { success: true, queued: true };
    } catch (error) {
      console.error('❌ [Queue] Failed to queue notification:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Send SMS notification
   */
  async sendSMS({ to, message }) {
    try {
      const { data } = await invokeSendSMS({ to, message });
      return { success: true, data };
    } catch (error) {
      console.error('❌ [SMS] Failed to send SMS:', error);
      return { success: false, error };
    }
  },

  /**
   * Send WhatsApp notification
   */
  async sendWhatsApp({ to, message }) {
    console.log(`📱 [WhatsApp] Attempting to send to ${to}`);
    console.log(`📱 [WhatsApp] Message: ${message.substring(0, 100)}...`);

    try {
      console.log('📱 [WhatsApp] Calling invokeSendWhatsApp...');
      const { data, error } = await invokeSendWhatsApp({ to, message });

      if (error) {
        console.error('❌ [WhatsApp] Edge Function returned error:', error);
        return { success: false, error };
      }

      console.log('✅ [WhatsApp] Message sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ [WhatsApp] Exception caught:', error);
      console.error('❌ [WhatsApp] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return { success: false, error };
    }
  },

  /**
   * 📅 STAFF: Shift assignment notification
   * ✅ MULTI-CHANNEL: Email (batched) + SMS + WhatsApp (instant)
   */
  async notifyShiftAssignment({ staff, shift, client, agency, useBatching = false }) {
    console.log(`📧 [NotificationService] Shift assignment to ${staff.email} - Multi-channel`);
    console.log(`📧 [NotificationService] Staff phone: ${staff.phone}`);
    console.log(`📧 [NotificationService] useBatching: ${useBatching}`);

    const agencyName = agency?.name || 'Your Agency';
    const locationText = shift.work_location_within_site ? ` at ${shift.work_location_within_site}` : '';

    // ✅ Format shift times properly (extract HH:MM from timestamp)
    const formatTime = (timestamp) => {
      if (!timestamp) return 'TBC';
      // Handle both ISO string and timestamp formats
      const timeStr = timestamp.toString();
      if (timeStr.includes('T')) {
        return timeStr.split('T')[1].substring(0, 5); // "2025-11-18T08:00:00+00" → "08:00"
      }
      return timeStr.substring(11, 16); // "2025-11-18 08:00:00+00" → "08:00"
    };

    const startTime = formatTime(shift.start_time);
    const endTime = formatTime(shift.end_time);

    // ✅ SMS + WhatsApp (INSTANT)
    const instantMessage = `📅 NEW SHIFT [${agencyName}]: ${client.name}${locationText} on ${new Date(shift.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, ${startTime}-${endTime}. £${shift.pay_rate}/hr = £${((shift.pay_rate || 0) * (shift.duration_hours || 0)).toFixed(2)}. Confirm in Staff Portal.`;

    const results = {
      email: { success: false },
      sms: { success: false },
      whatsapp: { success: false }
    };

    // Send SMS + WhatsApp in parallel
    if (staff.phone) {
      console.log(`📱 [NotificationService] Staff has phone, sending SMS + WhatsApp...`);

      const [smsResult, whatsappResult] = await Promise.allSettled([
        this.sendSMS({ to: staff.phone, message: instantMessage }),
        this.sendWhatsApp({ to: staff.phone, message: instantMessage })
      ]);

      console.log(`📱 [NotificationService] SMS result:`, smsResult);
      console.log(`📱 [NotificationService] WhatsApp result:`, whatsappResult);

      results.sms = smsResult.status === 'fulfilled' ? smsResult.value : { success: false, error: smsResult.reason };
      results.whatsapp = whatsappResult.status === 'fulfilled' ? whatsappResult.value : { success: false, error: whatsappResult.reason };
    } else {
      console.warn(`⚠️ [NotificationService] Staff has no phone number, skipping SMS/WhatsApp`);
    }

    // Email (batched or immediate)
    const item = {
      shift_id: shift.id,
      client_name: client.name,
      location: shift.work_location_within_site,
      date: shift.date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      duration_hours: shift.duration_hours,
      role: shift.role_required.replace('_', ' '),
      pay_rate: shift.pay_rate,
      notes: shift.notes,
      status: shift.status // ✅ Added status for template logic
    };

    if (useBatching) {
      results.email = await this.queueNotification({
        recipient_email: staff.email,
        recipient_type: 'staff',
        recipient_first_name: staff.first_name,
        notification_type: 'shift_assignment',
        item,
        agency_id: shift.agency_id
      });
    } else {
      const items = [
        { label: 'Client:', value: client.name },
        ...(shift.work_location_within_site ? [{ label: 'Location:', value: `📍 ${shift.work_location_within_site}` }] : []),
        { label: 'Date:', value: shift.date },
        { label: 'Time:', value: `${shift.start_time} - ${shift.end_time} (${shift.duration_hours}h)` },
        { label: 'Role:', value: shift.role_required.replace('_', ' ') },
        { label: 'Pay Rate:', value: `£${shift.pay_rate}/hour` }
      ];

      const portalUrl = `${window.location.origin}/staffportal?highlight=${shift.id}`;
      const isConfirmed = shift.status === 'confirmed';

      const html = EmailTemplates.baseWrapper({
        agencyName,
        agencyLogo: agency?.logo_url,
        children: `
          ${EmailTemplates.header({
            title: isConfirmed ? '✅ Shift Confirmed' : '📅 New Shift Assignment',
            subtitle: isConfirmed ? 'You have been assigned and confirmed' : 'You have been assigned to a new shift',
            bgColor: isConfirmed ? '#10b981' : '#0284c7',
            agencyLogo: agency?.logo_url
          })}
          ${EmailTemplates.content({
            greeting: `Dear ${staff.first_name},`,
            body: `
              <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0 0 20px 0;">
                ${isConfirmed
                  ? `You have been assigned and confirmed for the following shift. Please ensure you arrive on time and are ready to work.`
                  : `We're pleased to inform you that you have been assigned to a new shift. Please review the details below and confirm your availability through your Staff Portal.`
                }
              </p>

              ${EmailTemplates.infoCard({
                title: 'Shift Details',
                items,
                borderColor: isConfirmed ? '#10b981' : '#06b6d4'
              })}

              ${shift.notes ? `
                <p style="font-size: 14px; color: #6b7280; margin: 20px 0 0 0; font-style: italic;">
                  <strong>Additional Notes:</strong> ${shift.notes}
                </p>
              ` : ''}

              ${!isConfirmed ? EmailTemplates.alertBox({
                type: 'info',
                title: '📋 Action Required',
                message: 'Please confirm your availability as soon as possible by visiting your Staff Portal. You can view full shift details and confirm or decline the assignment there.'
              }) : ''}

              ${EmailTemplates.button({
                text: isConfirmed ? 'View Shift in Staff Portal' : 'View & Confirm in Staff Portal',
                url: portalUrl,
                bgColor: isConfirmed ? '#10b981' : '#06b6d4'
              })}

              <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 25px 0 0 0;">
                If you have any questions or need assistance, please contact our office directly.
              </p>
            `
          })}
        `
      });

      results.email = await this.sendEmail({
        to: staff.email,
        subject: isConfirmed ? `Shift Confirmed - ${client.name}` : `New Shift Assignment - ${client.name}`,
        html,
        from_name: agencyName
      });
    }

    console.log(`📊 [Multi-channel] Results: Email=${results.email.success}, SMS=${results.sms.success}, WhatsApp=${results.whatsapp.success}`);
    return results;
  },

  /**
   * 📢 URGENT: Broadcast shift to eligible staff via SMS (Twilio)
   * ✅ SINGLE CHANNEL - SMS ONLY
   */
  async notifyUrgentShift({ staff, shift, client, agency }) {
    console.log(`📢 [NotificationService] Broadcasting urgent shift via SMS to ${staff.email}`);

    const agencyName = agency?.name || 'Your Agency';
    const locationLine = shift.work_location_within_site
      ? ` at ${shift.work_location_within_site}`
      : '';

    const message = `🚨 URGENT SHIFT [${agencyName}]: ${client.name}${locationLine} needs ${shift.role_required.replace('_', ' ')} on ${new Date(shift.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, ${shift.start_time}-${shift.end_time}. £${shift.pay_rate}/hr. Reply YES to accept.`;

    if (!staff.phone) {
      return { success: false, error: 'No phone number' };
    }

    const result = await this.sendSMS({ to: staff.phone, message });
    return result;
  },

  /**
   * 📧 URGENT: Broadcast shift via Email (Resend)
   * ✅ NEW - EMAIL WITH PORTAL LINK
   */
  async notifyUrgentShiftEmail({ staff, shift, client, agency }) {
    console.log(`📧 [NotificationService] Broadcasting urgent shift via Email to ${staff.email}`);

    const agencyName = agency?.name || 'Your Agency';
    const portalUrl = `${window.location.origin}/staff-portal?highlight=${shift.id}`;

    const items = [
      { label: 'Client:', value: client.name },
      { label: 'Role:', value: shift.role_required.replace('_', ' ') },
      { label: 'Date:', value: new Date(shift.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
      { label: 'Time:', value: `${shift.start_time} - ${shift.end_time}` },
      { label: 'Pay Rate:', value: `£${shift.pay_rate}/hour` },
      ...(shift.work_location_within_site ? [{ label: 'Location:', value: shift.work_location_within_site }] : [])
    ];

    const html = EmailTemplates.baseWrapper({
      agencyName,
      agencyLogo: agency?.logo_url,
      children: `
        ${EmailTemplates.header({
        title: '🚨 URGENT SHIFT AVAILABLE',
        subtitle: 'First Come, First Served',
        bgColor: '#dc2626',
        agencyLogo: agency?.logo_url
      })}
        ${EmailTemplates.content({
        greeting: `Hi ${staff.first_name},`,
        body: `
            <p style="font-size: 18px; color: #dc2626; font-weight: 600; margin: 0 0 20px 0;">
              An urgent shift matching your role is now available!
            </p>

            ${EmailTemplates.infoCard({
          title: 'Shift Details',
          items,
          borderColor: '#dc2626'
        })}

            ${EmailTemplates.alertBox({
          type: 'warning',
          title: '⚡ Act Fast!',
          message: 'This shift is available on a first-come, first-served basis. Click below to view and accept in the Staff Portal.'
        })}

            ${EmailTemplates.button({
          text: '🚀 View & Accept Shift',
          url: portalUrl,
          bgColor: '#dc2626'
        })}

            <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 25px 0 0 0;">
              <strong>Important:</strong> This shift may be filled quickly. If you're interested, please click the button above immediately to secure it.
            </p>
          `
      })}
      `
    });

    return await this.sendEmail({
      to: staff.email,
      subject: `🚨 URGENT: ${shift.role_required.replace('_', ' ')} Shift Available - ${client.name}`,
      html,
      from_name: agencyName
    });
  },

  /**
   * 💬 URGENT: Broadcast shift via WhatsApp (Meta/n8n)
   * ✅ NEW - WHATSAPP VIA N8N WEBHOOK
   */
  async notifyUrgentShiftWhatsApp({ staff, shift, client, agency }) {
    console.log(`💬 [NotificationService] Broadcasting urgent shift via WhatsApp to ${staff.first_name}`);

    // Check staff opt-in
    if (!staff.whatsapp_opt_in) {
      console.log(`⚠️ [WhatsApp] ${staff.first_name} has not opted in to WhatsApp`);
      return { success: false, error: 'Staff has not opted in to WhatsApp' };
    }

    if (!staff.phone) {
      return { success: false, error: 'No phone number' };
    }

    try {
      // For now, use Twilio WhatsApp (can be replaced with n8n webhook later)
      const agencyName = agency?.name || 'Your Agency';
      const locationLine = shift.work_location_within_site
        ? ` at ${shift.work_location_within_site}`
        : '';

      const message = `🚨 URGENT SHIFT [${agencyName}]: ${client.name}${locationLine} needs ${shift.role_required.replace('_', ' ')} on ${new Date(shift.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, ${shift.start_time}-${shift.end_time}. £${shift.pay_rate}/hr. Reply YES to accept.`;

      const result = await this.sendWhatsApp({ to: staff.phone, message });
      return result;
    } catch (error) {
      console.error('❌ [WhatsApp] Send failed:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * ⏰ STAFF: Compliance document expiring soon
   * ✅ MULTI-CHANNEL: Email + SMS + WhatsApp
   */
  async notifyComplianceExpiry({ staff, document, days_until_expiry, agency }) {
    const agencyName = agency?.name || 'Your Agency';
    const urgencyLevel = days_until_expiry <= 7 ? '🚨 URGENT' : days_until_expiry <= 14 ? '⚠️ IMPORTANT' : '📋 REMINDER';
    const bgColor = days_until_expiry <= 7 ? '#dc2626' : '#f59e0b';

    // ✅ SMS + WhatsApp (INSTANT)
    const instantMessage = `${urgencyLevel} [${agencyName}]: Your ${document.document_name} expires in ${days_until_expiry} days (${document.expiry_date}). Please upload renewed certificate ASAP to continue working.`;

    const results = {
      email: { success: false },
      sms: { success: false },
      whatsapp: { success: false }
    };

    // Send SMS + WhatsApp
    if (staff.phone) {
      const [smsResult, whatsappResult] = await Promise.allSettled([
        this.sendSMS({ to: staff.phone, message: instantMessage }),
        this.sendWhatsApp({ to: staff.phone, message: instantMessage })
      ]);

      results.sms = smsResult.status === 'fulfilled' ? smsResult.value : { success: false };
      results.whatsapp = whatsappResult.status === 'fulfilled' ? whatsappResult.value : { success: false };
    }

    // Email
    const items = [
      { label: 'Agency:', value: agencyName },
      { label: 'Document:', value: document.document_name },
      { label: 'Expiry Date:', value: document.expiry_date },
      { label: 'Days Remaining:', value: `${days_until_expiry} days` },
      ...(document.reference_number ? [{ label: 'Reference:', value: document.reference_number }] : [])
    ];

    const html = EmailTemplates.baseWrapper({
      agencyName,
      agencyLogo: agency?.logo_url,
      children: `
        ${EmailTemplates.header({
        title: urgencyLevel,
        subtitle: 'Compliance Document Expiring',
        bgColor,
        agencyLogo: agency?.logo_url
      })}
        ${EmailTemplates.content({
        greeting: `Dear ${staff.first_name},`,
        body: `
            <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0 0 20px 0;">
              This is an important notice regarding your compliance documentation with <strong>${agencyName}</strong>.
            </p>

            <p style="font-size: 16px; color: #dc2626; line-height: 1.6; margin: 0 0 25px 0; font-weight: 600;">
              Your <strong>${document.document_name}</strong> will expire in <strong>${days_until_expiry} days</strong> (${document.expiry_date}).
            </p>

            ${EmailTemplates.infoCard({
          title: 'Document Information',
          items,
          borderColor: bgColor
        })}

            ${EmailTemplates.alertBox({
          type: 'error',
          title: '⚠️ ACTION REQUIRED',
          message: `Please upload your renewed ${document.document_name} to your portal immediately to avoid work interruption.${days_until_expiry <= 7 ? ' You will be unable to accept new shifts if this document expires.' : ''
            }`
        })}

            ${EmailTemplates.ctaButton({
          text: 'Update My Documents',
          url: 'https://agilecaremanagement.co.uk/staff-portal',
          bgColor: bgColor
        })}

            <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 25px 0; border-radius: 8px;">
              <p style="margin: 0 0 10px 0; color: #0c4a6e; font-size: 15px; font-weight: bold;">
                📞 Need Help?
              </p>
              <p style="margin: 0; color: #0c4a6e; font-size: 14px; line-height: 1.8;">
                Contact ${agencyName}:<br/>
                📧 <a href="mailto:${agency?.contact_email || 'support@agilecaremanagement.co.uk'}" style="color: #0284c7; text-decoration: none;">${agency?.contact_email || 'support@agilecaremanagement.co.uk'}</a><br/>
                📱 ${agency?.contact_phone || '+44 20 1234 5678'}
              </p>
            </div>
          `
      })}
      `
    });

    results.email = await this.sendEmail({
      to: staff.email,
      subject: `${urgencyLevel}: ${document.document_name} Expiring Soon (${agencyName})`,
      html,
      from_name: agencyName
    });

    return results;
  },

  /**
   * ✅ STAFF: Shift confirmed - with reminders
   * ✅ MULTI-CHANNEL: Email + SMS + WhatsApp
   */
  async notifyShiftConfirmedToStaff({ staff, shift, client, agency }) {
    const agencyName = agency?.name || 'Your Agency';
    const locationText = shift.work_location_within_site ? ` at ${shift.work_location_within_site}` : '';

    // ✅ SMS + WhatsApp (INSTANT)
    const instantMessage = `✅ SHIFT CONFIRMED [${agencyName}]: ${client.name}${locationText} on ${new Date(shift.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, ${shift.start_time}-${shift.end_time}. Arrive 10 mins early. See you there!`;

    const results = {
      email: { success: false },
      sms: { success: false },
      whatsapp: { success: false }
    };

    // Send SMS + WhatsApp
    if (staff.phone) {
      const [smsResult, whatsappResult] = await Promise.allSettled([
        this.sendSMS({ to: staff.phone, message: instantMessage }),
        this.sendWhatsApp({ to: staff.phone, message: instantMessage })
      ]);

      results.sms = smsResult.status === 'fulfilled' ? smsResult.value : { success: false };
      results.whatsapp = whatsappResult.status === 'fulfilled' ? whatsappResult.value : { success: false };
    }

    // Email
    const items = [
      { label: 'Client:', value: client.name },
      { label: 'Address:', value: `${client.address?.line1 || ''}, ${client.address?.city || ''}, ${client.address?.postcode || ''}` },
      ...(shift.work_location_within_site ? [{ label: 'Location:', value: `📍 ${shift.work_location_within_site}` }] : []),
      { label: 'Date:', value: shift.date },
      { label: 'Time:', value: `${shift.start_time} - ${shift.end_time}` }
    ];

    const html = EmailTemplates.baseWrapper({
      agencyName,
      agencyLogo: agency?.logo_url,
      children: `
        ${EmailTemplates.header({
        title: '✅ Shift Confirmed',
        subtitle: 'Your shift has been confirmed',
        bgColor: '#10b981',
        agencyLogo: agency?.logo_url
      })}
        ${EmailTemplates.content({
        greeting: `Dear ${staff.first_name},`,
        body: `
            <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0 0 25px 0;">
              Great news! Your shift has been confirmed. Please review the details below and ensure you arrive 10 minutes early.
            </p>
            
            ${EmailTemplates.infoCard({
          title: 'Shift Information',
          items,
          borderColor: '#10b981'
        })}

            ${EmailTemplates.alertBox({
          type: 'info',
          title: '📋 Important Reminders',
          message: `
                • Arrive 10 minutes before your shift start time<br>
                • Bring your ID badge and any required documentation<br>
                • Clock in via the app when you arrive<br>
                • Contact ${agencyName} immediately if you're running late or cannot attend:<br>
                &nbsp;&nbsp;📧 ${agency?.contact_email || 'support@agilecaremanagement.co.uk'}<br>
                &nbsp;&nbsp;📱 ${agency?.contact_phone || '+44 20 1234 5678'}
              `
        })}

            ${EmailTemplates.ctaButton({
          text: 'Go to Staff Portal',
          url: 'https://agilecaremanagement.co.uk/staff-portal',
          bgColor: '#10b981'
        })}
          `
      })}
      `
    });

    results.email = await this.sendEmail({
      to: staff.email,
      subject: `Shift Confirmed - ${client.name} on ${shift.date}`,
      html,
      from_name: agencyName
    });

    return results;
  },

  /**
   * 🔔 STAFF: Shift reminder (24h before)
   * ✅ MULTI-CHANNEL: Email + SMS + WhatsApp
   */
  async notifyShiftReminder24h({ staff, shift, client, agency }) {
    const agencyName = agency?.name || 'Your Agency';
    const locationText = shift.work_location_within_site ? ` (${shift.work_location_within_site})` : '';

    // ✅ SMS + WhatsApp (INSTANT)
    const instantMessage = `🔔 REMINDER [${agencyName}]: You have a shift TOMORROW at ${client.name}${locationText}, ${shift.start_time}-${shift.end_time}. Reply if you cannot attend.`;

    const results = {
      email: { success: false },
      sms: { success: false },
      whatsapp: { success: false }
    };

    // Send SMS + WhatsApp
    if (staff.phone) {
      const [smsResult, whatsappResult] = await Promise.allSettled([
        this.sendSMS({ to: staff.phone, message: instantMessage }),
        this.sendWhatsApp({ to: staff.phone, message: instantMessage })
      ]);

      results.sms = smsResult.status === 'fulfilled' ? smsResult.value : { success: false };
      results.whatsapp = whatsappResult.status === 'fulfilled' ? whatsappResult.value : { success: false };
    }

    // Email
    const items = [
      { label: 'Client:', value: client.name },
      { label: 'Address:', value: `${client.address?.line1 || ''}, ${client.address?.city || ''}, ${client.address?.postcode || ''}` },
      ...(shift.work_location_within_site ? [{ label: 'Location:', value: `📍 ${shift.work_location_within_site}` }] : []),
      { label: 'Date:', value: shift.date },
      { label: 'Time:', value: `${shift.start_time} - ${shift.end_time}` }
    ];

    const html = EmailTemplates.baseWrapper({
      agencyName,
      agencyLogo: agency?.logo_url,
      children: `
        ${EmailTemplates.header({
        title: '🔔 Shift Reminder',
        subtitle: 'Your shift is tomorrow',
        bgColor: '#f59e0b',
        agencyLogo: agency?.logo_url
      })}
        ${EmailTemplates.content({
        greeting: `Dear ${staff.first_name},`,
        body: `
            <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0 0 25px 0;">
              This is a reminder that you have a shift scheduled for <strong>tomorrow</strong>.
            </p>
            
            ${EmailTemplates.infoCard({
          title: 'Shift Details',
          items,
          borderColor: '#f59e0b'
        })}

            ${EmailTemplates.alertBox({
          type: 'warning',
          title: '⚠️ Important',
          message: `If you cannot attend this shift, please contact ${agencyName} immediately. Last-minute cancellations affect client care.<br><br>
                📧 ${agency?.contact_email || 'support@agilecaremanagement.co.uk'}<br>
                📱 ${agency?.contact_phone || '+44 20 1234 5678'}`
        })}

            ${EmailTemplates.ctaButton({
          text: 'View Shift Details',
          url: 'https://agilecaremanagement.co.uk/staff-portal',
          bgColor: '#f59e0b'
        })}
          `
      })}
      `
    });

    results.email = await this.sendEmail({
      to: staff.email,
      subject: `Shift Reminder - Tomorrow at ${client.name}`,
      html,
      from_name: agencyName
    });

    console.log(`🔔 [24h Reminder] Sent to ${staff.first_name}: Email=${results.email.success}, SMS=${results.sms.success}, WhatsApp=${results.whatsapp.success}`);
    return results;
  },

  /**
   * 🆕 BATCHED: Client notification for shift assignment
   * FROM: Agile Care Management (admin email, not agency)
   */
  async notifyShiftConfirmedToClient({ staff, shift, client, useBatching = true }) {
    const item = {
      shift_id: shift.id,
      staff_id: staff.id,
      staff_name: `${staff.first_name} ${staff.last_name}`,
      staff_phone: staff.phone,
      date: shift.date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      duration_hours: shift.duration_hours,
      location: shift.work_location_within_site,
      role: shift.role_required.replace('_', ' '),
      charge_rate: shift.charge_rate
    };

    if (useBatching) {
      const clientEmail = client.billing_email || client.contact_person?.email;
      if (!clientEmail) {
        return { success: false, error: 'Client email not found.' };
      }
      return await this.queueNotification({
        recipient_email: clientEmail,
        recipient_type: 'client',
        recipient_first_name: client.contact_person?.name || 'Team',
        notification_type: 'shift_confirmation',
        item,
        agency_id: shift.agency_id
      });
    }

    // Immediate send (fallback)
    const items = [
      { label: 'Staff Name:', value: `${staff.first_name} ${staff.last_name}` },
      { label: 'Role:', value: shift.role_required.replace('_', ' ') },
      { label: 'Contact:', value: staff.phone },
      ...(shift.work_location_within_site ? [{ label: 'Location:', value: `📍 ${shift.work_location_within_site}` }] : []),
      { label: 'Date:', value: shift.date },
      { label: 'Time:', value: `${shift.start_time} - ${shift.end_time}` },
      { label: 'Duration:', value: `${shift.duration_hours} hours` },
      { label: 'Charge Rate:', value: `£${shift.charge_rate}/hour` }
    ];

    const html = EmailTemplates.baseWrapper({
      agencyName: 'Agile Care Management',
      agencyLogo: null,
      children: `
        ${EmailTemplates.header({
        title: '✅ Shift Confirmed',
        subtitle: 'Staff Member Assigned',
        bgColor: '#06b6d4'
      })}
        ${EmailTemplates.content({
        greeting: `Dear ${client.contact_person?.name || 'Team'},`,
        body: `
            <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0 0 25px 0;">
              We're pleased to confirm that your shift request has been successfully filled.
            </p>
            
            ${EmailTemplates.infoCard({
          title: 'Assigned Staff Member',
          items,
          borderColor: '#06b6d4'
        })}

            <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 25px 0 0 0;">
              ${staff.first_name} will arrive at the scheduled time.
            </p>
          `
      })}
      `
    });

    const clientEmail = client.billing_email || client.contact_person?.email;
    if (!clientEmail) {
      return { success: false, error: 'Client email not found.' };
    }

    return await this.sendEmail({
      to: clientEmail,
      subject: `Shift Confirmed - ${staff.first_name} ${staff.last_name} assigned for ${shift.date}`,
      html,
      from_name: 'Agile Care Management'
    });
  },

  /**
   * ✅ NEW: Notify client/admin of shift creation receipt (Batched)
   * Sends a summary email of shifts created in a batch.
   */
  async notifyShiftReceipt({ client, agency, shifts = [], initiatorProfile, userType }) {
    console.log('📧 Queueing Shift Receipt Notification:', {
      client: client?.name,
      count: shifts.length,
      initiator: initiatorProfile?.email
    });

    if (!client || !agency || shifts.length === 0) return;

    // Only send receipt if user is Admin or Manager
    const recipientEmail = initiatorProfile?.email;
    if (!recipientEmail) return;

    // Queue each shift individually so the digest engine can render them as rows
    const promises = shifts.map(shift => {
      return this.queueNotification({
        recipient_email: recipientEmail,
        recipient_type: userType || 'agency_admin',
        recipient_first_name: initiatorProfile?.first_name || 'User',
        notification_type: 'shift_receipt',
        agency_id: agency.id,
        item: {
          client_name: client.name,
          date: shift.date,
          start_time: shift.start_time,
          end_time: shift.end_time,
          role: shift.role || shift.role_required, // Handle both formats
          location: shift.work_location_within_site || shift.location, // Handle both formats
          agency_name: agency.name,
          created_at: new Date().toISOString()
        }
      });
    });

    return Promise.all(promises);
  }
};

export default NotificationService;