/**
 * Edge Function API Contracts
 *
 * Define request/response interfaces for all Supabase Edge Functions.
 * Frontend and backend MUST use these types for type safety.
 */

// ============================================================================
// Communication Functions
// ============================================================================

export interface SendSMSRequest {
  to: string;                    // Phone number in E.164 format (+447911123456)
  message: string;               // SMS content (max 1600 chars)
  shift_id?: string;             // Optional: link to shift
  staff_id?: string;             // Optional: link to staff
  client_id?: string;            // Optional: link to client
}

export interface SendSMSResponse {
  success: boolean;
  message_sid?: string;          // Twilio message ID
  error?: string;
}

export interface SendEmailRequest {
  to: string | string[];         // Email address(es)
  subject: string;
  html?: string;                 // HTML content
  text?: string;                 // Plain text content
  from?: string;                 // Sender (default: ACG StaffLink)
  reply_to?: string;
}

export interface SendEmailResponse {
  success: boolean;
  message_id?: string;           // Resend message ID
  error?: string;
}

export interface SendWhatsAppRequest {
  to: string;                    // WhatsApp number
  message: string;               // Message content
  media_url?: string;            // Optional: image/document URL
}

export interface SendWhatsAppResponse {
  success: boolean;
  message_sid?: string;
  error?: string;
}

// ============================================================================
// Automation Functions
// ============================================================================

export interface ShiftReminderEngineRequest {
  shift_id?: string;             // Optional: specific shift
  hours_before?: number;         // Default: 24
  dry_run?: boolean;             // Preview without sending
}

export interface ShiftReminderEngineResponse {
  success: boolean;
  reminders_sent: number;
  failed: number;
  details: Array<{
    shift_id: string;
    staff_name: string;
    sent: boolean;
    error?: string;
  }>;
}

// ============================================================================
// Validation Functions
// ============================================================================

export interface ValidateTimesheetRequest {
  timesheet_id: string;
}

export interface ValidateTimesheetResponse {
  success: boolean;
  issues: Array<{
    severity: 'critical' | 'warning' | 'info';
    issue: string;
    message: string;
  }>;
  summary: {
    critical: number;
    warnings: number;
    info: number;
  };
}

// ============================================================================
// Shift Management Functions
// ============================================================================

export interface ShiftStatusAutomationRequest {
  dry_run?: boolean;             // Preview changes without applying
}

export interface ShiftStatusAutomationResponse {
  success: boolean;
  shifts_started: number;
  shifts_ended: number;
  shifts_verified: number;
  past_shifts_closed: number;
  workflows_escalated: number;
  unconfirmed_to_marketplace: number;
  confirmation_reminders_sent: number;
  errors: string[];
}

export interface AIShiftMatcherRequest {
  shift_id: string;
  limit?: number;                // Default: 5 (top matches)
}

export interface AIShiftMatcherResponse {
  success: boolean;
  matches: Array<{
    staff_id: string;
    staff_name: string;
    score: number;               // 0-100
    breakdown: {
      reliability: number;       // 0-30 points
      proximity: number;         // 0-20 points
      experience: number;        // 0-20 points
      freshness: number;         // 0-15 points
      rating: number;            // 0-15 points
    };
    distance_miles: number;
    explanation: string;
  }>;
  skipped?: boolean;
  reason?: string;
}

export interface ValidateShiftEligibilityRequest {
  shift_id: string;
  staff_id: string;
}

export interface ValidateShiftEligibilityResponse {
  success: boolean;
  eligible: boolean;
  reasons: string[];             // Why eligible/ineligible
  compliance_issues?: Array<{
    type: string;
    message: string;
    severity: 'critical' | 'warning';
  }>;
}

// ============================================================================
// Timesheet Functions
// ============================================================================

export interface IntelligentTimesheetValidatorRequest {
  timesheet_id: string;
}

export interface IntelligentTimesheetValidatorResponse {
  success: boolean;
  action: 'auto_approved' | 'needs_review' | 'rejected';
  validations: {
    gps_verified: boolean;
    hours_match: boolean;
    within_tolerance: boolean;
    signatures_present: boolean;
    no_geofence_violations: boolean;
  };
  issues: Array<{
    severity: 'critical' | 'warning' | 'info';
    issue: string;
    message: string;
  }>;
  summary: {
    critical: number;
    warnings: number;
    info: number;
  };
  workflow_created?: boolean;
  workflow_id?: string;
}

