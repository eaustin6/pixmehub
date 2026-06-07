import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { attachUrls, formatBytes, type ImageWithUrl } from "@/lib/images";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  scope: "public" | "mine";
  userId?: string;
  emptyHint?: React.ReactNode;
};

export function ImageGrid({ scope, userId, emptyHint }: Props) {
  const [items, setItems] = useState<ImageWithUrl[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let q = supabase.from("images").select("*").order("created_at", { ascending: false }).limit(60);
      if (scope === "public") q = q.eq("is_public", true);
      if (scope === "mine" && userId) q = q.eq("user_id", userId);
      const { data, error } = await q;
      if (error || !data) {
        if (!cancelled) setItems([]);
        return;
      }
      const withUrls = await attachUrls(data);
      if (!cancelled) setItems(withUrls);
    })();
    return () => {
      cancelled = true;
    };
  }, [scope, userId]);

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
