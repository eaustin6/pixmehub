import { createFileRoute } from "@tanstack/react-router";

// Private Telegram channel that backs image storage. Bot must be admin with "Post messages".
const CHANNEL_ID = "-1002192228589";
const MAX_BYTES = 50 * 1024 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/avif",
]);
const ALLOWED_ORIGIN_RE = /^https:\/\/([a-z0-9-]+\.)*lovable\.app$/i;

function corsHeaders(origin: string | null) {
  // Allow same-origin/lovable.app subdomains; fall back to no CORS (same-origin only).
  const allow = origin && ALLOWED_ORIGIN_RE.test(origin) ? origin : "";
  return {
    ...(allow ? { "Access-Control-Allow-Origin": allow } : {}),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  } as Record<string, string>;
}

function jsonWithCors(request: Request, body: unknown, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: {
      ...corsHeaders(request.headers.get("origin")),
      ...(init?.headers ?? {}),
    },
  });
}

export const Route = createFileRoute("/api/public/tg-upload")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        return new Response(null, {
          status: 204,
          headers: corsHeaders(request.headers.get("origin")),
        });
      },
      POST: async ({ request }) => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) {
          return jsonWithCors(request, { error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 500 });
        }

        const auth = request.headers.get("authorization") ?? "";
        const bearer = auth.replace(/^Bearer\s+/i, "");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let userId: string | null = null;
        if (bearer) {
          const { data: u, error: uErr } = await supabaseAdmin.auth.getUser(bearer);
          if (!uErr && u.user) userId = u.user.id;
        }

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return jsonWithCors(request, { error: "Invalid form data" }, { status: 400 });
        }

        const file = form.get("file");
        if (!(file instanceof File)) {
          return jsonWithCors(request, { error: "Missing file" }, { status: 400 });
        }
        if (file.size === 0) {
          return jsonWithCors(request, { error: "Empty file" }, { status: 400 });
        }
        if (file.size > MAX_BYTES) {
          return jsonWithCors(request, { error: `File exceeds ${MAX_BYTES / 1024 / 1024} MB limit` }, { status: 413 });
        }

        const title = ((form.get("title") as string | null) ?? "").slice(0, 200) || null;
        const tagsRaw = (form.get("tags") as string | null) ?? "[]";
        const isPublic = userId ? (form.get("is_public") as string | null) === "true" : true;
        const albumId = ((form.get("album_id") as string | null) || "").trim() || null;
        const albumTitle = ((form.get("album_title") as string | null) || "").trim() || null;
        const widthRaw = Number(form.get("width"));
        const heightRaw = Number(form.get("height"));
        const width = Number.isFinite(widthRaw) && widthRaw > 0 ? widthRaw : null;
        const height = Number.isFinite(heightRaw) && heightRaw > 0 ? heightRaw : null;

        let tags: string[] = [];
        try {
          const parsed = JSON.parse(tagsRaw);
          if (Array.isArray(parsed)) {
            tags = parsed.filter((t) => typeof t === "string").slice(0, 12);
          }
        } catch {
          /* ignore */
        }

        const tgForm = new FormData();
        tgForm.append("chat_id", CHANNEL_ID);
        tgForm.append("document", file, file.name || "upload.bin");
        if (title) tgForm.append("caption", title.slice(0, 1024));

        const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
          method: "POST",
          body: tgForm,
        });
        const tgJson = (await tgRes.json()) as {
          ok: boolean;
          description?: string;
          result?: Record<string, unknown> & { message_id: number };
        };

        if (!tgJson.ok || !tgJson.result) {
          return jsonWithCors(
            request,
            { error: `Telegram: ${tgJson.description ?? "unknown error"}` },
            { status: 502 },
          );
        }

        const findFileId = (obj: unknown): string | null => {
          if (!obj || typeof obj !== "object") return null;
          for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
            if (k === "file_id" && typeof v === "string") return v;
            if (Array.isArray(v)) {
              for (const item of v) {
                const found = findFileId(item);
                if (found) return found;
              }
            } else if (v && typeof v === "object") {
              const found = findFileId(v);
              if (found) return found;
            }
          }
          return null;
        };

        const fileId = findFileId(tgJson.result);

        if (!fileId) {
          console.error("[tg-upload] no file_id in result", JSON.stringify(tgJson.result));
          return jsonWithCors(
            request,
            { error: `Telegram returned no file_id. Keys: ${Object.keys(tgJson.result).join(",")}` },
            { status: 502 },
          );
        }

        const { data: row, error: insErr } = await supabaseAdmin
          .from("images")
          .insert({
            user_id: userId,
            telegram_file_id: fileId,
            telegram_message_id: tgJson.result.message_id,
            storage_path: null,
            title,
            width,
            height,
            size_bytes: file.size,
            mime_type: file.type || "application/octet-stream",
            is_public: isPublic,
            tags,
            album_id: albumId,
            album_title: albumTitle,
          })
          .select("id")
          .single();

        if (insErr || !row) {
          return jsonWithCors(request, { error: insErr?.message ?? "Insert failed" }, { status: 500 });
        }

        return jsonWithCors(request, { id: row.id, file_id: fileId });
      },
    },
  },
});
