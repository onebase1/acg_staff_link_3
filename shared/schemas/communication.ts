/**
 * Validation Schemas for Communication Functions
 * 
 * Uses Zod for runtime validation of API requests/responses
 */

import { z } from 'zod';

// ============================================================================
// SMS Schemas
// ============================================================================

export const SendSMSRequestSchema = z.object({
  to: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Must be valid E.164 format (+447911123456)'),
  message: z.string().min(1).max(1600, 'SMS message must be 1-1600 characters'),
  shift_id: z.string().uuid().optional(),
  staff_id: z.string().uuid().optional(),
  client_id: z.string().uuid().optional(),
});

export const SendSMSResponseSchema = z.object({
  success: z.boolean(),
  message_sid: z.string().optional(),
  error: z.string().optional(),
});

export type SendSMSRequest = z.infer<typeof SendSMSRequestSchema>;
export type SendSMSResponse = z.infer<typeof SendSMSResponseSchema>;

// ============================================================================
// Email Schemas
// ============================================================================

export const SendEmailRequestSchema = z.object({
  to: z.union([
    z.string().email(),
    z.array(z.string().email())
  ]),
  subject: z.string().min(1).max(200),
  html: z.string().optional(),
  text: z.string().optional(),
  from: z.string().email().optional(),
  reply_to: z.string().email().optional(),
}).refine(
  (data) => data.html || data.text,
  { message: 'Either html or text content must be provided' }
);

export const SendEmailResponseSchema = z.object({
  success: z.boolean(),
  message_id: z.string().optional(),
  error: z.string().optional(),
});

export type SendEmailRequest = z.infer<typeof SendEmailRequestSchema>;
export type SendEmailResponse = z.infer<typeof SendEmailResponseSchema>;

// ============================================================================
// WhatsApp Schemas
// ============================================================================

export const SendWhatsAppRequestSchema = z.object({
  to: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Must be valid E.164 format'),
  message: z.string().min(1).max(4096, 'WhatsApp message must be 1-4096 characters'),
  media_url: z.string().url().optional(),
});

export const SendWhatsAppResponseSchema = z.object({
  success: z.boolean(),
  message_sid: z.string().optional(),
  error: z.string().optional(),
});

export type SendWhatsAppRequest = z.infer<typeof SendWhatsAppRequestSchema>;
export type SendWhatsAppResponse = z.infer<typeof SendWhatsAppResponseSchema>;

// ============================================================================
// Incoming WhatsApp Handler Schemas
// ============================================================================

export const IncomingWhatsAppHandlerRequestSchema = z.object({
  from: z.string().regex(/^\+[1-9]\d{1,14}$/),
  body: z.string(),
  media_url: z.string().url().optional(),
});

export const IncomingWhatsAppHandlerResponseSchema = z.object({
  success: z.boolean(),
  action_taken: z.string(),
  response_sent: z.boolean(),
  error: z.string().optional(),
});

export type IncomingWhatsAppHandlerRequest = z.infer<typeof IncomingWhatsAppHandlerRequestSchema>;
export type IncomingWhatsAppHandlerResponse = z.infer<typeof IncomingWhatsAppHandlerResponseSchema>;

