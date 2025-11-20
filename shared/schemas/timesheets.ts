/**
 * Validation Schemas for Timesheet Functions
 */

import { z } from 'zod';

// ============================================================================
// Intelligent Timesheet Validator Schemas
// ============================================================================

export const IntelligentTimesheetValidatorRequestSchema = z.object({
  timesheet_id: z.string().uuid(),
});

const ValidationIssueSchema = z.object({
  severity: z.enum(['critical', 'warning', 'info']),
  issue: z.string(),
  message: z.string(),
});

export const IntelligentTimesheetValidatorResponseSchema = z.object({
  success: z.boolean(),
  action: z.enum(['auto_approved', 'needs_review', 'rejected']),
  validations: z.object({
    gps_verified: z.boolean(),
    hours_match: z.boolean(),
    within_tolerance: z.boolean(),
    signatures_present: z.boolean(),
    no_geofence_violations: z.boolean(),
  }),
  issues: z.array(ValidationIssueSchema),
  summary: z.object({
    critical: z.number().int().nonnegative(),
    warnings: z.number().int().nonnegative(),
    info: z.number().int().nonnegative(),
  }),
  workflow_created: z.boolean().optional(),
  workflow_id: z.string().uuid().optional(),
});

export type IntelligentTimesheetValidatorRequest = z.infer<typeof IntelligentTimesheetValidatorRequestSchema>;
export type IntelligentTimesheetValidatorResponse = z.infer<typeof IntelligentTimesheetValidatorResponseSchema>;

// ============================================================================
// Auto Timesheet Creator Schemas
// ============================================================================

export const AutoTimesheetCreatorRequestSchema = z.object({
  shift_id: z.string().uuid(),
});

export const AutoTimesheetCreatorResponseSchema = z.object({
  success: z.boolean(),
  timesheet_id: z.string().uuid().optional(),
  created: z.boolean(),
  error: z.string().optional(),
});

export type AutoTimesheetCreatorRequest = z.infer<typeof AutoTimesheetCreatorRequestSchema>;
export type AutoTimesheetCreatorResponse = z.infer<typeof AutoTimesheetCreatorResponseSchema>;

// ============================================================================
// Extract Timesheet Data Schemas
// ============================================================================

export const ExtractTimesheetDataRequestSchema = z.object({
  file_url: z.string().url(),
  shift_id: z.string().uuid().optional(),
});

export const ExtractTimesheetDataResponseSchema = z.object({
  success: z.boolean(),
  extracted_data: z.object({
    staff_name: z.string().optional(),
    client_name: z.string().optional(),
    date: z.string().optional(),
    start_time: z.string().optional(),
    end_time: z.string().optional(),
    total_hours: z.number().nonnegative().optional(),
    signatures_detected: z.boolean(),
  }).optional(),
  confidence: z.number().min(0).max(100),
  error: z.string().optional(),
});

export type ExtractTimesheetDataRequest = z.infer<typeof ExtractTimesheetDataRequestSchema>;
export type ExtractTimesheetDataResponse = z.infer<typeof ExtractTimesheetDataResponseSchema>;

// ============================================================================
// Validate Timesheet (Legacy) Schemas
// ============================================================================

export const ValidateTimesheetRequestSchema = z.object({
  timesheet_id: z.string().uuid(),
});

export const ValidateTimesheetResponseSchema = z.object({
  success: z.boolean(),
  issues: z.array(ValidationIssueSchema),
  summary: z.object({
    critical: z.number().int().nonnegative(),
    warnings: z.number().int().nonnegative(),
    info: z.number().int().nonnegative(),
  }),
});

export type ValidateTimesheetRequest = z.infer<typeof ValidateTimesheetRequestSchema>;
export type ValidateTimesheetResponse = z.infer<typeof ValidateTimesheetResponseSchema>;

// ============================================================================
// WhatsApp Timesheet Upload Handler Schemas
// ============================================================================

export const WhatsAppTimesheetUploadHandlerRequestSchema = z.object({
  from: z.string().regex(/^\+[1-9]\d{1,14}$/),
  media_url: z.string().url(),
  shift_id: z.string().uuid().optional(),
});

export const WhatsAppTimesheetUploadHandlerResponseSchema = z.object({
  success: z.boolean(),
  timesheet_id: z.string().uuid().optional(),
  validation_result: IntelligentTimesheetValidatorResponseSchema.optional(),
  error: z.string().optional(),
});

export type WhatsAppTimesheetUploadHandlerRequest = z.infer<typeof WhatsAppTimesheetUploadHandlerRequestSchema>;
export type WhatsAppTimesheetUploadHandlerResponse = z.infer<typeof WhatsAppTimesheetUploadHandlerResponseSchema>;

