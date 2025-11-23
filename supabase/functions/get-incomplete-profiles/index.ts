import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * 📊 GET INCOMPLETE PROFILES
 *
 * Calculates profile completion for all active staff members
 * Returns only those with incomplete profiles (< 100%)
 * Includes detailed list of missing items for personalized reminders
 *
 * Can be called by:
 * - send-profile-reminders function (automated)
 * - Manual testing/debugging
 * - Admin dashboard for reporting
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

    // Authentication check
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
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    console.log('📊 Calculating profile completion for all active staff...');

    // Get all active staff members with their agencies
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select(`
        *,
        agencies (
          id,
          name
        )
      `)
      .eq('status', 'active');

    if (staffError) {
      console.error('❌ Error fetching staff:', staffError);
      throw staffError;
    }

    console.log(`✅ Found ${staff?.length || 0} active staff members`);

    // Get all compliance documents
    const { data: allCompliance, error: compError } = await supabase
      .from('compliance')
      .select('*');

    if (compError) {
      console.error('❌ Error fetching compliance:', compError);
      throw compError;
    }

    const incompleteProfiles = [];

    for (const member of staff || []) {
      // Get compliance docs for this staff member
      const memberCompliance = (allCompliance || []).filter(c => c.staff_id === member.id);

      // ✅ MATCHES ProfileSetup.jsx LOGIC (lines 458-495)
      let completed = 0;
      const total = 10;
      const missingItems: string[] = [];

      // 1. Profile Photo
      if (member.profile_photo_url) {
        completed++;
      } else {
        missingItems.push("📸 Professional profile photo");
      }

      // 2. References (need at least 2)
      const refs = member.references || [];
      if (refs.length >= 2) {
        completed++;
      } else if (refs.length === 0) {
        missingItems.push("📋 2 professional references");
      } else {
        missingItems.push(`📋 ${2 - refs.length} more reference(s)`);
      }

      // 3. Employment History
      const empHistory = member.employment_history || [];
      if (empHistory.length > 0) {
        completed++;
      } else {
        missingItems.push("💼 Employment history");
      }

      // 4. Occupational Health
      if (member.occupational_health?.cleared_to_work) {
        completed++;
      } else {
        missingItems.push("🏥 Occupational health clearance");
      }

      // 5. Date of Birth
      if (member.date_of_birth) {
        completed++;
      } else {
        missingItems.push("🎂 Date of birth");
      }

      // 6. Address (check postcode as key indicator)
      if (member.address?.postcode) {
        completed++;
      } else {
        missingItems.push("🏠 Complete address with postcode");
      }

      // 7. Emergency Contact
      if (member.emergency_contact?.phone) {
        completed++;
      } else {
        missingItems.push("📞 Emergency contact details");
      }

      // 8. DBS Check
      const dbsDoc = memberCompliance.find(c => c.document_type === 'dbs_check');
      if (dbsDoc) {
        completed++;
      } else {
        missingItems.push("🛡️ DBS Check document");
      }

      // 9. Right to Work
      const rtwDoc = memberCompliance.find(c => c.document_type === 'right_to_work');
      if (rtwDoc) {
        completed++;
      } else {
        missingItems.push("📄 Right to Work document");
      }

      // 10. Training Certificates (at least 10)
      const mandatoryTrainingValues = Object.values(member.mandatory_training || {});
      const validMandatoryTrainingCount = mandatoryTrainingValues.filter((t: any) => {
        if (!t?.completed_date) return false;
        if (!t.expiry_date) return true;
        return new Date(t.expiry_date) > new Date();
      }).length;

      const complianceTrainingCount = memberCompliance.filter(
        c => c.document_type === 'training_certificate'
      ).length;

      const trainingCount = validMandatoryTrainingCount > 0
        ? validMandatoryTrainingCount
        : complianceTrainingCount;

      if (trainingCount >= 10) {
        completed++;
      } else {
        const needed = 10 - trainingCount;
        missingItems.push(`📜 ${needed} more training certificate${needed > 1 ? 's' : ''}`);
      }

      const completionPercentage = Math.round((completed / total) * 100);

      // Only include if not 100% complete
      if (completionPercentage < 100) {
        const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://rzzxxkppkiasuouuglaf.supabase.co';

        incompleteProfiles.push({
          staff_id: member.id,
          first_name: member.first_name,
          last_name: member.last_name,
          name: `${member.first_name} ${member.last_name}`,
          email: member.email,
          phone: member.phone,
          agency_name: member.agencies?.name || 'Unknown Agency',
          completion_percentage: completionPercentage,
          completed_items: completed,
          total_items: total,
          missing_items: missingItems,
          profile_link: `${frontendUrl}/profilesetup`,
          last_reminder_sent: member.last_reminder_sent || null
        });
      }
    }

    console.log(`📊 Results: ${incompleteProfiles.length} staff with incomplete profiles`);

    // Sort by completion percentage (lowest first - most urgent)
    incompleteProfiles.sort((a, b) => a.completion_percentage - b.completion_percentage);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        total_staff: staff?.length || 0,
        incomplete_count: incompleteProfiles.length,
        complete_count: (staff?.length || 0) - incompleteProfiles.length,
        data: incompleteProfiles
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error('❌ Error in get-incomplete-profiles:', error);
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
