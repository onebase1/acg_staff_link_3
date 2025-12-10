/**
 * 🚦 RATE LIMITER SERVICE
 * 
 * Prevents notification spam by enforcing send limits.
 * Checks notification_log for recent sends and determines if new send should be allowed.
 * 
 * Rate Limits (USER-ADJUSTED):
 * - General notifications: 15 per hour
 * - Critical notifications: 10 per hour  
 * - Marketing/Promotional: 2 per day
 * - Invoices/Compliance: UNLIMITED (bypass)
 * 
 * Feature Flag: ENABLE_RATE_LIMITING (env var)
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  limitType: 'general' | 'critical' | 'marketing' | 'bypass';
  currentCount: number;
  limit: number;
  resetIn?: number; // seconds until limit resets
}

/**
 * Rate limit configurations (per user-adjusted requirements)
 */
const RATE_LIMITS = {
  // General notifications: 15 per hour
  general: {
    count: 15,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Critical notifications: 10 per hour
  critical: {
    count: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Marketing/Promotional: 2 per day
  marketing: {
    count: 2,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
  },
};

/**
 * Notification types that BYPASS rate limiting (critical for business/legal)
 */
const BYPASS_RATE_LIMITS = [
  'invoice_generated',
  'payment_reminder',
  'compliance_warning',
  'compliance_expiry',
  'document_expiry',
  'account_suspended',
  'legal_notice',
];

/**
 * Critical notification types (10/hour limit instead of 15/hour)
 */
const CRITICAL_NOTIFICATIONS = [
  'shift_24h_reminder',
  'shift_2h_reminder',
  'shift_cancelled',
  'shift_urgent',
  'urgent_shift_escalation',
];

/**
 * Marketing notification types (2/day limit)
 */
const MARKETING_NOTIFICATIONS = [
  'promotional',
  'marketing',
  'newsletter',
  'product_update',
];

/**
 * Check if feature flag is enabled
 */
function isRateLimitingEnabled(): boolean {
  const flag = Deno.env.get("ENABLE_RATE_LIMITING");
  return flag === "true" || flag === "1";
}

/**
 * Main function: Check if notification should be rate limited
 * 
 * @param supabase - Supabase client
 * @param recipientEmail - Email of recipient
 * @param notificationType - Type of notification
 * @param channel - Channel (email, sms, whatsapp)
 * @returns RateLimitResult
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  recipientEmail: string,
  notificationType: string,
  channel: string = 'email'
): Promise<RateLimitResult> {
  
  // If feature flag disabled, always allow
  if (!isRateLimitingEnabled()) {
    console.log('⚙️ [Rate Limiter] Feature disabled - allowing all notifications');
    return {
      allowed: true,
      limitType: 'bypass',
      currentCount: 0,
      limit: Infinity,
    };
  }

  try {
    // BYPASS: Critical notifications always allowed
    if (BYPASS_RATE_LIMITS.includes(notificationType)) {
      console.log(`✅ [Rate Limiter] ${notificationType} bypasses rate limiting`);
      return {
        allowed: true,
        limitType: 'bypass',
        currentCount: 0,
        limit: Infinity,
      };
    }

    // Determine limit type
    let limitType: 'general' | 'critical' | 'marketing' = 'general';
    if (CRITICAL_NOTIFICATIONS.includes(notificationType)) {
      limitType = 'critical';
    } else if (MARKETING_NOTIFICATIONS.includes(notificationType)) {
      limitType = 'marketing';
    }

    const limit = RATE_LIMITS[limitType];
    const windowStart = new Date(Date.now() - limit.windowMs).toISOString();

    // Query notification log for recent sends to this recipient
    const { data: recentNotifications, error } = await supabase
      .from('notification_log')
      .select('id, created_at')
      .eq('recipient_email', recipientEmail)
      .eq('channel', channel)
      .gte('created_at', windowStart)
      .in('status', ['sent', 'delivered']); // Only count successfully sent

    if (error) {
      console.error('❌ [Rate Limiter] Database error:', error);
      // Fail open - allow notification on error
      return {
        allowed: true,
        reason: 'database_error',
        limitType: limitType,
        currentCount: 0,
        limit: limit.count,
      };
    }

    const currentCount = recentNotifications?.length || 0;

    // Check if limit exceeded
    if (currentCount >= limit.count) {
      console.log(`🚫 [Rate Limiter] Limit exceeded for ${recipientEmail}: ${currentCount}/${limit.count} in ${limitType} window`);
      
      // Calculate reset time
      const oldestNotification = recentNotifications?.[0];
      const resetTime = oldestNotification 
        ? new Date(oldestNotification.created_at).getTime() + limit.windowMs
        : Date.now() + limit.windowMs;
      const resetIn = Math.ceil((resetTime - Date.now()) / 1000);

      return {
        allowed: false,
        reason: `rate_limit_exceeded_${limitType}`,
        limitType: limitType,
        currentCount: currentCount,
        limit: limit.count,
        resetIn: resetIn,
      };
    }

    // Within limits
    console.log(`✅ [Rate Limiter] Within limits for ${recipientEmail}: ${currentCount}/${limit.count} (${limitType})`);
    return {
      allowed: true,
      limitType: limitType,
      currentCount: currentCount,
      limit: limit.count,
    };

  } catch (error) {
    console.error('❌ [Rate Limiter] Error:', error);
    // Fail open - allow notification on error
    return {
      allowed: true,
      reason: 'rate_limit_check_error',
      limitType: 'general',
      currentCount: 0,
      limit: RATE_LIMITS.general.count,
    };
  }
}

/**
 * Batch check rate limits for multiple recipients
 * Useful for digest engines that send to many users
 */
export async function batchCheckRateLimits(
  supabase: SupabaseClient,
  recipients: Array<{ email: string; }>,
  notificationType: string,
  channel: string = 'email'
): Promise<Map<string, RateLimitResult>> {
  
  const results = new Map<string, RateLimitResult>();

  // Check each recipient in parallel
  await Promise.all(
    recipients.map(async (recipient) => {
      const result = await checkRateLimit(
        supabase,
        recipient.email,
        notificationType,
        channel
      );
      results.set(recipient.email, result);
    })
  );

  return results;
}

/**
 * Get current rate limit status for a recipient (for debugging)
 */
export async function getRateLimitStatus(
  supabase: SupabaseClient,
  recipientEmail: string,
  channel: string = 'email'
): Promise<{
  general: { current: number; limit: number; resetIn: number };
  critical: { current: number; limit: number; resetIn: number };
  marketing: { current: number; limit: number; resetIn: number };
}> {
  
  const status = {
    general: { current: 0, limit: RATE_LIMITS.general.count, resetIn: 0 },
    critical: { current: 0, limit: RATE_LIMITS.critical.count, resetIn: 0 },
    marketing: { current: 0, limit: RATE_LIMITS.marketing.count, resetIn: 0 },
  };

  // Check each limit type
  for (const [limitType, limit] of Object.entries(RATE_LIMITS)) {
    const windowStart = new Date(Date.now() - limit.windowMs).toISOString();

    const { data: recentNotifications } = await supabase
      .from('notification_log')
      .select('id, created_at')
      .eq('recipient_email', recipientEmail)
      .eq('channel', channel)
      .gte('created_at', windowStart)
      .in('status', ['sent', 'delivered'])
      .order('created_at', { ascending: true });

    const currentCount = recentNotifications?.length || 0;
    
    // Calculate reset time
    const oldestNotification = recentNotifications?.[0];
    const resetTime = oldestNotification 
      ? new Date(oldestNotification.created_at).getTime() + limit.windowMs
      : Date.now();
    const resetIn = Math.max(0, Math.ceil((resetTime - Date.now()) / 1000));

    status[limitType as keyof typeof status] = {
      current: currentCount,
      limit: limit.count,
      resetIn: resetIn,
    };
  }

  return status;
}

/**
 * Override rate limit for a specific send (admin/testing purposes)
 * CAUTION: Use sparingly
 */
export interface RateLimitOverride {
  recipientEmail: string;
  notificationType: string;
  reason: string;
  expiresAt: string; // ISO timestamp
}

let overrides: RateLimitOverride[] = [];

export function addRateLimitOverride(override: RateLimitOverride) {
  overrides.push(override);
  console.log(`⚠️ [Rate Limiter] Override added for ${override.recipientEmail} until ${override.expiresAt}`);
}

export function checkRateLimitOverride(
  recipientEmail: string,
  notificationType: string
): boolean {
  const now = new Date();
  
  // Remove expired overrides
  overrides = overrides.filter(o => new Date(o.expiresAt) > now);
  
  // Check for active override
  return overrides.some(o => 
    o.recipientEmail === recipientEmail && 
    o.notificationType === notificationType &&
    new Date(o.expiresAt) > now
  );
}
