/**
 * Shared Branding Helper for Multi-Tenant SaaS
 *
 * This module provides centralized branding configuration for all edge functions.
 * Supports:
 * - SaaS-level defaults (from environment variables)
 * - Agency-specific overrides (from database)
 * - White-label configuration
 *
 * Usage in edge functions:
 * ```typescript
 * import { getBranding } from "../_shared/getBranding.ts";
 *
 * const branding = await getBranding(supabase, agencyId);
 * console.log(branding.saasName); // "ACG StaffLink" or custom
 * ```
 */

export interface Branding {
  // SaaS Name & Company
  saasName: string;
  companyName: string;

  // Contact Information
  supportEmail: string;
  supportPhone: string;
  noreplyEmail: string;

  // URLs
  siteUrl: string;
  appUrl: string;
  staffPortalUrl: string;      // For staff members
  clientPortalUrl: string;     // For client contacts
  adminDashboardUrl: string;   // For admins
  portalUrl: string;           // DEPRECATED - use role-specific URLs above
  fromDomain: string;

  // Visual Branding (Future)
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;

  // Feature Flags
  enableWhiteLabel?: boolean;
}

/**
 * Get branding configuration for an agency
 *
 * Priority order:
 * 1. Database (saas_configuration table) - agency-specific overrides
 * 2. Environment variables - SaaS defaults
 * 3. Hard-coded fallbacks - last resort
 *
 * @param supabase - Supabase client (service role)
 * @param agencyId - Agency ID (optional, returns SaaS defaults if not provided)
 * @returns Branding configuration object
 */
export async function getBranding(
  supabase: any,
  agencyId?: string
): Promise<Branding> {

  // If agency ID provided, try to fetch agency-specific branding
  if (agencyId) {
    try {
      const { data: config, error } = await supabase
        .from('saas_configuration')
        .select('*')
        .eq('agency_id', agencyId)
        .maybeSingle();

      if (!error && config) {
        // Return agency-specific branding with environment variable fallbacks
        const baseUrl = config.custom_domain || config.site_url || Deno.env.get("SITE_URL") || "https://agilecaremanagement.co.uk";

        return {
          saasName: config.saas_name || Deno.env.get("SAAS_NAME") || "ACG StaffLink",
          companyName: config.saas_company_name || Deno.env.get("SAAS_COMPANY_NAME") || "Agile Care Management",
          supportEmail: config.support_email || Deno.env.get("SAAS_SUPPORT_EMAIL") || "support@agilecaremanagement.co.uk",
          supportPhone: config.support_phone || Deno.env.get("SAAS_SUPPORT_PHONE") || "+44 20 1234 5678",
          noreplyEmail: config.noreply_email || Deno.env.get("SAAS_NOREPLY_EMAIL") || `noreply@${Deno.env.get("RESEND_FROM_DOMAIN") || "agilecaremanagement.co.uk"}`,
          siteUrl: baseUrl,
          appUrl: config.app_url || Deno.env.get("APP_URL") || baseUrl,
          staffPortalUrl: config.staff_portal_url || Deno.env.get("STAFF_PORTAL_URL") || `${baseUrl}/staffportal`,
          clientPortalUrl: config.client_portal_url || Deno.env.get("CLIENT_PORTAL_URL") || `${baseUrl}/ClientPortal`,
          adminDashboardUrl: config.admin_dashboard_url || Deno.env.get("ADMIN_DASHBOARD_URL") || `${baseUrl}/Dashboard`,
          portalUrl: config.portal_url || Deno.env.get("PORTAL_URL") || `${baseUrl}/portal`, // DEPRECATED
          fromDomain: config.from_domain || Deno.env.get("RESEND_FROM_DOMAIN") || "agilecaremanagement.co.uk",
          logoUrl: config.logo_url,
          primaryColor: config.primary_color || "#667eea",
          secondaryColor: config.secondary_color || "#764ba2",
          enableWhiteLabel: config.enable_white_label || false
        };
      }
    } catch (err: any) {
      console.warn(`⚠️ Could not fetch branding for agency ${agencyId}:`, err.message);
      // Fall through to SaaS defaults below
    }
  }

  // Return SaaS-level defaults (from environment variables)
  return getSaaSDefaults();
}

