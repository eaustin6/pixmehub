import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const backupDatabase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Verify caller is a super_admin
    const { data: roles, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (roleErr) throw new Error(roleErr.message);
    const isAdmin = (roles ?? []).some((r) => r.role === "super_admin");
    if (!isAdmin) throw new Error("Forbidden");

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

    // Return as a serialized JSON string so the RPC payload is fully serializable.
    return { json: JSON.stringify(dump, null, 2) };
  });
