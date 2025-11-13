import { createClient } from "@supabase/supabase-js";

const requiredEnv = ["VITE_SUPABASE_URL", "SUPABASE_SERVICE_KEY"];
const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length) {
  console.error("Missing environment variables:", missing.join(", "));
  process.exit(1);
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const agencyPayload = {
  name: "Dominion Healthcare Services Ltd",
  email: "ops@dominion-healthcare.co.uk",
  phone: "+44 20 7123 4567",
  vat_number: "GB123456789",
  company_number: "09876543",
  address: {
    line1: "1 Dominion Way",
    line2: "Suite 5",
    city: "London",
    postcode: "EC1A 1AA",
    country: "United Kingdom",
  },
  bank_details: {
    account_name: "Dominion Healthcare Services Ltd",
    bank_name: "NatWest",
    account_number: "12121212",
    sort_code: "01-09-31",
  },
  billing_email: "billing@dominion-healthcare.co.uk",
  payment_terms_days: 30,
  invoice_frequency: "weekly",
  status: "active",
};

const admin = {
  email: "info@guest-glow.com",
  fullName: "Dominion Agency Admin",
  phone: "+44 20 7123 4567",
  tempPassword: "Dominion#2025",
};

async function ensureAgency() {
  const { data: existing, error: fetchError } = await supabase
    .from("agencies")
    .select("id")
    .eq("email", agencyPayload.email)
    .maybeSingle();

  if (fetchError) {
    console.error("Failed to query agencies:", fetchError.message);
    process.exit(1);
  }

  if (existing?.id) {
    console.log("Agency already exists:", existing.id);
    return existing.id;
  }

  const { data, error } = await supabase
    .from("agencies")
    .insert({
      ...agencyPayload,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to insert agency:", error.message);
    process.exit(1);
  }

  console.log("Created agency:", data.id);
  return data.id;
}

async function fetchAuthUserByEmail(email) {
  const response = await fetch(
    `${process.env.VITE_SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(
      email
    )}`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) return null;
    const text = await response.text();
    console.error("Failed to fetch auth user:", response.status, text);
    process.exit(1);
  }

  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }
  return data[0];
}

async function ensureAuthUser(agencyId) {
  const { data: created, error } = await supabase.auth.admin.createUser({
    email: admin.email,
    password: admin.tempPassword,
    email_confirm: true,
    user_metadata: {
      user_type: "agency_admin",
      agency_id: agencyId,
      full_name: admin.fullName,
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      const { data: existingProfile, error: profileFetchError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", admin.email)
        .maybeSingle();

      if (profileFetchError) {
        console.error(
          "User already exists but failed to fetch profile:",
          profileFetchError.message
        );
        process.exit(1);
      }

      if (existingProfile?.id) {
        console.log("Auth user already exists:", existingProfile.id);
        return existingProfile.id;
      }
    }
    console.error("Failed to create auth user:", error.message);
    process.exit(1);
  }

  console.log("Created auth user:", created.user.id);
  return created.user.id;
}

async function ensureProfile(userId, agencyId) {
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    email: admin.email,
    full_name: admin.fullName,
    user_type: "agency_admin",
    phone: admin.phone,
    agency_id: agencyId,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Failed to upsert profile:", error.message);
    process.exit(1);
  }

  console.log("Profile upserted for user:", userId);
}

(async () => {
  const agencyId = await ensureAgency();
  const userId = await ensureAuthUser(agencyId);
  await ensureProfile(userId, agencyId);
  console.log("Dominion agency setup complete.");
  console.log("Agency ID:", agencyId);
  console.log("Admin email:", admin.email);
  console.log("Temporary password:", admin.tempPassword);
})();

