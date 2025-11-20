/**
 * Shared Constants
 *
 * Application-wide constants used by both frontend and backend.
 */

export const SHIFT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  AGENCY_ADMIN: 'agency_admin',
  STAFF: 'staff',
  CLIENT: 'client',
} as const;

export const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  SMS: 'sms',
  WHATSAPP: 'whatsapp',
} as const;

export const COMPLIANCE_STATUS = {
  VALID: 'valid',
  EXPIRING_SOON: 'expiring_soon',
  EXPIRED: 'expired',
} as const;

// Type exports for use in TypeScript
export type ShiftStatus = typeof SHIFT_STATUS[keyof typeof SHIFT_STATUS];
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
export type NotificationChannel = typeof NOTIFICATION_CHANNELS[keyof typeof NOTIFICATION_CHANNELS];
export type ComplianceStatus = typeof COMPLIANCE_STATUS[keyof typeof COMPLIANCE_STATUS];
