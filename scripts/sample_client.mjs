import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const { data, error } = await supabase
  .from("clients")
  .select("*")
  .limit(1);

if (error) {
  console.error(error);
  process.exit(1);
}

console.log(JSON.stringify(data, null, 2));






