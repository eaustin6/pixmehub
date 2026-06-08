import { createFileRoute } from "@tanstack/react-router";

// Private Telegram channel that backs image storage. Bot must be admin with "Post messages".
const CHANNEL_ID = "-1002192228589";
const MAX_BYTES = 50 * 1024 * 1024;

export const Route = createFileRoute("/api/public/tg-upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { pickBot } = await import("@/lib/telegram-bots.server");
        const bot = pickBot();
        if (!bot) {
          return Response.json({ error: "No TELEGRAM_BOT_TOKEN configured" }, { status: 500 });
        }
        const token = bot.token;

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
          return Response.json({ error: "Invalid form data" }, { status: 400 });
        }

        const file = form.get("file");
        if (!(file instanceof File)) {
          return Response.json({ error: "Missing file" }, { status: 400 });
        }
        if (file.size === 0) {
          return Response.json({ error: "Empty file" }, { status: 400 });
        }
        if (file.size > MAX_BYTES) {
          return Response.json({ error: `File exceeds ${MAX_BYTES / 1024 / 1024} MB limit` }, { status: 413 });
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
          return Response.json(
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
          return Response.json(
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
          return Response.json({ error: insErr?.message ?? "Insert failed" }, { status: 500 });
        }

        return Response.json({ id: row.id, file_id: fileId });
      },
    },
  },
});
