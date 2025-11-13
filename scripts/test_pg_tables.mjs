const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error("Missing env vars");
  process.exit(1);
}

const res = await fetch(`${url.replace('https://', 'https://pg.')}/rest/v1/tables`, {
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
  },
});

console.log(res.status);
console.log(await res.text());

