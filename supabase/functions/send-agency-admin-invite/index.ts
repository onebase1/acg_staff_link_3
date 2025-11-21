import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0?dts";

type InvitePayload = {
  agencyId: string;
  inviteToken?: string;
  adminEmail: string;
  adminName?: string;
  agencyName?: string;
  redirectPath?: string;
  bankSummary?: {
    name?: string | null;
    account?: string | null;
    sortCode?: string | null;
    bankName?: string | null;
  };
};

const RESEND_API_URL = "https://api.resend.com/emails";

const REQUIRED_ENV = ["SUPABASE_URL", "RESEND_API_KEY"];

for (const key of REQUIRED_ENV) {
  if (!Deno.env.get(key)) {
    console.warn(`[send-agency-admin-invite] Missing environment variable: ${key}`);
  }
}

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? ""
);

function normaliseEmail(email: string | undefined) {
  return (email ?? "").trim().toLowerCase();
}

function resolveSiteUrl(request: Request, payload?: InvitePayload) {
  const explicit = Deno.env.get("PUBLIC_SITE_URL") ?? Deno.env.get("SITE_URL");
  if (explicit) return explicit.replace(/\/$/, "");
  const headerOrigin = request.headers.get("origin");
  if (headerOrigin) return headerOrigin.replace(/\/$/, "");
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const url = new URL(referer);
      url.hash = "";
      url.search = "";
      return `${url.origin}`;
    } catch {
      // ignore
    }
  }
  // fallback to agency-specific redirect path if provided later
  return "https://agilecaremanagement.co.uk";
}

function buildInviteEmail({
  adminEmail,
  adminName,
  agencyName,
  actionLink,
  siteUrl,
  bankSummary,
}: {
  adminEmail: string;
  adminName?: string;
  agencyName?: string;
  actionLink: string;
  siteUrl: string;
  bankSummary?: InvitePayload["bankSummary"];
}) {
  const safeName = adminName ?? "Agency Admin";
  const safeAgency = agencyName ?? "your agency";
  const bankDetailsSection = bankSummary?.name || bankSummary?.account || bankSummary?.sortCode || bankSummary?.bankName
    ? `
        <div style="margin-top:24px;padding:16px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;">
          <p style="margin:0 0 8px 0;font-weight:bold;color:#0f172a;">Current invoice bank details on file:</p>
          <ul style="list-style:none;padding:0;margin:0;color:#334155;font-size:13px;">
            ${bankSummary?.name ? `<li><strong>Account Holder:</strong> ${bankSummary.name}</li>` : ""}
            ${bankSummary?.bankName ? `<li><strong>Bank:</strong> ${bankSummary.bankName}</li>` : ""}
            ${bankSummary?.account ? `<li><strong>Account Number:</strong> ${bankSummary.account}</li>` : ""}
            ${bankSummary?.sortCode ? `<li><strong>Sort Code:</strong> ${bankSummary.sortCode}</li>` : ""}
          </ul>
          <p style="margin-top:12px;font-size:12px;color:#64748b;">You can update these at any time under Agency Settings once signed in.</p>
        </div>
      `
    : "";

  return {
    subject: `Activate your Agile Care Management access for ${safeAgency}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 600;">Welcome to Agile Care Management</h1>
        </div>

        <!-- Body -->
        <div style="background: #fff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px; color: #1f2937; margin-bottom: 20px;">Hi ${safeName},</p>
          <p style="font-size: 16px; color: #1f2937; line-height: 1.6; margin-bottom: 25px;">
            You have been invited to manage <strong>${safeAgency}</strong> on the Agile Care Management platform.
          </p>
          <p style="font-size: 16px; color: #1f2937; line-height: 1.6; margin-bottom: 30px;">
            To get started, please secure your account by setting a password:
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${actionLink}" style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Set Your Password
            </a>
          </div>

          <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 25px 0;">
            This link is unique to you and will expire shortly for security reasons. If it expires, the super admin can resend a fresh invite anytime.
          </p>

          ${bankDetailsSection ? `<hr style="border:none;border-top:1px solid #e2e8f0;margin:30px 0;" />` : ''}
          ${bankDetailsSection}

          <!-- Security Notice -->
          <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 25px 0; border-radius: 8px;">
            <p style="margin: 0; font-size: 13px; color: #0c4a6e; line-height: 1.6;">
              <strong>Security Notice:</strong> If you did not expect this invitation, please contact the platform owner immediately or ignore this email.
            </p>
          </div>

          <!-- Help Section -->
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #374151; font-weight: bold;">
              📞 Need Help?
            </p>
            <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
              Visit <a href="${siteUrl}" style="color: #0284c7; text-decoration: none;">Agile Care Management</a> or contact us at
              <a href="mailto:support@agilecaremanagement.co.uk" style="color: #0284c7; text-decoration: none;">support@agilecaremanagement.co.uk</a>
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #1e293b; color: #94a3b8; padding: 25px 30px; text-align: center; border-radius: 0 0 10px 10px;">
          <p style="margin: 0; font-size: 13px;">© 2025 Agile Care Management. All rights reserved.</p>
          <p style="margin: 10px 0 0 0; font-size: 12px;">
            Need help? Contact us at <a href="mailto:support@agilecaremanagement.co.uk" style="color: #06b6d4; text-decoration: none;">support@agilecaremanagement.co.uk</a>
          </p>
        </div>
      </div>
    `,
  };
}

