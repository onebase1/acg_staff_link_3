import { supabase } from './supabaseClient';

/**
 * Supabase Edge Functions API
 * Provides serverless function invocation
 */

/**
 * Invoke a Supabase Edge Function
 * @param {string} functionName - Name of the Edge Function
 * @param {object} params - Parameters to pass to the function
 * @returns {Promise<{data: any}>}
 */
export async function invokeEdgeFunction(functionName, params = {}) {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: params,
    });

    if (error) throw error;
    return { data };
  } catch (error) {
    console.error(`Error invoking function ${functionName}:`, error);
    throw error;
  }
}

/**
 * Placeholder functions for Base44 compatibility
 * These will be implemented as Supabase Edge Functions
 */

export const sendEmail = async (params) => {
  return invokeEdgeFunction('send-email', params);
};

export const sendSMS = async (params) => {
  return invokeEdgeFunction('send-sms', params);
};

export const sendWhatsApp = async (params) => {
  return invokeEdgeFunction('send-whatsapp', params);
};

export const autoInvoiceGenerator = async (params) => {
  return invokeEdgeFunction('auto-invoice-generator', params);
};

export const autoTimesheetCreator = async (params) => {
  return invokeEdgeFunction('auto-timesheet-creator', params);
};

export const extractTimesheetData = async (params) => {
  return invokeEdgeFunction('extract-timesheet-data', params);
};

export const intelligentTimesheetValidator = async (params) => {
  return invokeEdgeFunction('intelligent-timesheet-validator', params);
};

export const postShiftTimesheetReminder = async (params) => {
  return invokeEdgeFunction('post-shift-timesheet-reminder', params);
};

export const sendInvoice = async (params) => {
  return invokeEdgeFunction('send-invoice', params);
};

export const scheduledTimesheetProcessor = async (params) => {
  return invokeEdgeFunction('scheduled-timesheet-processor', params);
};

export const notificationDigestEngine = async (params) => {
  return invokeEdgeFunction('notification-digest-engine', params);
};

// Generic invoke function for Base44 compatibility
export const invoke = async (functionName, params) => {
  return invokeEdgeFunction(functionName, params);
};


