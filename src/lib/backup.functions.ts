import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertSuperAdmin(ctx: { supabase: any; userId: string }) {
  const { data: roles, error } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId);
  if (error) throw new Error(error.message);
  const ok = (roles ?? []).some((r: { role: string }) => r.role === "super_admin");
  if (!ok) throw new Error("Forbidden");
}

export const backupDatabase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tableNames = ["images", "profiles", "user_roles"] as const;
    const tables: Record<string, unknown[]> = {};
    for (const t of tableNames) {
      const { data, error } = await supabaseAdmin.from(t).select("*");
      if (error) throw new Error(`${t}: ${error.message}`);
      tables[t] = (data ?? []) as unknown[];
    }

    const { data: objects, error: storageErr } = await supabaseAdmin.storage
      .from("images")
      .list("", { limit: 1000, sortBy: { column: "created_at", order: "asc" } });

    const dump = {
      exported_at: new Date().toISOString(),
      version: 1,
      tables,
      storage_images: storageErr ? [] : (objects ?? []),
      storage_error: storageErr?.message ?? null,
    };

    return { json: JSON.stringify(dump, null, 2) };
  });

export const restoreDatabase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { json: string }) => {
    if (!data || typeof data.json !== "string") throw new Error("Invalid payload");
    if (data.json.length > 25_000_000) throw new Error("Backup too large");
    return data;
  })
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let dump: any;
    try {
      dump = JSON.parse(data.json);
    } catch {
      throw new Error("Backup file is not valid JSON");
    }
    if (!dump || typeof dump !== "object" || !dump.tables) {
      throw new Error("Backup file is missing 'tables'");
    }

    const order = ["profiles", "user_roles", "images"] as const;
    const counts: Record<string, number> = {};
    for (const t of order) {
      const rows = Array.isArray(dump.tables[t]) ? dump.tables[t] : [];
      if (rows.length === 0) {
        counts[t] = 0;
        continue;
      }
      const { error } = await supabaseAdmin.from(t).upsert(rows, { onConflict: "id" });
      if (error) throw new Error(`${t}: ${error.message}`);
      counts[t] = rows.length;
    }

    return { ok: true, counts };
  });
