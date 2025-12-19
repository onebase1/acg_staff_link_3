import { supabase } from '../../supabaseClient';

/**
 * Calculates and updates the reliability score for a staff member.
 * @param {string} staffId - The UUID of the staff member.
 * @param {string} reason - The reason for the score update (e.g., "Shift Completed").
 * @returns {Promise<number>} - The new reliability score.
 */
export const calculateStaffScore = async (staffId, reason = 'Manual Update') => {
    try {
        // 1. Fetch Staff Data
        const { data: staff, error: staffError } = await supabase
            .from('staff')
            .select('*')
            .eq('id', staffId)
            .single();

        if (staffError) throw staffError;

        // 2. Fetch Metrics (This would ideally be a complex query or aggregation)
        // For now, we'll simulate fetching metrics or assume some are stored/calculated
        // In a real implementation, we would query shifts, ratings, etc.
        const { count: completedShifts } = await supabase
            .from('shifts')
            .select('id', { count: 'exact', head: true })
            .eq('staff_id', staffId)
            .eq('status', 'completed');

        const { data: ratings } = await supabase
            .from('ratings') // Assuming a ratings table exists or we query shifts with ratings
            .select('rating')
            .eq('staff_id', staffId);

        const averageRating = ratings?.length
            ? ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length
            : 0;

        const { count: noShows } = await supabase
            .from('shifts')
            .select('id', { count: 'exact', head: true })
            .eq('staff_id', staffId)
            .eq('status', 'no_show'); // Assuming 'no_show' status exists

        // 3. Calculate Score
        let score = 50; // Base Score
        const breakdown = {
            base: 50,
            attendance: 0,
            ratings: 0,
            loyalty: 0,
            verification: 0,
            penalties: 0
        };

        // Additions
        // Attendance: +2 points per completed shift (Max +20)
        const attendancePoints = Math.min((completedShifts || 0) * 2, 20);
        score += attendancePoints;
        breakdown.attendance = attendancePoints;

        // Ratings: +5 points per 5-star rating (Max +20)
        // Simplified: +5 if avg > 4.5, +2 if > 4, etc. Or count 5-star ratings.
        // Let's stick to spec: +5 points per 5-star rating
        const fiveStarRatings = ratings?.filter(r => r.rating === 5).length || 0;
        const ratingPoints = Math.min(fiveStarRatings * 5, 20);
        score += ratingPoints;
        breakdown.ratings = ratingPoints;

        // Loyalty: +1 point per month active (Max +5)
        const monthsActive = staff.created_date
            ? Math.floor((new Date() - new Date(staff.created_date)) / (1000 * 60 * 60 * 24 * 30))
            : 0;
        const loyaltyPoints = Math.min(monthsActive, 5);
        score += loyaltyPoints;
        breakdown.loyalty = loyaltyPoints;

        // Verification: +5 points for full document compliance (Mocked for now)
        // const isVerified = staff.documents_verified; 
        // if (isVerified) { score += 5; breakdown.verification = 5; }

        // Deductions
        // No-Show: -30 points
        let penaltyPoints = (noShows || 0) * 30;

        // === TIME DECAY FOR PENALTIES ===
        // Reduce penalty impact based on time since last incident
        let penaltyDecay = 0;
        if (staff.last_incident_date && penaltyPoints > 0) {
            const monthsSinceIncident = Math.floor(
                (new Date() - new Date(staff.last_incident_date)) / (1000 * 60 * 60 * 24 * 30)
            );

            let decayMultiplier = 1;
            if (monthsSinceIncident >= 12) decayMultiplier = 0.25; // 75% reduction after 1 year
            else if (monthsSinceIncident >= 6) decayMultiplier = 0.5; // 50% reduction after 6 months
            else if (monthsSinceIncident >= 1) decayMultiplier = 1 - (monthsSinceIncident * 0.05); // 5% per month

            const originalPenalty = penaltyPoints;
            penaltyPoints = Math.round(penaltyPoints * decayMultiplier);
            penaltyDecay = originalPenalty - penaltyPoints;
        }

        score -= penaltyPoints;
        breakdown.penalties = -penaltyPoints;
        if (penaltyDecay > 0) {
            breakdown.penalty_decay = penaltyDecay;
        }

        // === STREAK BONUS ===
        // +10 for 3+ streak, +15 for 5+ streak, +25 for 10+ streak
        const currentStreak = staff.current_streak || 0;
        let streakBonus = 0;
        if (currentStreak >= 10) streakBonus = 25;
        else if (currentStreak >= 5) streakBonus = 15;
        else if (currentStreak >= 3) streakBonus = 10;

        score += streakBonus;
        breakdown.streak_bonus = streakBonus;

        // === URGENCY HERO BONUS ===
        // +5 per urgent shift covered (max +25)
        const urgentCovered = staff.urgent_shifts_covered || 0;
        const urgencyBonus = Math.min(urgentCovered * 5, 25);
        score += urgencyBonus;
        breakdown.urgency_bonus = urgencyBonus;

        // Cap Score (0-100)
        score = Math.max(0, Math.min(100, score));

        // 4. Update Database
        const oldScore = staff.reliability_score;

        if (oldScore !== score) {
            const { error: updateError } = await supabase
                .from('staff')
                .update({
                    reliability_score: score,
                    score_breakdown: breakdown,
                    last_score_update: new Date().toISOString()
                })
                .eq('id', staffId);

            if (updateError) throw updateError;

            // 5. Log History
            const { error: historyError } = await supabase
                .from('score_history')
                .insert({
                    staff_id: staffId,
                    old_score: oldScore,
                    new_score: score,
                    change_reason: reason,
                    change_amount: score - oldScore
                });

            if (historyError) console.error('Error logging score history:', historyError);
        }

        return score;

    } catch (error) {
        console.error('Error calculating staff score:', error);
        throw error;
    }
};
