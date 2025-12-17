import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { shouldSendNotification } from "../_shared/preferenceChecker.ts";
import {
    logNotificationSent,
    logNotificationFailed,
    logNotificationSkipped
} from "../_shared/notificationLogger.ts";
import { scheduleRetry } from "../_shared/retryHandler.ts";
import { getBranding } from "../_shared/getBranding.ts";

/**
 * 📬 SEND PROFILE REMINDERS
 *
 * Automated email reminder system for incomplete staff profiles
 *
 * Features:
 * - Calls get-incomplete-profiles to find staff with incomplete profiles
 * - Sends personalized emails with detailed missing items list
 * - Prevents spam: Won't send if reminder sent within last 7 days
 * - Professional HTML email templates
 * - Updates last_reminder_sent timestamp
 *
 * Trigger methods:
 * - Manual: POST request with service role key
 * - Automated: pg_cron (weekly schedule)
 * - On-demand: Admin dashboard button
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Authentication check - Service role only for automation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const isServiceRole = token === SERVICE_ROLE_KEY;

    if (!isServiceRole) {
      return new Response(JSON.stringify({ error: 'Service role required' }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log('📬 Starting profile reminder job...');

    // Get request parameters
    const body = await req.json().catch(() => ({}));
    const {
      test_mode = false,
      test_email = null,
      days_since_last_reminder = 7,
      dry_run = false
    } = body;

    if (test_mode) {
      console.log('🧪 TEST MODE: Will only process test_email if provided');
    }

    if (dry_run) {
      console.log('🔍 DRY RUN: Will not send emails or update database');
    }

    // Step 1: Get incomplete profiles
    console.log('📊 Fetching incomplete profiles...');

    const incompleteResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/get-incomplete-profiles`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!incompleteResponse.ok) {
      throw new Error('Failed to fetch incomplete profiles');
    }

    const { data: incompleteProfiles } = await incompleteResponse.json();

    console.log(`✅ Found ${incompleteProfiles.length} incomplete profiles`);

    if (incompleteProfiles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No incomplete profiles found. All staff are 100% complete! 🎉',
          sent: 0,
          skipped: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Filter profiles based on last reminder date
    const now = new Date();
    const minDaysBetweenReminders = days_since_last_reminder;

    let eligibleProfiles = incompleteProfiles.filter((profile: any) => {
      // In test mode, only process test_email
      if (test_mode && test_email) {
        return profile.email === test_email;
      }

      // Check if we've sent a reminder recently
      if (profile.last_reminder_sent) {
        const lastSent = new Date(profile.last_reminder_sent);
        const daysSince = Math.floor((now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSince < minDaysBetweenReminders) {
          console.log(`⏭️  Skipping ${profile.name} - last reminded ${daysSince} days ago`);
          return false;
        }
      }

      return true;
    });

    console.log(`✉️  Eligible for reminder: ${eligibleProfiles.length} staff`);

    if (eligibleProfiles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No staff eligible for reminders (all reminded recently)',
          sent: 0,
          skipped: incompleteProfiles.length
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Send emails
    const results = {
      sent: 0,
      failed: 0,
      skipped: 0,
      details: [] as any[]
    };

    for (const profile of eligibleProfiles) {
      try {
        if (!profile.email) {
          console.log(`⚠️  Skipping ${profile.name} - no email address`);
          results.skipped++;
          continue;
        }

        // Check preference
        const preferenceCheck = await shouldSendNotification(
            supabase,
            profile.email,
            'system_update', // Mapped as per instructions
            'email',
            'staff'
        );

        if (!preferenceCheck.allowed) {
            console.log(`⏭️ [Profile Reminder] Skipped for ${profile.email} - ${preferenceCheck.reason}`);
            await logNotificationSkipped(supabase, {
                recipientEmail: profile.email,
                recipientType: 'staff',
                staffId: profile.staff_id,
                agencyId: profile.agency_id,
                notificationType: 'system_update',
                channel: 'email',
                preferenceChecked: preferenceCheck.preferenceChecked,
                preferenceStatus: preferenceCheck.preferenceStatus,
                skippedReason: preferenceCheck.reason,
                metadata: { completion_percentage: profile.completion_percentage }
            });
            results.skipped++;
            continue;
        }

        console.log(`📧 Sending reminder to ${profile.name} (${profile.email}) - ${profile.completion_percentage}% complete`);

        // Get dynamic branding for this agency
        const branding = await getBranding(supabase, profile.agency_id);

        // Generate missing items HTML list
        const missingItemsHtml = profile.missing_items
          .map((item: string) => `<li style="margin-bottom: 8px;">${item}</li>`)
          .join('');

        // Professional HTML email template
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #06b6d4 0%, #2563eb 100%); padding: 30px 20px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 24px;">📋 Profile Update Required</h1>
    </div>

    <!-- Body -->
    <div style="padding: 30px 20px;">
      <p style="font-size: 16px; color: #333333; margin-bottom: 20px;">
        Hi <strong>${profile.first_name}</strong>,
      </p>

      <p style="font-size: 16px; color: #333333; margin-bottom: 20px;">
        Your ${branding.saasName} profile is currently <strong>${profile.completion_percentage}% complete</strong>.
      </p>

      <!-- Progress Bar -->
      <div style="background-color: #e5e7eb; border-radius: 8px; height: 24px; margin-bottom: 30px; overflow: hidden;">
        <div style="background: linear-gradient(90deg, #06b6d4 0%, #2563eb 100%); height: 100%; width: ${profile.completion_percentage}%; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">
          ${profile.completion_percentage}%
        </div>
      </div>

      <!-- Missing Items -->
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 4px; margin-bottom: 30px;">
        <h3 style="margin: 0 0 15px 0; color: #991b1b; font-size: 18px;">⚠️ Missing Information</h3>
        <ul style="margin: 0; padding-left: 20px; color: #7f1d1d; line-height: 1.8;">
          ${missingItemsHtml}
        </ul>
      </div>

      <!-- Important Notice -->
      <div style="background-color: #fff7ed; border: 2px solid #f97316; padding: 15px; border-radius: 8px; margin-bottom: 30px;">
        <p style="margin: 0; color: #9a3412; font-size: 14px; font-weight: bold;">
          🚨 <strong>Important:</strong> You cannot accept shifts until your profile is 100% complete. Care homes require full compliance before staff can work.
        </p>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${profile.profile_link}"
           style="display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          ✅ Complete My Profile Now
        </a>
      </div>

      <p style="font-size: 14px; color: #666666; margin-bottom: 10px;">
        If you need help completing your profile, please reply to this email or contact your agency administrator.
      </p>

      <p style="font-size: 14px; color: #666666; margin: 0;">
        Best regards,<br>
        <strong>${profile.agency_name}</strong><br>
        ${branding.saasName} Team
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
        This is an automated reminder from ${branding.saasName}<br>
        Powered by ${branding.companyName}
      </p>
    </div>

  </div>
</body>
</html>
`;

        if (dry_run) {
          console.log(`🔍 DRY RUN: Would send email to ${profile.email}`);
          results.sent++;
          continue;
        }

        // Send email via existing send-email function
        const emailResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              to: profile.email,
              subject: `📋 Profile Update Required - ${profile.completion_percentage}% Complete`,
              html: emailHtml,
              from_name: profile.agency_name || branding.saasName
            })
          }
        );

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json().catch(() => ({}));
          throw new Error(`Email send failed: ${JSON.stringify(errorData)}`);
        }

        const emailResult = await emailResponse.json();
        console.log(`✅ Email sent to ${profile.name}: ${emailResult.messageId}`);

        // Update last_reminder_sent in database
        const { error: updateError } = await supabase
          .from('staff')
          .update({ last_reminder_sent: new Date().toISOString() })
          .eq('id', profile.staff_id);

        if (updateError) {
          console.error(`⚠️  Failed to update last_reminder_sent for ${profile.name}:`, updateError);
        }

        // Log success
        await logNotificationSent(supabase, {
            recipientEmail: profile.email,
            recipientType: 'staff',
            staffId: profile.staff_id,
            agencyId: profile.agency_id,
            notificationType: 'system_update',
            channel: 'email',
            provider: 'resend',
            providerMessageId: emailResult?.messageId,
            preferenceChecked: preferenceCheck.preferenceChecked,
            preferenceStatus: preferenceCheck.preferenceStatus,
            metadata: { completion_percentage: profile.completion_percentage }
        });

        results.sent++;
        results.details.push({
          staff_id: profile.staff_id,
          name: profile.name,
          email: profile.email,
          completion: profile.completion_percentage,
          status: 'sent',
          message_id: emailResult.messageId
        });

      } catch (error) {
        console.error(`❌ Failed to send reminder to ${profile.name}:`, error);
        
        // Log failure
        await logNotificationFailed(supabase, {
            recipientEmail: profile.email,
            recipientType: 'staff',
            staffId: profile.staff_id,
            agencyId: profile.agency_id,
            notificationType: 'system_update',
            channel: 'email',
            errorMessage: (error as Error).message,
            errorCode: 'send_failed'
        });

        // Schedule retry
        await scheduleRetry(supabase, {
            notificationType: 'system_update',
            recipientEmail: profile.email,
            recipientId: profile.staff_id,
            agencyId: profile.agency_id,
            channel: 'email',
            metadata: { staffId: profile.staff_id }
        });

        results.failed++;
        results.details.push({
          staff_id: profile.staff_id,
          name: profile.name,
          email: profile.email,
          status: 'failed',
          error: (error as Error).message
        });
      }
    }

    console.log(`✅ Reminder job completed: ${results.sent} sent, ${results.failed} failed, ${results.skipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        summary: {
          total_incomplete: incompleteProfiles.length,
          eligible: eligibleProfiles.length,
          sent: results.sent,
          failed: results.failed,
          skipped: results.skipped
        },
        details: results.details,
        test_mode,
        dry_run
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error('❌ Error in send-profile-reminders:', error);
    const err = error as Error;
    return new Response(
      JSON.stringify({
        error: err.message,
        stack: err.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