/**
 * Get SaaS-level default branding (from environment variables)
 * Used when no agency-specific branding exists
 */
export function getSaaSDefaults(): Branding {
  const fromDomain = Deno.env.get("RESEND_FROM_DOMAIN") || "agilecaremanagement.co.uk";
  const baseUrl = Deno.env.get("SITE_URL") || "https://agilecaremanagement.co.uk";

  return {
    saasName: Deno.env.get("SAAS_NAME") || "ACG StaffLink",
    companyName: Deno.env.get("SAAS_COMPANY_NAME") || "Agile Care Management",
    supportEmail: Deno.env.get("SAAS_SUPPORT_EMAIL") || "support@agilecaremanagement.co.uk",
    supportPhone: Deno.env.get("SAAS_SUPPORT_PHONE") || "+44 20 1234 5678",
    noreplyEmail: Deno.env.get("SAAS_NOREPLY_EMAIL") || `noreply@${fromDomain}`,
    siteUrl: baseUrl,
    appUrl: Deno.env.get("APP_URL") || baseUrl,
    staffPortalUrl: Deno.env.get("STAFF_PORTAL_URL") || `${baseUrl}/staffportal`,
    clientPortalUrl: Deno.env.get("CLIENT_PORTAL_URL") || `${baseUrl}/ClientPortal`,
    adminDashboardUrl: Deno.env.get("ADMIN_DASHBOARD_URL") || `${baseUrl}/Dashboard`,
    portalUrl: Deno.env.get("PORTAL_URL") || `${baseUrl}/portal`, // DEPRECATED
    fromDomain: fromDomain,
    primaryColor: "#667eea",
    secondaryColor: "#764ba2",
    enableWhiteLabel: false
  };
}

/**
 * Helper: Get email sender name and address
 *
 * @param branding - Branding configuration
 * @param customFromName - Optional custom from name (e.g., agency name)
 * @returns Object with from and from_name for email services
 */
export function getEmailFrom(branding: Branding, customFromName?: string) {
  const fromName = customFromName || branding.saasName;
  const fromEmail = `${branding.noreplyEmail}`;

  return {
    from: `${fromName} <${fromEmail}>`,
    from_name: fromName
  };
}

/**
 * Helper: Get email footer HTML
 *
 * @param branding - Branding configuration
 * @param includeUnsubscribe - Include unsubscribe link
 * @param unsubscribeEmail - User email for unsubscribe link
 * @returns HTML footer string
 */
export function getEmailFooter(
  branding: Branding,
  includeUnsubscribe = false,
  unsubscribeEmail?: string
): string {
  const currentYear = new Date().getFullYear();
  const poweredBy = branding.enableWhiteLabel ? '' : `<p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 12px;">Powered by ${branding.saasName}</p>`;

  let footer = `
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="margin: 0; color: #6b7280; font-size: 12px;">
        © ${currentYear} ${branding.companyName}. All rights reserved.
      </p>
      ${poweredBy}
      <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 12px;">
        <a href="mailto:${branding.supportEmail}" style="color: #0891b2; text-decoration: none;">Contact Support</a>
      </p>
  `;

  if (includeUnsubscribe && unsubscribeEmail) {
    footer += `
      <p style="margin: 10px 0 0 0; color: #9ca3af; font-size: 11px;">
        <a href="${branding.siteUrl}/unsubscribe?email=${encodeURIComponent(unsubscribeEmail)}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
      </p>
    `;
  }

  footer += `</div>`;

  return footer;
}

/**
 * Helper: Get WhatsApp message footer
 *
 * @param branding - Branding configuration
 * @returns WhatsApp message footer text
 */
export function getWhatsAppFooter(branding: Branding): string {
  const poweredBy = branding.enableWhiteLabel ? '' : `\n_Powered by ${branding.saasName}_`;

  return `
---
📞 Need help? ${branding.supportPhone}
📧 Email: ${branding.supportEmail}${poweredBy}
  `.trim();
}

/**
 * Helper: Get SMS message footer
 *
 * @param branding - Branding configuration
 * @returns SMS message footer text
 */
export function getSMSFooter(branding: Branding): string {
  const poweredBy = branding.enableWhiteLabel ? '' : ` via ${branding.saasName}`;

  return `\n\nNeed help? ${branding.supportPhone}${poweredBy}`;
}