export interface AutoTimesheetCreatorRequest {
  shift_id: string;
}

export interface AutoTimesheetCreatorResponse {
  success: boolean;
  timesheet_id?: string;
  created: boolean;
  error?: string;
}

export interface ExtractTimesheetDataRequest {
  file_url: string;              // URL to timesheet image/PDF
  shift_id?: string;             // Optional: link to shift
}

export interface ExtractTimesheetDataResponse {
  success: boolean;
  extracted_data?: {
    staff_name?: string;
    client_name?: string;
    date?: string;
    start_time?: string;
    end_time?: string;
    total_hours?: number;
    signatures_detected: boolean;
  };
  confidence: number;            // 0-100
  error?: string;
}

// ============================================================================
// Compliance Functions
// ============================================================================

export interface ComplianceMonitorRequest {
  staff_id?: string;             // Optional: specific staff
  agency_id?: string;            // Optional: specific agency
  days_before_expiry?: number;   // Default: 30
}

export interface ComplianceMonitorResponse {
  success: boolean;
  alerts: Array<{
    staff_id: string;
    staff_name: string;
    document_type: string;
    expiry_date: string;
    days_until_expiry: number;
    severity: 'critical' | 'warning' | 'info';
  }>;
  notifications_sent: number;
}

export interface ExtractDocumentDatesRequest {
  file_url: string;
  document_type: string;         // 'dbs', 'right_to_work', 'training_cert', etc.
}

export interface ExtractDocumentDatesResponse {
  success: boolean;
  issue_date?: string;
  expiry_date?: string;
  confidence: number;            // 0-100
  error?: string;
}

// ============================================================================
// Notification & Digest Functions
// ============================================================================

export interface StaffDailyDigestEngineRequest {
  staff_id?: string;             // Optional: specific staff
  dry_run?: boolean;             // Preview without sending
}

export interface StaffDailyDigestEngineResponse {
  success: boolean;
  digests_sent: number;
  failed: number;
  details: Array<{
    staff_id: string;
    staff_name: string;
    email: string;
    shifts_today: number;
    pending_applications: number;
    compliance_alerts: number;
    sent: boolean;
    error?: string;
  }>;
}

export interface DailyClientDigestRequest {
  client_id?: string;            // Optional: specific client
  dry_run?: boolean;
}

export interface DailyClientDigestResponse {
  success: boolean;
  digests_sent: number;
  failed: number;
  details: Array<{
    client_id: string;
    client_name: string;
    email: string;
    shifts_today: number;
    unfilled_shifts: number;
    sent: boolean;
    error?: string;
  }>;
}

export interface PostShiftTimesheetReminderRequest {
  shift_id?: string;             // Optional: specific shift
  hours_after_shift?: number;    // Default: 2
}

export interface PostShiftTimesheetReminderResponse {
  success: boolean;
  reminders_sent: number;
  failed: number;
  details: Array<{
    shift_id: string;
    staff_name: string;
    sent: boolean;
    channel: 'email' | 'sms' | 'whatsapp';
    error?: string;
  }>;
}

// ============================================================================
// Workflow & Automation Functions
// ============================================================================

export interface DailyShiftClosureEngineRequest {
  dry_run?: boolean;
}

export interface DailyShiftClosureEngineResponse {
  success: boolean;
  shifts_processed: number;
  auto_approved: number;
  workflows_created: number;
  errors: string[];
}

export interface SmartEscalationEngineRequest {
  workflow_id?: string;          // Optional: specific workflow
  hours_overdue?: number;        // Default: 72
}

export interface SmartEscalationEngineResponse {
  success: boolean;
  workflows_escalated: number;
  notifications_sent: number;
  details: Array<{
    workflow_id: string;
    type: string;
    hours_overdue: number;
    escalated_to: string;
    sent: boolean;
  }>;
}

export interface NoShowDetectionEngineRequest {
  shift_id?: string;
  hours_after_start?: number;    // Default: 1
}

export interface NoShowDetectionEngineResponse {
  success: boolean;
  no_shows_detected: number;
  workflows_created: number;
  notifications_sent: number;
  details: Array<{
    shift_id: string;
    staff_name: string;
    client_name: string;
    detected_at: string;
    workflow_created: boolean;
  }>;
}