async function ensureAuthUser(email: string, metadata: Record<string, unknown>) {
  const response = await supabaseAdmin.auth.admin.getUserByEmail(email);
  if (response.error && response.error.status !== 404) {
    throw response.error;
  }

  if (!response.data?.user) {
    const created = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: metadata,
    });
    if (created.error) {
      throw created.error;
    }
    return created.data.user;
  }

  // Update metadata to ensure latest agency mapping
  const update = await supabaseAdmin.auth.admin.updateUserById(response.data.user.id, {
    user_metadata: { ...response.data.user.user_metadata, ...metadata },
  });
  if (update.error) {
    throw update.error;
  }
  return update.data.user;
}

async function generateRecoveryLink(email: string, redirectUrl: string) {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: redirectUrl },
  });

  if (error || !data) {
    throw error ?? new Error("Failed to generate recovery link");
  }

  return data.action_link;
}

async function sendEmail(to: string, subject: string, html: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const from =
    Deno.env.get("RESEND_DEFAULT_FROM") ?? "noreply@agilecaremanagement.co.uk";

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Resend API error: ${response.status} ${text}`);
  }

  return response.json();
}

export default async function handler(
  request: Request
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: InvitePayload;
  try {
    payload = await request.json();
  } catch (error) {
    console.error("[send-agency-admin-invite] Invalid JSON payload", error);
    return new Response("Invalid JSON body", { status: 400 });
  }

  const adminEmail = normaliseEmail(payload.adminEmail);
  if (!payload.agencyId || !adminEmail) {
    return new Response("Missing required fields", { status: 400 });
  }

  const siteUrl = resolveSiteUrl(request, payload);
  const redirectPath = payload.redirectPath ?? "/reset-password";
  const redirectUrl = `${siteUrl}${redirectPath}`;

  try {
    const user = await ensureAuthUser(adminEmail, {
      invited_role: "agency_admin",
      invited_agency_id: payload.agencyId,
      agency_name: payload.agencyName ?? null,
    });

    const actionLink = await generateRecoveryLink(adminEmail, redirectUrl);
    const { subject, html } = buildInviteEmail({
      adminEmail,
      adminName: payload.adminName,
      agencyName: payload.agencyName,
      actionLink,
      siteUrl,
      bankSummary: payload.bankSummary,
    });

    await sendEmail(adminEmail, subject, html);

    return new Response(
      JSON.stringify({
        success: true,
        userId: user.id,
        actionLink,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[send-agency-admin-invite] Failure", error);
    const status = typeof error?.status === "number" ? error.status : 500;
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message ?? "Unexpected error",
      }),
      {
        status,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

