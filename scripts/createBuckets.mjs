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

const buckets = [
  "documents",
  "profile-photos",
  "compliance-docs",
  "timesheet-docs",
];

for (const bucket of buckets) {
  const { error } = await supabase.storage.createBucket(bucket, {
    public: false,
  });

  if (error && !/exists/i.test(error.message)) {
    console.error(`Failed to create bucket ${bucket}:`, error.message);
    process.exit(1);
  }

  if (!error) {
    console.log(`Created bucket ${bucket}`);
  } else {
    console.log(`Bucket ${bucket} already exists`);
  }
}

console.log("Bucket check complete.");

