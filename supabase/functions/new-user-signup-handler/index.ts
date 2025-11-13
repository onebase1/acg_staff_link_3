import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * SECURITY: New User Signup Handler
 *
 * Triggered when a new user signs up via base44 auth.
 * Creates an AdminWorkflow ONLY for the matched agency (not all agencies).
 *
 * This prevents unauthorized access to agency data.
 */

serve(async (req) => {
    try {
        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // This function is called by base44 platform after successful user registration
        const { user_id, email, full_name } = await req.json();

        if (!user_id || !email) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Missing required fields: user_id, email'
                }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // Check if user email matches existing Staff or Client records
        const { data: staffMatches, error: staffError } = await supabase
            .from("staff")
            .select("*")
            .eq("email", email.toLowerCase());

        const { data: agencies, error: agenciesError } = await supabase
            .from("agencies")
            .select("*");

        if (staffError || agenciesError) {
            throw staffError || agenciesError;
        }

        let recommendedAgency = null;
        let recommendedRole = 'staff_member';
        let linkedEntity = null;

        // Try to match by email
        if (staffMatches && staffMatches.length > 0) {
            const staff = staffMatches[0];
            recommendedAgency = agencies.find(a => a.id === staff.agency_id);
            recommendedRole = 'staff_member';
            linkedEntity = { type: 'staff', id: staff.id, name: `${staff.first_name} ${staff.last_name}` };

            console.log('✅ [newUserSignupHandler] Matched staff:', staff.first_name, staff.last_name, 'Agency:', recommendedAgency?.name);
        } else {
            // Check if email domain matches any agency
            const emailDomain = email.split('@')[1];
            for (const agency of agencies) {
                if (agency.contact_email && agency.contact_email.split('@')[1] === emailDomain) {
                    recommendedAgency = agency;
                    recommendedRole = 'agency_admin';
                    break;
                }
            }
        }

        // ✅ FIX: Create AdminWorkflow ONLY for matched agency (or none if no match)
        if (recommendedAgency) {
            await supabase
                .from("admin_workflows")
                .insert({
                    agency_id: recommendedAgency.id,
                    type: 'other',
                    priority: 'medium',
                    status: 'pending',
                    title: `New User Signup: ${full_name || email}`,
                    description: `
**New User Registration**

**Email:** ${email}
**Name:** ${full_name || 'Not provided'}
**Registered:** ${new Date().toISOString()}

${linkedEntity ? `**🔗 MATCHED:** ${linkedEntity.type} - ${linkedEntity.name}` : '**⚠️ NO MATCH:** No existing staff or client record found'}

**Recommended Agency:** ${recommendedAgency.name}
**Recommended Role:** ${recommendedRole}

**Next Steps:**
1. User will complete their profile automatically
2. System will notify you when onboarding is complete
3. Review their compliance documents
4. Approve their account for shift access

**User Profile:** [View in ProfileSetup page]
                `.trim(),
                    related_entity: {
                        entity_type: 'staff',
                        entity_id: user_id
                    },
                    auto_created: true
                });

            console.log('✅ [newUserSignupHandler] Created workflow for:', recommendedAgency.name);
        } else {
            console.warn('⚠️ [newUserSignupHandler] No agency match found for:', email);
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: recommendedAgency ? 'AdminWorkflow created for matched agency' : 'No agency match - user can select agency manually',
                recommended_agency: recommendedAgency?.name,
                recommended_role: recommendedRole,
                linked_entity: linkedEntity
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error('❌ newUserSignupHandler error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
