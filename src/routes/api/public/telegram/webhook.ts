import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";

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

const START_MESSAGE = `<b>Welcome to Lumen (PixmeHub)</b> — a quiet place for images. 🌙

<b>How uploads work</b>
• Drop a single photo or up to 15 files at once.
• Each file can be up to 50 MB.
• Images are stored in a private Telegram channel, so capacity is unlimited.
• You get a short shareable link instantly.

<b>Anonymous vs Signed In</b>
• No account needed — upload anonymously (always public).
• Sign in with email/password or Google to create private uploads and manage albums.

<b>Albums</b>
• Multiple files automatically become an album with one link.
• Signed-in users can add more photos to an existing album later.

<b>Gallery & Sharing</b>
• Public images appear on the homepage gallery.
• Private images are visible only to you (or anyone with the direct link).
• Every image has a detail page with title, tags, dimensions, and file size.
• One-click download any image or an entire album.

<b>Admin & Moderation</b>
• A super admin control panel at <code>/admin</code> lets moderators hide, restore, or delete any image.
• Full JSON backup & restore of the database is built in.

<b>Security</b>
• Strict file-type allow-list (PNG, JPEG, WEBP, GIF, AVIF only).
• Input validation on every field (size limits, tag limits, title sanitisation).
• Row-Level Security (RLS) on the database so users can only touch their own data.
• Leaked-password protection via Have I Been Pwned.

<b>Tech stack</b>
• TanStack Start + React 19 + Tailwind v4 + shadcn/ui
• Supabase (Auth, Postgres, RLS)
• Telegram Bot API as the storage proxy

Website: https://pixmehub.lovable.app`;

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

        const update = (await request.json()) as Record<string, unknown>;
        const message = (update.message ?? update.edited_message) as Record<string, unknown> | undefined;
        if (!message?.chat?.id || typeof update.update_id !== "number") {
          return Response.json({ ok: true, ignored: true });
        }

        const text = String(message.text ?? "");
        const chatId = Number((message.chat as Record<string, unknown>).id);

        if (text.trim().toLowerCase() === "/start") {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: START_MESSAGE,
              parse_mode: "HTML",
              disable_web_page_preview: true,
            }),
          });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
