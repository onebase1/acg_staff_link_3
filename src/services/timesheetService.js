import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { calculateDurationHours, calculateBillableHoursWithRule } from "../utils/shiftCalculations";

/**
 * Service for handling timesheet related operations, including:
 * - Document uploads
 * - OCR extraction
 * - Data confirmation and database updates
 */
const timesheetService = {
    /**
     * Uploads a file to Supabase storage.
     * @param {File} file - The file to upload.
     * @returns {Promise<string>} - The public URL of the uploaded file.
     */
    async uploadFile(file) {
        const fileName = `timesheets/${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage
            .from('documents')
            .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(fileName);

        return publicUrl;
    },

    /**
     * Invokes the OCR edge function to extract data from a timesheet.
     * @param {string} fileUrl - The URL of the uploaded timesheet image/PDF.
     * @param {Object} expectedData - Context for OCR (staff name, client, etc.).
     * @returns {Promise<Object>} - The extracted data and validation results.
     */
    async extractData(fileUrl, expectedData) {
        const { data, error } = await supabase.functions.invoke('extract-timesheet-data', {
            body: {
                file_url: fileUrl,
                expected_data: expectedData
            }
        });

        if (error) throw error;
        if (!data.success) {
            throw new Error(data.error || 'OCR extraction failed');
        }

        return data.extracted_data;
    },

    /**
     * Updates a timesheet record with confirmed OCR data.
     * @param {string} timesheetId - The ID of the timesheet.
     * @param {Object} updateData - The data to update.
     * @returns {Promise<Object>} - The updated timesheet record.
     */
    async updateTimesheet(timesheetId, updateData) {
        if (!timesheetId) throw new Error('Timesheet ID is required for update');

        // Defensive: Prevent empty updates
        if (!updateData || Object.keys(updateData).length === 0) {
            console.warn('⚠️ Service: Empty update data provided for timesheet', timesheetId);
            return null;
        }

        // Defensive: Ensure numeric fields are actually numbers
        if (updateData.hours_worked !== undefined) updateData.hours_worked = parseFloat(updateData.hours_worked) || 0;
        if (updateData.total_hours !== undefined) updateData.total_hours = parseFloat(updateData.total_hours) || 0;
        if (updateData.break_duration_minutes !== undefined) updateData.break_duration_minutes = parseInt(updateData.break_duration_minutes, 10) || 0;

        const { data, error } = await supabase
            .from('timesheets')
            .update(updateData)
            .eq('id', timesheetId)
            .select()
            .single();

        if (error) {
            console.error(`❌ Service: Update failed for timesheet ${timesheetId}:`, error);
            throw error;
        }
        return data;
    },

    /**
     * Links a shift to a timesheet and marks it as received.
     * @param {string} shiftId - The ID of the shift.
     * @param {string} timesheetId - The ID of the timesheet.
     */
    async linkShift(shiftId, timesheetId) {
        if (!shiftId) return;

        const { error } = await supabase
            .from('shifts')
            .update({
                timesheet_id: timesheetId,
                timesheet_received: true,
                timesheet_received_at: new Date().toISOString()
            })
            .eq('id', shiftId);

        if (error) throw error;
    },

    /**
     * Helper to calculate final timesheet data based on OCR results and user overrides.
     * Enforces business rules for hour calculations and maps verbatim times to DB.
     * @param {Object} extracted - The full extracted OCR data object.
     * @param {Object} rowData - The specific row or matched data to save.
     * @param {string} shiftDate - The YYYY-MM-DD date of the shift.
     */
    calculateFinalData(extracted, rowData, shiftDate) {
        const finalData = {};
        const dateStr = shiftDate || rowData.date || extracted.date;

        // Helper to combine date and time into ISO string
        const createTimestamp = (timeStr) => {
            if (!dateStr || !timeStr) return null;
            try {
                // Remove any non-time characters
                const time = String(timeStr).trim().match(/(\d{1,2})[:.](\d{2})/);
                if (!time) return null;

                const h = parseInt(time[1], 10);
                const m = parseInt(time[2], 10);

                const date = new Date(dateStr);
                date.setHours(h, m, 0, 0);
                return date.toISOString();
            } catch (e) {
                console.error('Error creating timestamp:', e);
                return null;
            }
        };

        // Verbatim Time Mapping (Priority: User Override -> Extracted Row)
        const startTime = rowData.start_time || rowData.actual_shift_start || rowData.clock_in_time;
        const endTime = rowData.end_time || rowData.actual_shift_end || rowData.clock_out_time;

        if (startTime) {
            finalData.actual_start_time = startTime; // RESTORE for Invoice Generator
            finalData.clock_in = createTimestamp(startTime);
            finalData.clock_in_time = finalData.clock_in; // Sync both legacy and new columns
        }
        if (endTime) {
            finalData.actual_end_time = endTime;     // RESTORE for Invoice Generator
            finalData.clock_out = createTimestamp(endTime);
            finalData.clock_out_time = finalData.clock_out; // Sync both legacy and new columns
        }

        if (rowData.break_minutes !== undefined && rowData.break_minutes !== null) {
            finalData.break_duration_minutes = rowData.break_minutes;
        }

        // Calculate hours with 10-hour rule
        if (startTime && endTime) {
            const rawDuration = calculateDurationHours(startTime, endTime);
            const calculatedHours = calculateBillableHoursWithRule(rawDuration);

            finalData.hours_worked = rawDuration;      // Gross (e.g. 12.0)
            finalData.total_hours = calculatedHours;   // Net (e.g. 11.0)
            finalData.raw_total_hours = rawDuration;  // Sync verbatim Gross column

            // If break duration wasn't explicitly provided, set it based on the rule
            if (finalData.break_duration_minutes === undefined || finalData.break_duration_minutes === null) {
                finalData.break_duration_minutes = rawDuration > 10 ? 60 : 0;
            }
        } else {
            // Fallback: If only hours were extracted/overridden without times
            const hours = rowData.hours ?? rowData.hours_worked ?? extracted.hours_worked ?? extracted.total_hours ?? null;
            if (hours !== null) {
                finalData.hours_worked = parseFloat(hours);
                finalData.total_hours = calculateBillableHoursWithRule(parseFloat(hours));
                finalData.raw_total_hours = parseFloat(hours);

                if (finalData.break_duration_minutes === undefined || finalData.break_duration_minutes === null) {
                    finalData.break_duration_minutes = parseFloat(hours) > 10 ? 60 : 0;
                }
            }
        }

        return finalData;
    },

    /**
     * Fetches all addressable timesheets for a staff member within a date range.
     * Addressable means status is 'draft' or 'pending_admin_review'.
     * @param {string} staffId - The ID of the staff member.
     * @param {string} minDate - Earliest date (YYYY-MM-DD).
     * @param {string} maxDate - Latest date (YYYY-MM-DD).
     * @returns {Promise<Array>} - List of timesheet objects with joined shift data.
     */
    async fetchAddressableTimesheets(staffId, minDate, maxDate) {
        if (!staffId || !minDate || !maxDate) return [];

        const { data, error } = await supabase
            .from('timesheets')
            .select('*, shift:shifts(*)')
            .eq('staff_id', staffId)
            .in('status', ['draft', 'pending_admin_review', 'overdue'])
            .gte('shift_date', minDate)
            .lte('shift_date', maxDate);

        if (error) {
            console.error('❌ Error fetching addressable shifts:', error);
            return [];
        }

        return data || [];
    },


    /**
     * Performs a batch update of multiple timesheets.
     * @param {Array} updates - List of objects containing {timesheetId, updateData}.
     * @returns {Promise<Array>} - Results of the updates.
     */
    batchSaveTimesheets: async (updates) => {
        if (!updates || updates.length === 0) return [];

        try {
            console.log(`🚀 Service: Starting batch save for ${updates.length} updates...`);
            const results = await Promise.all(updates.map(async (update) => {
                const { timesheetId, updateData, shiftId } = update;

                // Use the defensive update method
                const data = await timesheetService.updateTimesheet(timesheetId, updateData);

                if (shiftId) {
                    await timesheetService.linkShift(shiftId, timesheetId);
                }

                return {
                    id: timesheetId,
                    data,
                    autoApproved: updateData.auto_approved,
                    success: true
                };
            }));

            return results;
        } catch (error) {
            console.error('❌ Service: Batch save failed:', error);
            throw error;
        }
    }
};

export default timesheetService;
