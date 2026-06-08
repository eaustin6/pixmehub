import { createFileRoute } from "@tanstack/react-router";

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  } as const;
}

export const Route = createFileRoute("/api/public/tg-image/$id")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        return new Response(null, {
          status: 204,
          headers: corsHeaders(request.headers.get("origin")),
        });
      },
      GET: async ({ params }) => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) {
          return new Response("Server not configured", {
            status: 500,
            headers: corsHeaders(null),
          });
        }

        const id = params.id;
        if (!id || !/^[0-9a-f-]{10,}$/i.test(id)) {
          return new Response("Bad request", {
            status: 400,
            headers: corsHeaders(null),
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row, error } = await supabaseAdmin
          .from("images")
          .select("telegram_file_id, mime_type")
          .eq("id", id)
          .maybeSingle();

        if (error || !row || !row.telegram_file_id) {
          return new Response("Not found", {
            status: 404,
            headers: corsHeaders(null),
          });
        }

        const gf = await fetch(
          `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(row.telegram_file_id)}`,
        );
        const gfJson = (await gf.json()) as { ok: boolean; result?: { file_path: string } };
        if (!gfJson.ok || !gfJson.result?.file_path) {
          return new Response("Telegram getFile failed", {
            status: 502,
            headers: corsHeaders(null),
          });
        }

        const fileRes = await fetch(
          `https://api.telegram.org/file/bot${token}/${gfJson.result.file_path}`,
        );
        if (!fileRes.ok || !fileRes.body) {
          return new Response("Telegram file fetch failed", {
            status: 502,
            headers: corsHeaders(null),
          });
        }

        return new Response(fileRes.body, {
          status: 200,
          headers: {
            ...corsHeaders(null),
            "Content-Type":
              row.mime_type ?? fileRes.headers.get("content-type") ?? "application/octet-stream",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
