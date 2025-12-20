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
        const { data, error } = await supabase
            .from('timesheets')
            .update(updateData)
            .eq('id', timesheetId)
            .select()
            .single();

        if (error) throw error;
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
     * Enforces business rules for hour calculations.
     */
    calculateFinalData(extracted, rowData) {
        const finalData = {};

        // Prioritize row times
        if (rowData.start_time) finalData.actual_start_time = rowData.start_time;
        if (rowData.end_time) finalData.actual_end_time = rowData.end_time;

        if (rowData.break_minutes !== undefined && rowData.break_minutes !== null) {
            finalData.break_duration_minutes = rowData.break_minutes;
        }

        // Calculate hours with 10-hour rule
        if (finalData.actual_start_time && finalData.actual_end_time) {
            const rawDuration = calculateDurationHours(finalData.actual_start_time, finalData.actual_end_time);
            const calculatedHours = calculateBillableHoursWithRule(rawDuration);

            finalData.hours_worked = calculatedHours;
            finalData.total_hours = calculatedHours;
            finalData.break_duration_minutes = rawDuration >= 10 ? 60 : 0;
        } else {
            // Fallback
            const hours = rowData.hours ?? rowData.hours_worked ?? extracted.total_hours ?? null;
            if (hours !== null) {
                finalData.hours_worked = hours;
                finalData.total_hours = hours;
            }
        }

        if (typeof extracted.raw_total_hours === 'number') {
            finalData.raw_total_hours = extracted.raw_total_hours;
        }

        return finalData;
    }
};

export default timesheetService;
