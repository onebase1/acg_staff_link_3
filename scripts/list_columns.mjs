const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error("Set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY env vars first.");
  process.exit(1);
}

const table = process.argv[2];
if (!table) {
  console.error("Usage: node scripts/list_columns.mjs <table_name>");
  process.exit(1);
}

const endpoint = `${url}/rest/v1/information_schema.columns?table_schema=eq.public&table_name=eq.${table}&select=column_name,data_type,is_nullable`;

const res = await fetch(endpoint, {
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
  },
});

if (!res.ok) {
  console.error("Failed:", res.status, await res.text());
  process.exit(1);
}

const data = await res.json();
for (const col of data) {
  console.log(`${col.column_name} | ${col.data_type} | nullable: ${col.is_nullable}`);
}







