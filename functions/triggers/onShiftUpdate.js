import { calculateStaffScore } from '../../src/services/scoring/staffScoring';
import { calculateClientScore } from '../../src/services/scoring/clientScoring';

/**
 * Trigger handler for shift updates.
 * This function should be called by a Supabase Database Webhook or Edge Function.
 * For this implementation, we simulate the handler logic.
 * 
 * @param {object} payload - The webhook payload from Supabase.
 */
export const onShiftUpdate = async (payload) => {
    const { old_record, record, type } = payload;

    if (type !== 'UPDATE' && type !== 'INSERT') return;

    const newStatus = record.status;
    const oldStatus = old_record?.status;

    // 1. Shift Completed
    if (newStatus === 'completed' && oldStatus !== 'completed') {
        console.log(`Shift ${record.id} completed. Recalculating scores.`);

        // Recalculate Staff Score (+Attendance)
        if (record.staff_id) {
            await calculateStaffScore(record.staff_id, 'Shift Completed');
        }

        // Recalculate Client Score (Fill Rate)
        if (record.client_id) {
            await calculateClientScore(record.client_id);
        }
    }

    // 2. Shift Cancelled (by Client)
    if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
        // Need to determine who cancelled. Assuming metadata or separate log.
        // If client cancelled:
        if (record.client_id) {
            console.log(`Shift ${record.id} cancelled. Recalculating client score.`);
            await calculateClientScore(record.client_id);
        }
    }

    // 3. No-Show Recorded
    if (newStatus === 'no_show' && oldStatus !== 'no_show') {
        console.log(`No-show recorded for shift ${record.id}. Recalculating staff score.`);
        if (record.staff_id) {
            await calculateStaffScore(record.staff_id, 'No-Show Penalty');
        }
    }
};
