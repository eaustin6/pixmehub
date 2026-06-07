import { createFileRoute } from "@tanstack/react-router";

// Private Telegram channel that backs image storage. Bot must be admin with "Post messages".
const CHANNEL_ID = "-1002192228589";
const MAX_BYTES = 50 * 1024 * 1024;

export const Route = createFileRoute("/api/public/tg-upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) {
          return Response.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 500 });
        }

        const auth = request.headers.get("authorization") ?? "";
        const bearer = auth.replace(/^Bearer\s+/i, "");
        if (!bearer) return Response.json({ error: "Unauthorized" }, { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: u, error: uErr } = await supabaseAdmin.auth.getUser(bearer);
        if (uErr || !u.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const userId = u.user.id;

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
        const isPublic = (form.get("is_public") as string | null) === "true";
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
          result?: {
            message_id: number;
            document?: { file_id: string };
            photo?: Array<{ file_id: string }>;
            video?: { file_id: string };
            animation?: { file_id: string };
          };
        };

        if (!tgJson.ok || !tgJson.result) {
          return Response.json(
            { error: `Telegram: ${tgJson.description ?? "unknown error"}` },
            { status: 502 },
          );
        }

        const fileId =
          tgJson.result.document?.file_id ??
          tgJson.result.video?.file_id ??
          tgJson.result.animation?.file_id ??
          tgJson.result.photo?.[tgJson.result.photo.length - 1]?.file_id;

        if (!fileId) {
          return Response.json({ error: "Telegram returned no file_id" }, { status: 502 });
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
