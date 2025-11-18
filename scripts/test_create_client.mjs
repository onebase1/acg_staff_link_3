import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const agencyId = "c8e84c94-8233-4084-b4c3-63ad9dc81c16";

const payload = {
  agency_id: agencyId,
  name: "Divine Care Center QA",
  type: "care_home",
  status: "active",
  contact_person: {
    name: "Zara Abdulai",
    email: "g.basera5+divine@gmail.com",
  },
  billing_email: "billing@divine-care.test",
  address: {
    line1: "123 Care Road",
    city: "London",
    postcode: "EC1A 1AA",
    country: "United Kingdom",
  },
  internal_locations: ["Room 1", "Room 2"],
  payment_terms: { type: "net", days: 30 },
  contract_terms: {
    contract_received: true,
    contract_received_date: new Date().toISOString().split("T")[0],
    contract_received_by: "c6e0473a-3516-48f7-9737-48dd47c6b4e3",
    contract_start_date: "2025-10-01",
    require_location_specification: true,
    rates_by_role: {
      nurse: {
        charge_rate: 45,
        pay_rate: 28,
      },
    },
    advanced_rate_card: { enabled: false },
  },
};

const { data, error } = await supabase
  .from("clients")
  .insert(payload)
  .select("id");

if (error) {
  console.error("Insert failed:", error);
  process.exit(1);
}

console.log("Client created:", data);







