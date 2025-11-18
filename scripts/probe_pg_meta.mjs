const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

const res = await fetch(`${url}/rest/v1/pg_meta/tables`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});

console.log(res.status);
console.log(await res.text());







