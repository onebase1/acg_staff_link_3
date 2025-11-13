// Compatibility layer - exports Supabase entities and auth with Base44-like API
// This allows gradual migration from Base44 to Supabase

import {
  Agency,
  Staff,
  Client,
  Shift,
  Booking,
  Timesheet,
  Invoice,
  Payslip,
  Compliance,
  Group,
  AdminWorkflow,
  ChangeLog,
  OperationalCost,
  InvoiceAmendment,
  NotificationQueue,
} from './supabaseEntities';

import { supabaseAuth } from './supabaseAuth';
import { Core } from './integrations';
import { agencyService } from './agencyService';

// Create a compatibility object that mimics Base44 structure
export const base44 = {
  entities: {
    Agency,
    Staff,
    Client,
    Shift,
    Booking,
    Timesheet,
    Invoice,
    Payslip,
    Compliance,
    Group,
    AdminWorkflow,
    ChangeLog,
    OperationalCost,
    InvoiceAmendment,
    NotificationQueue,
  },
  auth: supabaseAuth,
  // Functions - use Supabase Edge Functions
  functions: {
    invoke: async (functionName, params) => {
      const { invokeEdgeFunction } = await import('./supabaseFunctions');
      return invokeEdgeFunction(functionName, params);
    },
    // Export individual functions for compatibility
    sendEmail: async (params) => {
      const { sendEmail } = await import('./supabaseFunctions');
      return sendEmail(params);
    },
    sendSMS: async (params) => {
      const { sendSMS } = await import('./supabaseFunctions');
      return sendSMS(params);
    },
    sendWhatsApp: async (params) => {
      const { sendWhatsApp } = await import('./supabaseFunctions');
      return sendWhatsApp(params);
    },
    autoInvoiceGenerator: async (params) => {
      const { autoInvoiceGenerator } = await import('./supabaseFunctions');
      return autoInvoiceGenerator(params);
    },
    autoTimesheetCreator: async (params) => {
      const { autoTimesheetCreator } = await import('./supabaseFunctions');
      return autoTimesheetCreator(params);
    },
    extractTimesheetData: async (params) => {
      const { extractTimesheetData } = await import('./supabaseFunctions');
      return extractTimesheetData(params);
    },
    intelligentTimesheetValidator: async (params) => {
      const { intelligentTimesheetValidator } = await import('./supabaseFunctions');
      return intelligentTimesheetValidator(params);
    },
    postShiftTimesheetReminder: async (params) => {
      const { postShiftTimesheetReminder } = await import('./supabaseFunctions');
      return postShiftTimesheetReminder(params);
    },
    sendInvoice: async (params) => {
      const { sendInvoice } = await import('./supabaseFunctions');
      return sendInvoice(params);
    },
    scheduledTimesheetProcessor: async (params) => {
      const { scheduledTimesheetProcessor } = await import('./supabaseFunctions');
      return scheduledTimesheetProcessor(params);
    },
    notificationDigestEngine: async (params) => {
      const { notificationDigestEngine } = await import('./supabaseFunctions');
      return notificationDigestEngine(params);
    },
    shiftVerificationChain: async (params) => {
      const { shiftVerificationChain } = await import('./supabaseFunctions');
      return shiftVerificationChain(params);
    },
  },
  // Integrations - import directly (no circular dependency since integrations imports from supabaseStorage, not base44Client)
  integrations: {
    Core,
  },
  agents: {
    getWhatsAppConnectURL: (agentKey) => {
      console.warn(`⚠️ [Migration] WhatsApp agent ${agentKey} connect URL not yet implemented`);
      return null;
    },
  },
  agency: agencyService,
};
