// Migrated to Supabase Edge Functions
import { invokeEdgeFunction } from './supabaseFunctions';

// Wrapper function for Base44 compatibility
const createFunctionWrapper = (functionName) => {
  return async (params) => {
    try {
      return await invokeEdgeFunction(functionName, params);
    } catch (error) {
      console.warn(`⚠️ [Migration] Function ${functionName} not yet implemented as Supabase Edge Function`);
      // Return a placeholder response for non-critical functions
      return {
        data: {
          success: false,
          error: `Function ${functionName} not yet migrated to Supabase Edge Functions`,
        },
      };
    }
  };
};

// Critical functions - these should be implemented as Edge Functions
export const sendEmail = createFunctionWrapper('send-email');
export const sendSMS = createFunctionWrapper('send-sms');
export const sendWhatsApp = createFunctionWrapper('send-whatsapp');
export const autoInvoiceGenerator = createFunctionWrapper('auto-invoice-generator');
export const autoTimesheetCreator = createFunctionWrapper('auto-timesheet-creator');
export const extractTimesheetData = createFunctionWrapper('extract-timesheet-data');
export const intelligentTimesheetValidator = createFunctionWrapper('intelligent-timesheet-validator');
export const postShiftTimesheetReminder = createFunctionWrapper('post-shift-timesheet-reminder');
export const sendInvoice = createFunctionWrapper('send-invoice');
export const scheduledTimesheetProcessor = createFunctionWrapper('scheduled-timesheet-processor');
export const notificationDigestEngine = createFunctionWrapper('notification-digest-engine');
export const shiftVerificationChain = createFunctionWrapper('shift-verification-chain');

// Non-critical functions - placeholders for now
export const generateShiftDescription = createFunctionWrapper('generate-shift-description');
export const extractDocumentDates = createFunctionWrapper('extract-document-dates');
export const shiftStatusAutomation = createFunctionWrapper('shift-status-automation');
export const urgentShiftEscalation = createFunctionWrapper('urgent-shift-escalation');
export const shiftReminderEngine = createFunctionWrapper('shift-reminder-engine');
export const complianceMonitor = createFunctionWrapper('compliance-monitor');
export const emailAutomationEngine = createFunctionWrapper('email-automation-engine');
export const paymentReminderEngine = createFunctionWrapper('payment-reminder-engine');
export const enhancedWhatsAppOffers = createFunctionWrapper('enhanced-whatsapp-offers');
export const aiShiftMatcher = createFunctionWrapper('ai-shift-matcher');
export const clientCommunicationAutomation = createFunctionWrapper('client-communication-automation');
export const staffDailyDigestEngine = createFunctionWrapper('staff-daily-digest-engine');
export const smartEscalationEngine = createFunctionWrapper('smart-escalation-engine');
export const geofenceValidator = createFunctionWrapper('geofence-validator');
export const noShowDetectionEngine = createFunctionWrapper('no-show-detection-engine');
export const autoApprovalEngine = createFunctionWrapper('auto-approval-engine');
export const criticalChangeNotifier = createFunctionWrapper('critical-change-notifier');
export const pingTest1 = createFunctionWrapper('ping-test-1');
export const pingTest2 = createFunctionWrapper('ping-test-2');
export const whatsappTimesheetHandler = createFunctionWrapper('whatsapp-timesheet-handler');
export const welcomeAgency = createFunctionWrapper('welcome-agency');
export const newUserSignupHandler = createFunctionWrapper('new-user-signup-handler');
export const incomingSMSHandler = createFunctionWrapper('incoming-sms-handler');
export const validateBulkImport = createFunctionWrapper('validate-bulk-import');
export const financialDataValidator = createFunctionWrapper('financial-data-validator');
export const incompleteProfileReminder = createFunctionWrapper('incomplete-profile-reminder');
export const validateShiftEligibility = createFunctionWrapper('validate-shift-eligibility');
export const whatsappMasterRouter = createFunctionWrapper('whatsapp-master-router');
export const autoTimesheetApprovalEngine = createFunctionWrapper('auto-timesheet-approval-engine');
export const careHomeInboundEmail = createFunctionWrapper('care-home-inbound-email');
export const dailyShiftClosureEngine = createFunctionWrapper('daily-shift-closure-engine');

