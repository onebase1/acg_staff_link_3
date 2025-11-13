/**
 * 📧 STANDARDIZED EMAIL TEMPLATES
 * 
 * Single source of truth for all email designs
 * ✅ Works on light AND dark themes (Gmail, Outlook, Apple Mail)
 * ✅ Mobile responsive
 * ✅ Professional healthcare branding
 * ✅ Consistent across all notification types
 */

export const EmailTemplates = {
  /**
   * Base wrapper for all emails
   * CRITICAL: Uses safe colors that work on both light/dark themes
   */
  baseWrapper: ({ children, agencyName, agencyLogo }) => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light dark">
      <meta name="supported-color-schemes" content="light dark">
      <title>${agencyName || 'ACG StaffLink'}</title>
      <style>
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .email-body { background: #1e293b !important; }
          .email-card { background: #334155 !important; color: #f1f5f9 !important; }
          .text-gray-900 { color: #f1f5f9 !important; }
          .text-gray-600 { color: #cbd5e1 !important; }
          .bg-gray-50 { background: #1e293b !important; }
        }
      </style>
    </head>
    <body class="email-body" style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 20px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" class="email-card" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              ${children}
            </table>
            
            <!-- Footer -->
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; margin-top: 20px;">
              <tr>
                <td style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
                  <p style="margin: 0 0 10px 0;">© ${new Date().getFullYear()} ${agencyName || 'ACG StaffLink'}. All rights reserved.</p>
                  <p style="margin: 0; color: #9ca3af;">Powered by ACG StaffLink</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `,

  /**
   * Header section with logo and title
   */
  header: ({ title, subtitle, bgColor = '#06b6d4', agencyLogo }) => `
    <tr>
      <td style="background: linear-gradient(135deg, ${bgColor} 0%, #0284c7 100%); padding: 40px 30px; text-align: center;">
        ${agencyLogo ? `
          <img src="${agencyLogo}" alt="Logo" style="max-height: 60px; margin-bottom: 20px; display: block; margin-left: auto; margin-right: auto;" />
        ` : ''}
        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          ${title}
        </h1>
        ${subtitle ? `
          <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">
            ${subtitle}
          </p>
        ` : ''}
      </td>
    </tr>
  `,

  /**
   * Content section
   */
  content: ({ greeting, body }) => `
    <tr>
      <td style="padding: 40px 30px;">
        ${greeting ? `
          <p style="font-size: 16px; color: #111827; margin: 0 0 20px 0; font-weight: 500;">
            ${greeting}
          </p>
        ` : ''}
        ${body}
      </td>
    </tr>
  `,

  /**
   * Info card (for shift details, etc.)
   */
  infoCard: ({ title, items, borderColor = '#06b6d4' }) => `
    <div style="background-color: #f9fafb; border-left: 4px solid ${borderColor}; padding: 20px; margin: 20px 0; border-radius: 8px;">
      ${title ? `
        <h2 style="margin: 0 0 15px 0; color: #111827; font-size: 18px; font-weight: 600;">
          ${title}
        </h2>
      ` : ''}
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${items.map(item => `
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 40%; font-weight: 500;">
              ${item.label}
            </td>
            <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">
              ${item.value}
            </td>
          </tr>
        `).join('')}
      </table>
    </div>
  `,

  /**
   * Alert box (warnings, important notes)
   */
  alertBox: ({ type = 'info', title, message }) => {
    const styles = {
      info: { bg: '#dbeafe', border: '#3b82f6', icon: 'ℹ️' },
      warning: { bg: '#fef3c7', border: '#f59e0b', icon: '⚠️' },
      success: { bg: '#d1fae5', border: '#10b981', icon: '✅' },
      error: { bg: '#fee2e2', border: '#ef4444', icon: '❌' }
    };
    const style = styles[type] || styles.info;

    return `
      <div style="background-color: ${style.bg}; border-left: 4px solid ${style.border}; padding: 16px; margin: 20px 0; border-radius: 8px;">
        <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">
          ${style.icon} ${title}
        </p>
        ${message ? `
          <p style="margin: 10px 0 0 0; color: #374151; font-size: 13px; line-height: 1.6;">
            ${message}
          </p>
        ` : ''}
      </div>
    `;
  },

  /**
   * Call-to-action button
   */
  button: ({ text, url, bgColor = '#06b6d4' }) => `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${url}" style="display: inline-block; background: ${bgColor}; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);">
        ${text}
      </a>
    </div>
  `,

  /**
   * List of items (bullet points)
   */
  bulletList: ({ items }) => `
    <ul style="margin: 20px 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
      ${items.map(item => `<li style="margin: 8px 0;">${item}</li>`).join('')}
    </ul>
  `
};

export default EmailTemplates;