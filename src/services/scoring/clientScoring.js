import { supabase } from '../../supabaseClient';

/**
 * Calculates and updates the desirability score for a client.
 * @param {string} clientId - The UUID of the client.
 * @returns {Promise<number>} - The new desirability score.
 */
export const calculateClientScore = async (clientId) => {
    try {
        // 1. Fetch Client Data
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .single();

        if (clientError) throw clientError;

        // 2. Fetch Metrics
        // Volume: Shifts posted
        const { count: shiftsPosted } = await supabase
            .from('shifts')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', clientId);

        // Fill Rate: Completed / Posted
        const { count: shiftsFilled } = await supabase
            .from('shifts')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', clientId)
            .eq('status', 'completed'); // Or 'filled'

        const fillRate = shiftsPosted ? (shiftsFilled / shiftsPosted) : 0;

        // Payment Speed: (Mocked for now, assumes invoice data)
        // const avgPaymentDays = 5; 

        // Cancellations
        const { count: shiftsCancelled } = await supabase
            .from('shifts')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', clientId)
            .eq('status', 'cancelled');

        // 3. Calculate Score
        let score = 70; // Base Score
        const breakdown = {
            base: 70,
            volume: 0,
            fillRate: 0,
            paymentSpeed: 0,
            penalties: 0
        };

        // Additions
        // Volume: +1 point per shift posted (Max +10)
        const volumePoints = Math.min((shiftsPosted || 0), 10);
        score += volumePoints;
        breakdown.volume = volumePoints;

        // Fill Rate: +10 points if >90% shifts filled
        if (fillRate > 0.9) {
            score += 10;
            breakdown.fillRate = 10;
        }

        // Payment Speed: +10 points if paid < 7 days (Mocked)
        // if (avgPaymentDays < 7) { score += 10; breakdown.paymentSpeed = 10; }

        // Deductions
        // Cancellations: -10 points per shift cancelled by client
        const cancellationPenalty = (shiftsCancelled || 0) * 10;
        score -= cancellationPenalty;
        breakdown.penalties = -cancellationPenalty;

        // Cap Score (0-100)
        score = Math.max(0, Math.min(100, score));

        // 4. Update Database
        if (client.desirability_score !== score) {
            const { error: updateError } = await supabase
                .from('clients')
                .update({
                    desirability_score: score,
                    score_breakdown: breakdown
                })
                .eq('id', clientId);

            if (updateError) throw updateError;
        }

        return score;

    } catch (error) {
        console.error('Error calculating client score:', error);
        throw error;
    }
};
