import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { shouldSendNotification } from "../_shared/preferenceChecker.ts";
import {
    logNotificationSent,
    logNotificationSkipped
} from "../_shared/notificationLogger.ts";

/**
 * Edge Function: Post-Shift Rating Reminder
 * 
 * Trigger: Scheduled via pg_cron or external scheduler (e.g., n8n)
 * Frequency: Every hour
 * 
 * Purpose:
 * - Find completed shifts that ended 2+ hours ago
 * - Check if shift has been rated
 * - If not rated, create reminder notification for client
 * 
 * Flow:
 * 1. Query completed shifts from 2-24 hours ago
 * 2. Filter out already-rated shifts
 * 3. For each unrated shift, create notification
 * 4. Log results
 */

interface Shift {
  id: string;
  client_id: string;
  assigned_staff_id: string;
  date: string;
  start_time: string;
  end_time: string;
  role_required: string;
  rating_status: string;
  agency_id?: string; // Added optional
}

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
}

interface Client {
    id: string;
    contact_person: any;
    agency_id: string;
}

serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate time window (2-24 hours ago)
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    console.log('🔍 Checking for unrated shifts...');
    console.log('Time window:', twentyFourHoursAgo.toISOString(), 'to', twoHoursAgo.toISOString());

    // Query completed shifts that need rating reminders
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('id, client_id, assigned_staff_id, date, start_time, end_time, role_required, rating_status, agency_id')
      .eq('status', 'completed')
      .in('rating_status', ['awaiting_rating', 'not_required'])
      .gte('date', twentyFourHoursAgo.toISOString().split('T')[0])
      .lte('date', twoHoursAgo.toISOString().split('T')[0])
      .not('assigned_staff_id', 'is', null) // Must have assigned staff
      as { data: Shift[] | null, error: any };

    if (shiftsError) {
      throw new Error(`Failed to fetch shifts: ${shiftsError.message}`);
    }

    if (!shifts || shifts.length === 0) {
      console.log('✅ No shifts need rating reminders');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No unrated shifts found',
          processed: 0
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${shifts.length} potential shifts to process`);

    // Filter shifts that ended more than 2 hours ago
    const shiftsNeedingReminder = shifts.filter(shift => {
      const shiftDateTime = new Date(`${shift.date}T${shift.end_time}`);
      return shiftDateTime < twoHoursAgo && shift.rating_status === 'awaiting_rating';
    });

    console.log(`🎯 ${shiftsNeedingReminder.length} shifts need rating reminders`);

    if (shiftsNeedingReminder.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No shifts ready for reminders',
          processed: 0
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch staff details for notifications
    const staffIds = [...new Set(shiftsNeedingReminder.map(s => s.assigned_staff_id))];
    const { data: staffMembers, error: staffError } = await supabase
      .from('staff')
      .select('id, first_name, last_name')
      .in('id', staffIds) as { data: Staff[] | null, error: any };

    if (staffError) {
      throw new Error(`Failed to fetch staff: ${staffError.message}`);
    }

    const staffMap = new Map(staffMembers?.map(s => [s.id, s]) || []);

    // Fetch client details to get contact email for preference check
    const clientIds = [...new Set(shiftsNeedingReminder.map(s => s.client_id))];
    const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('id, contact_person, agency_id')
        .in('id', clientIds);
    
    if (clientError) throw clientError;
    const clientMap = new Map(clients?.map(c => [c.id, c]) || []);

    // Create notifications for each unrated shift
    const notificationsToCreate = [];
    const processedShifts = [];

    for (const shift of shiftsNeedingReminder) {
      const staff = staffMap.get(shift.assigned_staff_id);
      if (!staff) continue;

      const client = clientMap.get(shift.client_id);
      // We need an email to check preferences. 
      // Assuming client.contact_person has email.
      const clientEmail = client?.contact_person?.email;

      // Check if reminder already sent for this shift
      const { data: existingNotification } = await supabase
        .from('client_notifications')
        .select('id')
        .eq('related_entity_id', shift.id)
        .eq('related_entity_type', 'shift')
        .eq('type', 'rating_reminder')
        .single();

      if (existingNotification) {
        console.log(`⏭️ Reminder already sent for shift ${shift.id}`);
        continue;
      }

      // Check Preference
      if (clientEmail) {
          const pref = await shouldSendNotification(
              supabase,
              clientEmail,
              'rating_reminder',
              'in_app', // Channel
              'client'
          );

          if (!pref.allowed) {
              console.log(`⏭️ [Rating Reminder] Skipped for ${clientEmail} - ${pref.reason}`);
              await logNotificationSkipped(supabase, {
                  recipientEmail: clientEmail,
                  recipientType: 'client',
                  clientId: shift.client_id,
                  agencyId: shift.agency_id,
                  notificationType: 'rating_reminder',
                  channel: 'in_app',
                  preferenceChecked: pref.preferenceChecked,
                  preferenceStatus: pref.preferenceStatus,
                  skippedReason: pref.reason,
                  relatedEntityId: shift.id,
                  relatedEntityType: 'shift'
              });
              continue;
          }
      }

      notificationsToCreate.push({
        client_id: shift.client_id,
        contact_id: null, // Will notify all contacts for this client
        type: 'rating_reminder',
        title: `⭐ Rate ${staff.first_name} ${staff.last_name}`,
        message: `Your shift from ${shift.date} has been completed. Please take a moment to rate ${staff.first_name}'s performance. Your feedback helps us maintain high standards.`,
        related_entity_id: shift.id,
        related_entity_type: 'shift',
        priority: 'normal',
        channel: 'in_app',
      });

      processedShifts.push(shift.id);

      // Log "Sent" (Created)
      if (clientEmail) {
           await logNotificationSent(supabase, {
              recipientEmail: clientEmail,
              recipientType: 'client',
              clientId: shift.client_id,
              agencyId: shift.agency_id,
              notificationType: 'rating_reminder',
              channel: 'in_app',
              provider: 'n8n', // or 'supabase' - internal
              providerMessageId: `in_app_${shift.id}`, // Fake ID for in-app
              preferenceChecked: true,
              preferenceStatus: 'opted_in', // If we got here
              relatedEntityId: shift.id,
              relatedEntityType: 'shift'
          });
      }
    }

    // Bulk insert notifications
    if (notificationsToCreate.length > 0) {
      const { error: notificationError } = await supabase
        .from('client_notifications')
        .insert(notificationsToCreate);

      if (notificationError) {
        throw new Error(`Failed to create notifications: ${notificationError.message}`);
      }

      console.log(`✅ Created ${notificationsToCreate.length} rating reminders`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedShifts.length} shifts`,
        processed: processedShifts.length,
        reminders_created: notificationsToCreate.length,
        shift_ids: processedShifts,
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Connection': 'keep-alive'
        } 
      }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
});
