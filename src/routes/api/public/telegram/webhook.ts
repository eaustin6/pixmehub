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

const START_MESSAGE = `Hi bot is live ❤️`;

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

        type TgMessage = { chat: { id: number }; text?: string };
        const update = (await request.json()) as {
          update_id: number;
          message?: TgMessage;
          edited_message?: TgMessage;
        };
        const message = update.message ?? update.edited_message;
        if (!message?.chat?.id || typeof update.update_id !== "number") {
          return Response.json({ ok: true, ignored: true });
        }

        const text = String(message.text ?? "");
        const chatId = message.chat.id;

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
