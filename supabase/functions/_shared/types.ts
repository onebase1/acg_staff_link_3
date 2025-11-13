/**
 * Shared TypeScript types for Supabase Edge Functions
 */

// Supabase Response type
export interface SupabaseResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

// Common validation types
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

// Request/Response helpers
export interface EdgeFunctionRequest {
  headers: Headers;
  method: string;
  url: string;
}

export function createResponse(
  data: any,
  status: number = 200,
  headers?: HeadersInit
): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }
  );
}

export function createErrorResponse(
  error: string,
  status: number = 400
): Response {
  return createResponse(
    { success: false, error },
    status
  );
}

export function createSuccessResponse(
  data: any,
  message?: string
): Response {
  return createResponse({
    success: true,
    data,
    message
  });
}
