import { createClient } from "@supabase/supabase-js";

const requiredEnv = ["VITE_SUPABASE_URL", "SUPABASE_SERVICE_KEY"];
const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length) {
  console.error("Missing environment variables:", missing.join(", "));
  process.exit(1);
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const sql = process.argv.slice(2).join(" ");

if (!sql) {
  console.error("Usage: node scripts/runSql.mjs \"<SQL STATEMENT>\"");
  process.exit(1);
}

const { data, error } = await supabase.rpc("sql", { query: sql });

if (error) {
  console.error("SQL error:", error.message);
  process.exit(1);
}

console.log("SQL executed successfully:", data);






