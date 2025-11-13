import { TestRegistry } from './types';

// Import test implementations
import * as ShiftJourney from './implementations/shift-journey';
import * as Automation from './implementations/automation';
import * as FinancialIntegrity from './implementations/financial-integrity';
import * as Communication from './implementations/communication';
import * as DataAnalytics from './implementations/data-analytics';
import * as Integrations from './implementations/integrations';

/**
 * Central registry mapping test IDs to implementation functions
 * Each test ID from the CSV maps to an executable function
 */
export const testRegistry: TestRegistry = {
  // Shift Journey Pipeline (sj-001 through sj-016)
  'sj-001': ShiftJourney.testEmailWebhookReceipt,
  'sj-002': ShiftJourney.testAIEmailParsing,
  'sj-003': ShiftJourney.testCreateShiftRecord,
  'sj-004': ShiftJourney.testAssignStaff,
  'sj-005': ShiftJourney.testSendAssignmentNotification,
  'sj-006': ShiftJourney.testCreateDraftTimesheet,
  'sj-007': ShiftJourney.testSend24hReminder,
  'sj-008': ShiftJourney.testSend2hReminder,
  'sj-009': ShiftJourney.testGPSClockIn,
  'sj-010': ShiftJourney.testUploadTimesheetDocument,
  'sj-011': ShiftJourney.testAIOCRExtraction,
  'sj-012': ShiftJourney.testAutoApproveTimesheet,
  'sj-013': ShiftJourney.testMarkShiftCompleted,
  'sj-014': ShiftJourney.testGenerateInvoice,
  'sj-015': ShiftJourney.testSendInvoiceToClient,
  'sj-016': ShiftJourney.testPaymentReminder,
  
  // Automation Pipeline (auto-001 through auto-006)
  'auto-001': Automation.testDailyShiftClosure,
  'auto-002': Automation.testNoShowDetection,
  'auto-003': Automation.testComplianceExpiryReminders,
  'auto-004': Automation.testNotificationBatching,
  'auto-005': Automation.testTimesheetBatchProcessor,
  'auto-006': Automation.testStaffDailyDigest,
  
  // Financial Integrity Pipeline (fin-001 through fin-006)
  'fin-001': FinancialIntegrity.testFinancialLockEnforcement,
  'fin-002': FinancialIntegrity.testImmutableInvoiceSnapshot,
  'fin-003': FinancialIntegrity.testChangeLogCreation,
  'fin-004': FinancialIntegrity.testInvoiceAmendmentWorkflow,
  'fin-005': FinancialIntegrity.testRateCardValidation,
  'fin-006': FinancialIntegrity.testWorkLocationValidation,
  
  // Communication Pipeline (comm-001 through comm-006)
  'comm-001': Communication.testSendEmailResend,
  'comm-002': Communication.testSendSMSTwilio,
  'comm-003': Communication.testSendWhatsAppTwilio,
  'comm-004': Communication.testWhatsAppBotResponse,
  'comm-005': Communication.testEmailBatching,
  'comm-006': Communication.testMultiChannelFallback,
  
  // Data & Analytics Pipeline (data-001 through data-005)
  'data-001': DataAnalytics.testShiftJourneyLog,
  'data-002': DataAnalytics.testPerformanceMetrics,
  'data-003': DataAnalytics.testTimesheetAnalytics,
  'data-004': DataAnalytics.testCSVExport,
  'data-005': DataAnalytics.testCFODashboard,
  
  // External Integrations Pipeline (int-001 through int-005)
  'int-001': Integrations.testOpenAIInvokeLLM,
  'int-002': Integrations.testResendAPIHealth,
  'int-003': Integrations.testTwilioAPIHealth,
  'int-004': Integrations.testBase44FileStorage,
  'int-005': Integrations.testResendWebhookConfig
};

/**
 * Get test function by ID
 */
export function getTestFunction(testId: string) {
  const fn = testRegistry[testId];
  if (!fn) {
    throw new Error(`No test implementation found for test ID: ${testId}`);
  }
  return fn;
}

/**
 * Check if test is implemented
 */
export function isTestImplemented(testId: string): boolean {
  return testId in testRegistry;
}

/**
 * Get all implemented test IDs
 */
export function getImplementedTestIds(): string[] {
  return Object.keys(testRegistry);
}





