import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * TIER 2B-2: AI Shift Matcher
 *
 * Intelligently matches staff to shifts using Uber-style scoring algorithm
 * Factors: reliability (30pts), proximity (20pts), experience (20pts), freshness (15pts), rating (15pts)
 *
 * Returns: Top 5 staff ranked with explanations
 * Settings: automation_settings.ai_shift_matcher
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
        // Initialize Supabase client
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { shift_id, exclude_staff_ids = [], limit = 5 } = await req.json();

        if (!shift_id) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'shift_id required'
                }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`🤖 [AI Shift Matcher] Matching staff for shift ${shift_id}`);

        // Get shift details
        const { data: shifts, error: shiftError } = await supabase
            .from("shifts")
            .select("*")
            .eq("id", shift_id);

        if (shiftError) {
            throw shiftError;
        }

        if (!shifts || shifts.length === 0) {
            return new Response(
                JSON.stringify({ success: false, error: 'Shift not found' }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }
        const shift = shifts[0];

        // Check if feature enabled
        const { data: agencies, error: agencyError } = await supabase
            .from("agencies")
            .select("*")
            .eq("id", shift.agency_id);

        if (agencyError) {
            throw agencyError;
        }

        const agency = agencies[0];
        const isEnabled = agency?.settings?.automation_settings?.ai_shift_matcher !== false;

        if (!isEnabled) {
            console.log('⏭️  AI Shift Matcher disabled for this agency');
            return new Response(
                JSON.stringify({
                    success: true,
                    skipped: true,
                    reason: 'Feature disabled in settings',
                    matches: []
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get client location for proximity calculation
        const { data: clients, error: clientError } = await supabase
            .from("clients")
            .select("*")
            .eq("id", shift.client_id);

        if (clientError) {
            throw clientError;
        }

        const client = clients[0];

        // Get all active staff with matching role
        let staffQuery = supabase
            .from("staff")
            .select("*")
            .eq("agency_id", shift.agency_id)
            .eq("status", "active")
            .eq("role", shift.role_required);

        // Filter out excluded staff
        if (exclude_staff_ids && exclude_staff_ids.length > 0) {
            staffQuery = staffQuery.not("id", "in", `(${exclude_staff_ids.join(',')})`);
        }

        const { data: allStaff, error: staffError } = await staffQuery;

        if (staffError) {
            throw staffError;
        }

        if (!allStaff || allStaff.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    matches: [],
                    message: 'No active staff found with required role'
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`📊 Found ${allStaff.length} eligible staff, scoring...`);

        // Get all past shifts for reliability/experience scoring
        const { data: allPastShifts, error: pastShiftsError } = await supabase
            .from("shifts")
            .select("*")
            .eq("agency_id", shift.agency_id)
            .in("status", ['completed', 'cancelled', 'no_show']);

        if (pastShiftsError) {
            throw pastShiftsError;
        }

        console.log(`📊 Found ${allStaff.length} potentially eligible staff, checking for conflicts...`);

        // ✅ NEW: Filter out staff with shift conflicts or insufficient rest (11h rule)
        const staffAvailabilityResults = await Promise.all(allStaff.map(async (s) => {
            const { data: conflict, error: conflictError } = await supabase
                .rpc('check_staff_shift_conflict', {
                    p_staff_id: s.id,
                    p_shift_id: shift.id,
                    p_date: shift.date,
                    p_start_time: shift.start_time,
                    p_end_time: shift.end_time
                });
            
            if (conflictError) {
                console.error(`⚠️ Error checking conflict for staff ${s.id}:`, conflictError);
                return { staff: s, hasConflict: false }; // Assume no conflict on error to avoid blocking
            }

            return { staff: s, hasConflict: !!conflict };
        }));

        const nonConflictingStaff = staffAvailabilityResults
            .filter(res => !res.hasConflict)
            .map(res => res.staff);

        console.log(`✅ ${nonConflictingStaff.length}/${allStaff.length} staff cleared conflict check`);

        if (nonConflictingStaff.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    matches: [],
                    message: 'No staff available (all have shift conflicts or insufficient rest)'
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Score each staff member
        const scoredStaff = await Promise.all(nonConflictingStaff.map(async (staffMember) => {
            let score = 0;
            const scoreBreakdown = {};
            const explanations = [];

            // Get staff's shift history
            const staffShifts = allPastShifts.filter(s => s.assigned_staff_id === staffMember.id);
            const completedShifts = staffShifts.filter(s => s.status === 'completed');
            const cancelledShifts = staffShifts.filter(s => s.status === 'cancelled' && s.cancelled_by === 'staff');
            const noShowShifts = staffShifts.filter(s => s.status === 'no_show');

            // 1. RELIABILITY SCORE (30 points max)
            // ✅ Use the authoritative reliability_score from the database
            // Database score is 0-100, we scale it to our 30pt weight
            const dbReliability = staffMember.reliability_score || 0;
            const scaledReliability = (dbReliability / 100) * 30;
            
            score += scaledReliability;
            scoreBreakdown.reliability = Math.round(scaledReliability * 10) / 10;
            
            if (dbReliability >= 95) {
                explanations.push('🏆 Elite reliability (95%+)');
            } else if (dbReliability >= 80) {
                explanations.push('✅ Good reliability history');
            } else if (dbReliability > 50) {
                explanations.push('⚠️ Moderate reliability');
            } else {
                explanations.push('❌ Low reliability score');
            }

            // 2. PROXIMITY SCORE (20 points max)
            let proximityScore = 0;
            let distance = null;

            if (staffMember.address?.postcode && client.address?.postcode) {
                // Simple distance estimation (in real app, use Google Maps Distance Matrix API)
                // For now, approximate based on first 2-3 postcode characters
                const staffPostcodePrefix = staffMember.address.postcode.substring(0, 3).toLowerCase();
                const clientPostcodePrefix = client.address.postcode.substring(0, 3).toLowerCase();

                if (staffPostcodePrefix === clientPostcodePrefix) {
                    proximityScore = 20;
                    distance = '<5 miles';
                    explanations.push('📍 Very close proximity');
                } else {
                    // Rough estimate
                    proximityScore = 10;
                    distance = '5-10 miles';
                    explanations.push('📍 Reasonable distance');
                }
            } else {
                proximityScore = 5;
                distance = 'Unknown';
                explanations.push('📍 Location not verified');
            }

            score += proximityScore;
            scoreBreakdown.proximity = proximityScore;

            // 3. EXPERIENCE SCORE (20 points max)
            let experienceScore = 0;

            // Worked at this client before
            const shiftsAtThisClient = completedShifts.filter(s => s.client_id === shift.client_id);
            if (shiftsAtThisClient.length > 0) {
                experienceScore += 10;
                explanations.push(`✨ Worked here ${shiftsAtThisClient.length} time(s) before`);
            }

            // Total completed shifts
            if (completedShifts.length >= 50) {
                experienceScore += 10;
                explanations.push(`🏆 Highly experienced (${completedShifts.length}+ shifts)`);
            } else if (completedShifts.length >= 20) {
                experienceScore += 8;
                explanations.push(`💪 Experienced (${completedShifts.length} shifts)`);
            } else if (completedShifts.length >= 10) {
                experienceScore += 6;
                explanations.push(`👍 Good experience (${completedShifts.length} shifts)`);
            } else if (completedShifts.length > 0) {
                experienceScore += 4;
                explanations.push(`🌱 Some experience (${completedShifts.length} shifts)`);
            }

            score += experienceScore;
            scoreBreakdown.experience = experienceScore;

            // 4. FRESHNESS SCORE (15 points max)
            let freshnessScore = 0;

            const lastShift = staffShifts
                .filter(s => s.status === 'completed')
                .sort((a, b) => b.date.localeCompare(a.date))[0];

            if (lastShift) {
                const daysSinceLastShift = Math.floor(
                    (new Date() - new Date(lastShift.date)) / (1000 * 60 * 60 * 24)
                );

                if (daysSinceLastShift >= 7) {
                    freshnessScore = 15;
                    explanations.push(`⏰ Last worked ${daysSinceLastShift} days ago (well rested)`);
                } else if (daysSinceLastShift >= 3) {
                    freshnessScore = 10;
                    explanations.push(`⏰ Last worked ${daysSinceLastShift} days ago`);
                } else {
                    freshnessScore = 5;
                    explanations.push(`⚠️ Worked recently (${daysSinceLastShift} days ago)`);
                }
            } else {
                freshnessScore = 15;
                explanations.push('🆕 New staff - fresh and available');
            }

            score += freshnessScore;
            scoreBreakdown.freshness = freshnessScore;

            // 5. RATING SCORE (15 points max)
            let ratingScore = 0;
            const rating = staffMember.rating || 0;

            if (rating >= 5.0) {
                ratingScore = 15;
                explanations.push('⭐ Perfect 5-star rating');
            } else if (rating >= 4.5) {
                ratingScore = 12;
                explanations.push(`⭐ Excellent ${rating.toFixed(1)}-star rating`);
            } else if (rating >= 4.0) {
                ratingScore = 9;
                explanations.push(`⭐ Good ${rating.toFixed(1)}-star rating`);
            } else if (rating > 0) {
                ratingScore = 5;
                explanations.push(`⭐ ${rating.toFixed(1)}-star rating`);
            } else {
                ratingScore = 10; // Benefit of doubt for new staff
                explanations.push('⭐ No ratings yet (new staff)');
            }

            score += ratingScore;
            scoreBreakdown.rating = ratingScore;

            return {
                staff_id: staffMember.id,
                staff_name: `${staffMember.first_name} ${staffMember.last_name}`,
                phone: staffMember.phone,
                email: staffMember.email,
                total_score: Math.round(score),
                score_breakdown: scoreBreakdown,
                explanations: explanations,
                distance: distance,
                rating: rating || 0,
                total_shifts_completed: completedShifts.length,
                reliability_percentage: staffShifts.length > 0
                    ? Math.round((completedShifts.length / staffShifts.length) * 100)
                    : 100
            };
        }));

        // Sort by score and take top matches
        const topMatches = scoredStaff
            .sort((a, b) => b.total_score - a.total_score)
            .slice(0, limit);

        // Add match quality badge
        topMatches.forEach((match, index) => {
            if (index === 0) {
                match.badge = 'TOP_MATCH';
                match.badge_text = '🏆 Top Match';
            } else if (match.total_score >= 80) {
                match.badge = 'EXCELLENT';
                match.badge_text = '⭐ Excellent Match';
            } else if (match.total_score >= 60) {
                match.badge = 'GOOD';
                match.badge_text = '👍 Good Match';
            } else {
                match.badge = 'FAIR';
                match.badge_text = '✓ Fair Match';
            }
        });

        console.log(`✅ [AI Shift Matcher] Top match: ${topMatches[0]?.staff_name} (${topMatches[0]?.total_score}pts)`);

        return new Response(
            JSON.stringify({
                success: true,
                shift_id: shift_id,
                matches: topMatches,
                algorithm_info: {
                    scoring_system: {
                        reliability: 30,
                        proximity: 20,
                        experience: 20,
                        freshness: 15,
                        rating: 15
                    },
                    total_candidates_evaluated: scoredStaff.length
                }
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error('❌ [AI Shift Matcher] Fatal error:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
