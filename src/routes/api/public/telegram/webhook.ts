import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";

const CHANNEL_ID = "-1002192228589";
const TG_API = "https://api.telegram.org";

function deriveSecret(token: string): string {
  return createHash("sha256")
    .update(`telegram-webhook:${token}`)
    .digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

const START_MESSAGE = `Hi bot is live ❤️`;

async function tgSend(token: string, chatId: number, text: string) {
  await fetch(`${TG_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
}

async function isChannelAdmin(token: string, userId: number): Promise<boolean> {
  try {
    const res = await fetch(`${TG_API}/bot${token}/getChatMember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHANNEL_ID, user_id: userId }),
    });
    const j = (await res.json()) as { ok: boolean; result?: { status: string } };
    if (!j.ok || !j.result) return false;
    return j.result.status === "creator" || j.result.status === "administrator";
  } catch {
    return false;
  }
}

async function sendBackup(token: string, chatId: number) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [images, profiles, roles] = await Promise.all([
    supabaseAdmin.from("images").select("*"),
    supabaseAdmin.from("profiles").select("*"),
    supabaseAdmin.from("user_roles").select("*"),
  ]);
  const dump = {
    v: 1,
    exported_at: new Date().toISOString(),
    counts: {
      images: images.data?.length ?? 0,
      profiles: profiles.data?.length ?? 0,
      user_roles: roles.data?.length ?? 0,
    },
    images: images.data ?? [],
    profiles: profiles.data ?? [],
    user_roles: roles.data ?? [],
  };
  const json = JSON.stringify(dump, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fd = new FormData();
  fd.append("chat_id", String(chatId));
  fd.append("document", blob, `pixmehub-backup-${stamp}.json`);
  fd.append(
    "caption",
    `Backup • images:${dump.counts.images} profiles:${dump.counts.profiles} roles:${dump.counts.user_roles}`,
  );
  await fetch(`${TG_API}/bot${token}/sendDocument`, { method: "POST", body: fd });

  // Also mirror a copy into the storage channel for safekeeping.
  const fd2 = new FormData();
  fd2.append("chat_id", CHANNEL_ID);
  fd2.append("document", blob, `pixmehub-backup-${stamp}.json`);
  fd2.append("caption", `Auto backup ${stamp}`);
  fd2.append("disable_notification", "true");
  await fetch(`${TG_API}/bot${token}/sendDocument`, { method: "POST", body: fd2 });
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) {
          return new Response("Server not configured", { status: 500 });
        }

        const expectedSecret = deriveSecret(token);
        const actualSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEqual(actualSecret, expectedSecret)) {
          return new Response("Unauthorized", { status: 401 });
        }

        type TgUser = { id: number };
        type TgMessage = { chat: { id: number }; from?: TgUser; text?: string };
        const update = (await request.json()) as {
          update_id: number;
          message?: TgMessage;
          edited_message?: TgMessage;
        };
        const message = update.message ?? update.edited_message;
        if (!message?.chat?.id || typeof update.update_id !== "number") {
          return Response.json({ ok: true, ignored: true });
        }

        const text = String(message.text ?? "").trim();
        const chatId = message.chat.id;
        const cmd = text.split(/\s+/)[0]?.toLowerCase().split("@")[0];

        if (cmd === "/start") {
          await tgSend(token, chatId, START_MESSAGE);
        } else if (cmd === "/backup") {
          const fromId = message.from?.id;
          if (!fromId || !(await isChannelAdmin(token, fromId))) {
            await tgSend(token, chatId, "⛔ Only storage-channel admins can run /backup.");
          } else {
            await tgSend(token, chatId, "📦 Generating backup…");
            try {
              await sendBackup(token, chatId);
            } catch (e) {
              await tgSend(token, chatId, `❌ Backup failed: ${(e as Error).message}`);
            }
          }
        } else if (cmd === "/help") {
          await tgSend(
            token,
            chatId,
            "Commands:\n/start – ping\n/backup – export DB as JSON (channel admins only)",
          );
        }

        return Response.json({ ok: true });
      },
    },
  },
});
