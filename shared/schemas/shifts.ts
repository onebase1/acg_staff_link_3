/**
 * Validation Schemas for Shift Management Functions
 */

import { z } from 'zod';

// ============================================================================
// Shift Status Automation Schemas
// ============================================================================

export const ShiftStatusAutomationRequestSchema = z.object({
  dry_run: z.boolean().optional(),
});

export const ShiftStatusAutomationResponseSchema = z.object({
  success: z.boolean(),
  shifts_started: z.number().int().nonnegative(),
  shifts_ended: z.number().int().nonnegative(),
  shifts_verified: z.number().int().nonnegative(),
  past_shifts_closed: z.number().int().nonnegative(),
  workflows_escalated: z.number().int().nonnegative(),
  unconfirmed_to_marketplace: z.number().int().nonnegative(),
  confirmation_reminders_sent: z.number().int().nonnegative(),
  errors: z.array(z.string()),
});

export type ShiftStatusAutomationRequest = z.infer<typeof ShiftStatusAutomationRequestSchema>;
export type ShiftStatusAutomationResponse = z.infer<typeof ShiftStatusAutomationResponseSchema>;

// ============================================================================
// AI Shift Matcher Schemas
// ============================================================================

export const AIShiftMatcherRequestSchema = z.object({
  shift_id: z.string().uuid(),
  limit: z.number().int().min(1).max(20).optional().default(5),
});

const MatchBreakdownSchema = z.object({
  reliability: z.number().min(0).max(30),
  proximity: z.number().min(0).max(20),
  experience: z.number().min(0).max(20),
  freshness: z.number().min(0).max(15),
  rating: z.number().min(0).max(15),
});

export const AIShiftMatcherResponseSchema = z.object({
  success: z.boolean(),
  matches: z.array(z.object({
    staff_id: z.string().uuid(),
    staff_name: z.string(),
    score: z.number().min(0).max(100),
    breakdown: MatchBreakdownSchema,
    distance_miles: z.number().nonnegative(),
    explanation: z.string(),
  })),
  skipped: z.boolean().optional(),
  reason: z.string().optional(),
});

export type AIShiftMatcherRequest = z.infer<typeof AIShiftMatcherRequestSchema>;
export type AIShiftMatcherResponse = z.infer<typeof AIShiftMatcherResponseSchema>;

// ============================================================================
// Shift Eligibility Validation Schemas
// ============================================================================

export const ValidateShiftEligibilityRequestSchema = z.object({
  shift_id: z.string().uuid(),
  staff_id: z.string().uuid(),
});

export const ValidateShiftEligibilityResponseSchema = z.object({
  success: z.boolean(),
  eligible: z.boolean(),
  reasons: z.array(z.string()),
  compliance_issues: z.array(z.object({
    type: z.string(),
    message: z.string(),
    severity: z.enum(['critical', 'warning']),
  })).optional(),
});

export type ValidateShiftEligibilityRequest = z.infer<typeof ValidateShiftEligibilityRequestSchema>;
export type ValidateShiftEligibilityResponse = z.infer<typeof ValidateShiftEligibilityResponseSchema>;

// ============================================================================
// Shift Reminder Engine Schemas
// ============================================================================

export const ShiftReminderEngineRequestSchema = z.object({
  shift_id: z.string().uuid().optional(),
  hours_before: z.number().int().min(1).max(168).optional().default(24),
  dry_run: z.boolean().optional(),
});

export const ShiftReminderEngineResponseSchema = z.object({
  success: z.boolean(),
  reminders_sent: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  details: z.array(z.object({
    shift_id: z.string().uuid(),
    staff_name: z.string(),
    sent: z.boolean(),
    error: z.string().optional(),
  })),
});

export type ShiftReminderEngineRequest = z.infer<typeof ShiftReminderEngineRequestSchema>;
export type ShiftReminderEngineResponse = z.infer<typeof ShiftReminderEngineResponseSchema>;

