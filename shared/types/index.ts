/**
 * Shared Types for ACG StaffLink
 *
 * This file exports all shared types used across frontend and backend.
 * Always update this when adding new edge functions or changing API contracts.
 */

// Re-export Supabase generated types
export * from './supabase-generated';

// Common response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type Severity = 'critical' | 'warning' | 'info';

export interface ValidationIssue {
  severity: Severity;
  timesheet_id?: string;
  shift_id?: string;
  issue: string;
  message: string;
}

export interface ValidationResult {
  success: boolean;
  issues: ValidationIssue[];
  summary?: {
    critical: number;
    warnings: number;
    info: number;
  };
}

// Edge function contracts (add more as needed)
export * from './edge-functions';
