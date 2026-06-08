// Returns the configured Telegram bot tokens, in slot order.
// Supports up to 5 bots: TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_TOKEN_2..5.
// Slot 1 == TELEGRAM_BOT_TOKEN (kept for backward compatibility with
// images uploaded before multi-bot support).
//
// Index returned to callers is 1-based and matches images.bot_index.
export type BotSlot = { index: number; token: string };

export function getBotTokens(): BotSlot[] {
  const slots: BotSlot[] = [];
  const primary = process.env.TELEGRAM_BOT_TOKEN;
  if (primary) slots.push({ index: 1, token: primary });
  for (let i = 2; i <= 5; i++) {
    const t = process.env[`TELEGRAM_BOT_TOKEN_${i}`];
    if (t) slots.push({ index: i, token: t });
  }
  return slots;
}

// Pick a bot for a new upload. Round-robin across configured bots, seeded
// randomly so concurrent requests don't all hit the same one.
let cursor = Math.floor(Math.random() * 1000);
export function pickBot(): BotSlot | null {
  const bots = getBotTokens();
  if (bots.length === 0) return null;
  const slot = bots[cursor % bots.length];
  cursor = (cursor + 1) % 1_000_000;
  return slot;
}

// Resolve the token for a stored image, falling back to slot 1 for legacy rows.
export function getTokenForIndex(index: number | null | undefined): string | null {
  const bots = getBotTokens();
  if (bots.length === 0) return null;
  const want = index && index > 0 ? index : 1;
  return bots.find((b) => b.index === want)?.token ?? bots[0].token;
}
