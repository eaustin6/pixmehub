import { supabase } from "@/integrations/supabase/client";

export type ImageRow = {
  id: string;
  user_id: string;
  storage_path: string;
  title: string | null;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  mime_type: string | null;
  is_public: boolean;
  created_at: string;
};

export type ImageWithUrl = ImageRow & { url: string };

const SIGNED_TTL = 60 * 60; // 1 hour

export async function signImage(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("images")
    .createSignedUrl(path, SIGNED_TTL);
  if (error || !data) throw error ?? new Error("Failed to sign");
  return data.signedUrl;
}

export async function attachUrls(rows: ImageRow[]): Promise<ImageWithUrl[]> {
  const urls = await Promise.all(
    rows.map((r) =>
      supabase.storage.from("images").createSignedUrl(r.storage_path, SIGNED_TTL),
    ),
  );
  return rows.map((r, i) => ({ ...r, url: urls[i]?.data?.signedUrl ?? "" }));
}

export function formatBytes(n: number | null): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
