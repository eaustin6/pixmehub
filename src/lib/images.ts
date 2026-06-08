import { supabase } from "@/integrations/supabase/client";
import { apiUrl } from "@/lib/api";

export type ImageRow = {
  id: string;
  user_id: string | null;
  storage_path: string | null;
  telegram_file_id: string | null;
  telegram_message_id: number | null;
  title: string | null;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  mime_type: string | null;
  is_public: boolean;
  is_hidden: boolean;
  hidden_reason: string | null;
  tags: string[];
  album_id: string | null;
  album_title: string | null;
  created_at: string;
};

export type ImageWithUrl = ImageRow & { url: string };

const SIGNED_TTL = 60 * 60;

export function imageUrlFor(row: Pick<ImageRow, "id" | "telegram_file_id" | "storage_path">): string | null {
  if (row.telegram_file_id) return apiUrl(`/api/public/tg-image/${row.id}`);
  return null;
}

export async function signImage(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("images")
    .createSignedUrl(path, SIGNED_TTL);
  if (error || !data) throw error ?? new Error("Failed to sign");
  return data.signedUrl;
}

export async function attachUrls(rows: ImageRow[]): Promise<ImageWithUrl[]> {
  const out: ImageWithUrl[] = [];
  for (const r of rows) {
    let url = "";
    if (r.telegram_file_id) {
      url = apiUrl(`/api/public/tg-image/${r.id}`);
    } else if (r.storage_path) {
      try {
        const { data } = await supabase.storage
          .from("images")
          .createSignedUrl(r.storage_path, SIGNED_TTL);
        url = data?.signedUrl ?? "";
      } catch {
        /* ignore */
      }
    }
    out.push({ ...r, url });
  }
  return out;
}

export function formatBytes(n: number | null): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Resize an image client-side using canvas. Returns a new File.
 * - maxDim: longest edge in px (0 = no resize)
 * - quality: 0..1 for JPEG/WebP
 */
export async function resizeImage(
  file: File,
  maxDim: number,
  quality = 0.86,
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (maxDim === 0) return file;

  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  if (scale >= 1) {
    bitmap.close?.();
    return file;
  }
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const outType =
    file.type === "image/png" || file.type === "image/webp"
      ? "image/webp"
      : "image/jpeg";

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      outType,
      quality,
    ),
  );

  const ext = outType === "image/webp" ? "webp" : "jpg";
  const base = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${base}.${ext}`, { type: outType });
}

export function parseTags(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[,\s]+/)
        .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
        .filter((t) => t.length > 0 && t.length <= 32),
    ),
  ).slice(0, 12);
}
