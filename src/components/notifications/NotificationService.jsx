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
  async sendEmail({ to, subject, html, from_name = 'ACG StaffLink' }) {
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

        console.log('✅ [Queue] Created new queue entry');
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
    const instantMessage = `📅 NEW SHIFT [${agencyName}]: ${client.name}${locationText} on ${new Date(shift.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, ${startTime}-${endTime}. £${shift.pay_rate}/hr = £${((shift.pay_rate || 0) * (shift.duration_hours || 0)).toFixed(2)}. Reply to confirm.`;

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
      notes: shift.notes
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

      const html = EmailTemplates.baseWrapper({
        agencyName,
        agencyLogo: agency?.logo_url,
        children: `
          ${EmailTemplates.header({
            title: '📅 New Shift Assignment',
            subtitle: 'You have been assigned to a new shift',
            bgColor: '#06b6d4',
            agencyLogo: agency?.logo_url
          })}
          ${EmailTemplates.content({
            greeting: `Dear ${staff.first_name},`,
            body: `
              <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0 0 20px 0;">
                We're pleased to inform you that you have been assigned to a new shift. 
                Please review the details below and confirm your availability.
              </p>
              
              ${EmailTemplates.infoCard({
                title: 'Shift Details',
                items,
                borderColor: '#06b6d4'
              })}

              ${shift.notes ? `
                <p style="font-size: 14px; color: #6b7280; margin: 20px 0 0 0; font-style: italic;">
                  <strong>Additional Notes:</strong> ${shift.notes}
                </p>
              ` : ''}

              <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 25px 0 0 0;">
                Please confirm your availability as soon as possible through your portal or by contacting our office.
              </p>
            `
          })}
        `
      });

      results.email = await this.sendEmail({
        to: staff.email,
        subject: `New Shift Assignment - ${client.name}`,
        html,
        from_name: agencyName
      });
    }

    console.log(`📊 [Multi-channel] Results: Email=${results.email.success}, SMS=${results.sms.success}, WhatsApp=${results.whatsapp.success}`);
    return results;
  },

  /**
   * 📢 URGENT: Broadcast shift to eligible staff via SMS + WhatsApp
   * ✅ ALREADY MULTI-CHANNEL
   */
  async notifyUrgentShift({ staff, shift, client, agency }) {
    console.log(`📢 [NotificationService] Broadcasting urgent shift to ${staff.email}`);
    
    const agencyName = agency?.name || 'Your Agency';
    const locationLine = shift.work_location_within_site 
      ? ` at ${shift.work_location_within_site}` 
      : '';
    
    const message = `🚨 URGENT SHIFT [${agencyName}]: ${client.name}${locationLine} needs ${shift.role_required.replace('_', ' ')} on ${new Date(shift.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, ${shift.start_time}-${shift.end_time}. £${shift.pay_rate}/hr. Reply YES to accept.`;

    const results = {
      sms: { success: false },
      whatsapp: { success: false }
    };

    if (staff.phone) {
      const [smsResult, whatsappResult] = await Promise.allSettled([
        this.sendSMS({ to: staff.phone, message }),
        this.sendWhatsApp({ to: staff.phone, message })
      ]);

      results.sms = smsResult.status === 'fulfilled' ? smsResult.value : { success: false };
      results.whatsapp = whatsappResult.status === 'fulfilled' ? whatsappResult.value : { success: false };
    }

    return {
      success: results.sms.success || results.whatsapp.success,
      sms: results.sms,
      whatsapp: results.whatsapp
    };
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
              message: `Please upload your renewed ${document.document_name} to your portal immediately to avoid work interruption.${
                days_until_expiry <= 7 ? ' You will be unable to accept new shifts if this document expires.' : ''
              }`
            })}
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
                • Contact us immediately if you're running late or cannot attend
              `
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
              message: 'If you cannot attend this shift, please contact us immediately. Last-minute cancellations affect client care.'
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
   * FROM: ACG StaffLink (admin email, not agency)
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
      agencyName: 'ACG StaffLink',
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
      from_name: 'ACG StaffLink'
    });
  }
};

export default NotificationService;