import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0?dts";

type AddAdminPayload = {
  agencyId: string;
  adminEmail: string;
  adminName?: string;
};

const REQUIRED_ENV = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

for (const key of REQUIRED_ENV) {
  if (!Deno.env.get(key)) {
    console.warn(`[add-additional-agency-admin] Missing environment variable: ${key}`);
  }
}

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? ""
);

function normaliseEmail(email: string | undefined) {
  return (email ?? "").trim().toLowerCase();
}

async function ensureAuthUser(email: string, metadata: Record<string, unknown>) {
  const response = await supabaseAdmin.auth.admin.getUserByEmail(email);
  if (response.error && response.error.status !== 404) {
    throw response.error;
  }

  if (!response.data?.user) {
    // Create new auth user
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

  // Update existing user metadata
  const update = await supabaseAdmin.auth.admin.updateUserById(response.data.user.id, {
    user_metadata: { ...response.data.user.user_metadata, ...metadata },
  });
  if (update.error) {
    throw update.error;
  }
  return update.data.user;
}

export default async function handler(
  request: Request
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: AddAdminPayload;
  try {
    payload = await request.json();
  } catch (error) {
    console.error("[add-additional-agency-admin] Invalid JSON payload", error);
    return new Response("Invalid JSON body", { status: 400 });
  }

  const adminEmail = normaliseEmail(payload.adminEmail);
  if (!payload.agencyId || !adminEmail) {
    return new Response("Missing required fields: agencyId and adminEmail", { status: 400 });
  }

  try {
    // Step 1: Verify agency exists
    const { data: agency, error: agencyError } = await supabaseAdmin
      .from("agencies")
      .select("id, name, bank_details")
      .eq("id", payload.agencyId)
      .single();

    if (agencyError || !agency) {
      return new Response("Agency not found", { status: 404 });
    }

    // Step 2: Create/update auth user with metadata
    const user = await ensureAuthUser(adminEmail, {
      invited_role: "agency_admin",
      invited_agency_id: payload.agencyId,
      full_name: payload.adminName ?? null,
    });

    console.log(`[add-additional-agency-admin] Auth user ensured: ${user.id}`);

    // Step 3: Create invitation record
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("agency_admin_invitations")
      .insert({
        agency_id: payload.agencyId,
        email: adminEmail,
        invited_by: null, // Set by RLS or caller
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select()
      .single();

    if (inviteError) {
      console.warn("[add-additional-agency-admin] Could not create invitation record:", inviteError);
    }

    // Step 4: Call send-agency-admin-invite to handle email delivery
    const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://agilecaremanagement.co.uk";
    const functionsUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");

    if (!functionsUrl || !serviceRoleKey) {
      throw new Error("Missing SUPABASE_URL or SERVICE_ROLE_KEY");
    }

    const bankSummary = agency.bank_details ? {
      name: agency.bank_details.account_name ?? null,
      account: agency.bank_details.account_number ?? null,
      sortCode: agency.bank_details.sort_code ?? null,
      bankName: agency.bank_details.bank_name ?? null,
    } : undefined;

    const emailResponse = await fetch(`${functionsUrl}/functions/v1/send-agency-admin-invite`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agencyId: payload.agencyId,
        adminEmail,
        adminName: payload.adminName,
        agencyName: agency.name,
        bankSummary,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("[add-additional-agency-admin] Email send failed:", errorText);
      throw new Error(`Failed to send invitation email: ${emailResponse.status}`);
    }

    const emailData = await emailResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        userId: user.id,
        agencyId: payload.agencyId,
        invitationId: invitation?.id,
        emailSent: emailData.success ?? true,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[add-additional-agency-admin] Failure", error);
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
