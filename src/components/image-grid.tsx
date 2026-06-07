import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { attachUrls, formatBytes, type ImageRow, type ImageWithUrl } from "@/lib/images";
import { Skeleton } from "@/components/ui/skeleton";
import { EyeOff } from "lucide-react";

type Props = {
  scope: "public" | "mine" | "all" | "hidden";
  userId?: string;
  search?: string;
  tags?: string[];
  emptyHint?: React.ReactNode;
  refreshKey?: number;
};

export function ImageGrid({ scope, userId, search, tags, emptyHint, refreshKey }: Props) {
  const [items, setItems] = useState<ImageWithUrl[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setItems(null);
      let q = supabase
        .from("images")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(80);
      if (scope === "public") q = q.eq("is_public", true).eq("is_hidden", false);
      if (scope === "mine" && userId) q = q.eq("user_id", userId);
      if (scope === "hidden") q = q.eq("is_hidden", true);
      if (search && search.trim()) q = q.ilike("title", `%${search.trim()}%`);
      if (tags && tags.length) q = q.contains("tags", tags);
      const { data, error } = await q;
      if (error || !data) {
        if (!cancelled) setItems([]);
        return;
      }
      const withUrls = await attachUrls(data as ImageRow[]);
      if (!cancelled) setItems(withUrls);
    })();
    return () => {
      cancelled = true;
    };
  }, [scope, userId, search, JSON.stringify(tags), refreshKey]);

  if (items === null) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-card/40 p-10 text-center text-sm text-muted-foreground">
        {emptyHint ?? "No images yet."}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((img) => (
        <Link
          key={img.id}
          to="/i/$id"
          params={{ id: img.id }}
          className="group relative block overflow-hidden rounded-xl border border-border/60 bg-card"
        >
          <div className="aspect-square w-full overflow-hidden bg-muted">
            <img
              src={img.url}
              alt={img.title ?? "Untitled image"}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          </div>
          {img.is_hidden && (
            <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-destructive/90 px-2 py-0.5 text-[10px] font-medium text-destructive-foreground">
              <EyeOff className="h-3 w-3" /> hidden
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
            <p className="truncate text-xs font-medium text-white">
              {img.title ?? "Untitled"}
            </p>
            <p className="text-[10px] text-white/70">{formatBytes(img.size_bytes)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
