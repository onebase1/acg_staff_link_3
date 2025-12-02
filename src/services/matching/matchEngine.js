import { supabase } from '../../supabaseClient';

/**
 * Calculates the distance between two coordinates in miles using the Haversine formula.
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in miles
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 999; // Return large distance if coords missing

    const toRad = (value) => (value * Math.PI) / 180;
    const R = 3958.8; // Radius of Earth in miles

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Finds and scores matching staff for a given shift.
 * @param {string} shiftId - The UUID of the shift.
 * @returns {Promise<Array>} - Sorted list of matching staff.
 */
export const findMatchesForShift = async (shiftId) => {
    try {
        // 1. Fetch Shift Details
        const { data: shift, error: shiftError } = await supabase
            .from('shifts')
            .select('*, clients(*)') // Fetch client details for location and preferences
            .eq('id', shiftId)
            .single();

        if (shiftError) throw shiftError;

        // 2. Fetch Eligible Staff (Filter by Role first for efficiency)
        const { data: staffList, error: staffError } = await supabase
            .from('staff')
            .select('*')
            .eq('role', shift.role) // Exact Role Match (Critical)
            .eq('status', 'active'); // Only active staff

        if (staffError) throw staffError;

        // 3. Calculate Match Scores
        const scoredStaff = staffList.map(staff => {
            let matchScore = 0;
            const breakdown = {};

            // Criteria 1: Distance (30%)
            // Assuming lat/long are available on staff and client/shift
            // If not, we'd need to geocode addresses. For now, assuming columns exist or defaults.
            const distance = calculateDistance(
                shift.latitude || shift.clients?.latitude,
                shift.longitude || shift.clients?.longitude,
                staff.latitude,
                staff.longitude
            );

            let distanceScore = 0;
            if (distance < 5) distanceScore = 100;
            else if (distance <= 10) distanceScore = 80;
            else if (distance <= 20) distanceScore = 40; // Spec says > 20 is 0, so 10-20 can be scaled or fixed.
            else distanceScore = 0;

            matchScore += distanceScore * 0.3; // 30% weight
            breakdown.distance = { value: distance, score: distanceScore, weighted: distanceScore * 0.3 };

            // Criteria 2: Role Match (Already filtered, so 100%)
            // matchScore += 100 * 0.2; // If we wanted to weight it, but spec says "Critical" (Binary)

            // Criteria 3: Staff Reliability (40%)
            const reliabilityScore = staff.reliability_score || 50;
            matchScore += reliabilityScore * 0.4;
            breakdown.reliability = { value: reliabilityScore, weighted: reliabilityScore * 0.4 };

            // Criteria 4: Client Preference (20%)
            // Mocking preferences for now
            let preferenceScore = 0;
            // if (client.favorites.includes(staff.id)) preferenceScore = 50;
            // if (client.blocked.includes(staff.id)) return null; // Exclude blocked

            matchScore += preferenceScore; // Direct addition as per spec (+50 pts)
            breakdown.preference = preferenceScore;

            // Criteria 5: Fairness (10%)
            // Hasn't worked this week: +10 pts
            // Need to check shifts. For now, simplified.
            const workedThisWeek = false; // Mocked
            if (!workedThisWeek) {
                matchScore += 10;
                breakdown.fairness = 10;
            }

            return {
                ...staff,
                match_score: Math.round(matchScore),
                match_breakdown: breakdown,
                distance_miles: distance
            };
        });

        // 4. Sort by Score (Desc)
        const sortedMatches = scoredStaff
            .filter(s => s !== null) // Remove blocked
            .sort((a, b) => b.match_score - a.match_score);

        return sortedMatches;

    } catch (error) {
        console.error('Error finding matches:', error);
        throw error;
    }
};