// ============================================================================
// Financial Functions
// ============================================================================

export interface AutoInvoiceGeneratorRequest {
  agency_id: string;
  start_date: string;            // YYYY-MM-DD
  end_date: string;              // YYYY-MM-DD
  client_id?: string;            // Optional: specific client
}

export interface AutoInvoiceGeneratorResponse {
  success: boolean;
  invoices_generated: number;
  total_amount: number;
  invoices: Array<{
    invoice_id: string;
    client_id: string;
    client_name: string;
    amount: number;
    shifts_count: number;
    period: string;
  }>;
  error?: string;
}

export interface SendInvoiceRequest {
  invoice_id: string;
  send_email?: boolean;          // Default: true
}

export interface SendInvoiceResponse {
  success: boolean;
  invoice_url?: string;
  email_sent: boolean;
  error?: string;
}

export interface PaymentReminderEngineRequest {
  days_overdue?: number;         // Default: 7
  dry_run?: boolean;
}

export interface PaymentReminderEngineResponse {
  success: boolean;
  reminders_sent: number;
  total_overdue_amount: number;
  details: Array<{
    invoice_id: string;
    client_name: string;
    amount: number;
    days_overdue: number;
    sent: boolean;
  }>;
}

export interface FinancialDataValidatorRequest {
  timesheet_id?: string;
  invoice_id?: string;
  validation_type: 'timesheet' | 'invoice' | 'both';
}

export interface FinancialDataValidatorResponse {
  success: boolean;
  valid: boolean;
  issues: Array<{
    type: string;
    severity: 'critical' | 'warning';
    message: string;
    field?: string;
  }>;
  summary: {
    critical_issues: number;
    warnings: number;
  };
}

// ============================================================================
// WhatsApp Integration Functions
// ============================================================================

export interface IncomingWhatsAppHandlerRequest {
  from: string;                  // WhatsApp number
  body: string;                  // Message content
  media_url?: string;            // Optional: media attachment
}

export interface IncomingWhatsAppHandlerResponse {
  success: boolean;
  action_taken: string;
  response_sent: boolean;
  error?: string;
}

export interface WhatsAppTimesheetUploadHandlerRequest {
  from: string;
  media_url: string;
  shift_id?: string;
}

export interface WhatsAppTimesheetUploadHandlerResponse {
  success: boolean;
  timesheet_id?: string;
  validation_result?: IntelligentTimesheetValidatorResponse;
  error?: string;
}

// ============================================================================
// User Management Functions
// ============================================================================

export interface NewUserSignupHandlerRequest {
  email: string;
  full_name: string;
  role: 'staff' | 'agency_admin' | 'client';
  agency_id?: string;
}

export interface NewUserSignupHandlerResponse {
  success: boolean;
  user_id?: string;
  profile_created: boolean;
  welcome_email_sent: boolean;
  error?: string;
}

export interface SendAgencyAdminInviteRequest {
  email: string;
  agency_id: string;
  invited_by: string;
}

export interface SendAgencyAdminInviteResponse {
  success: boolean;
  invite_sent: boolean;
  invite_url?: string;
  error?: string;
}

export interface IncompleteProfileReminderRequest {
  days_since_signup?: number;    // Default: 7
  dry_run?: boolean;
}

export interface IncompleteProfileReminderResponse {
  success: boolean;
  reminders_sent: number;
  details: Array<{
    user_id: string;
    email: string;
    missing_fields: string[];
    sent: boolean;
  }>;
}

// ============================================================================
// GPS & Geofencing Functions
// ============================================================================

export interface GeofenceValidatorRequest {
  latitude: number;
  longitude: number;
  client_id: string;
  tolerance_meters?: number;     // Default: 100
}

export interface GeofenceValidatorResponse {
  success: boolean;
  within_geofence: boolean;
  distance_meters: number;
  client_location: {
    latitude: number;
    longitude: number;
  };
}

// ============================================================================
// AI Assistant Functions
// ============================================================================

export interface AIAssistantRequest {
  query: string;
  context?: {
    user_id?: string;
    agency_id?: string;
    shift_id?: string;
  };
  conversation_history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface AIAssistantResponse {
  success: boolean;
  response: string;
  actions_taken?: Array<{
    type: string;
    description: string;
    result: any;
  }>;
  suggestions?: string[];
  error?: string;
}
