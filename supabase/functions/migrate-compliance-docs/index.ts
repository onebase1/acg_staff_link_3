import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// migrate-compliance-docs
// Safe, batchable helper to move compliance files from the legacy
// `documents` bucket into the dedicated `compliance-docs` bucket.

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const batchSize = Number.isFinite(Number(limitParam)) && Number(limitParam) > 0
    ? Math.min(Number(limitParam), 200)
    : 50;

  try {
    console.log("🚚 [migrate-compliance-docs] Starting batch...", { batchSize });

    const { data: records, error: fetchError } = await supabase
      .from("compliance")
      .select("id, document_url")
      .like("document_url", "%/documents/%")
      .order("created_date", { ascending: true })
      .limit(batchSize);

    if (fetchError) throw fetchError;

    if (!records || records.length === 0) {
      return new Response(
        JSON.stringify({ message: "No legacy documents found", migrated: 0 }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const record of records) {
      if (!record.document_url || typeof record.document_url !== "string") {
        results.push({ id: String(record.id), status: "skipped", error: "missing document_url" });
        continue;
      }

      try {
        const parts = record.document_url.split("/documents/");
        if (parts.length !== 2 || !parts[1]) {
          results.push({ id: String(record.id), status: "skipped", error: "could not parse path" });
          continue;
        }

        const path = parts[1];

        // Download from legacy bucket
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("documents")
          .download(path);

        if (downloadError || !fileData) {
          results.push({
            id: String(record.id),
            status: "error",
            error: `download failed: ${downloadError?.message ?? "unknown"}`,
          });
          continue;
        }

        // Upload to new bucket (idempotent via upsert)
        const { error: uploadError } = await supabase.storage
          .from("compliance-docs")
          .upload(path, fileData, { upsert: true });

        if (uploadError) {
          results.push({
            id: String(record.id),
            status: "error",
            error: `upload failed: ${uploadError.message}`,
          });
          continue;
        }

        // Store the storage path on the compliance record; viewing uses signed URLs
        const newDocumentUrl = path;

        const { error: updateError } = await supabase
          .from("compliance")
          .update({ document_url: newDocumentUrl })
          .eq("id", record.id);

        if (updateError) {
          results.push({
            id: String(record.id),
            status: "error",
            error: `update failed: ${updateError.message}`,
          });
          continue;
        }

        results.push({ id: String(record.id), status: "migrated" });
      } catch (err) {
        results.push({
          id: String(record.id),
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const migratedCount = results.filter((r) => r.status === "migrated").length;

    return new Response(
      JSON.stringify({ migrated: migratedCount, batchSize, results }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("❌ [migrate-compliance-docs] Unexpected error", err);
    return new Response(
      JSON.stringify({
        error: "Unexpected error during migration",
        details: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

