import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { attachUrls, type ImageRow, type ImageWithUrl } from "@/lib/images";
import { Skeleton } from "@/components/ui/skeleton";
import { Images as ImagesIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/albums")({
  head: () => ({ meta: [{ title: "Albums — Lumen" }] }),
  component: AlbumsPage,
});

type AlbumSummary = {
  album_id: string;
  album_title: string;
  count: number;
  cover: ImageWithUrl;
  latest: string;
};

function AlbumsPage() {
  const { user } = useAuth();
  const [albums, setAlbums] = useState<AlbumSummary[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("images")
        .select("*")
        .eq("user_id", user.id)
        .not("album_id", "is", null)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const rows = (data ?? []) as ImageRow[];

      // Group by album_id, keep first row (latest) as cover candidate
      const map = new Map<string, ImageRow[]>();
      for (const r of rows) {
        if (!r.album_id) continue;
        const arr = map.get(r.album_id) ?? [];
        arr.push(r);
        map.set(r.album_id, arr);
      }

      const covers = await attachUrls(
        Array.from(map.values()).map((arr) => arr[0]),
      );
      const summaries: AlbumSummary[] = Array.from(map.entries()).map(
        ([album_id, arr], i) => ({
          album_id,
          album_title: arr[0].album_title ?? "Untitled album",
          count: arr.length,
          cover: covers[i],
          latest: arr[0].created_at,
        }),
      );
      summaries.sort((a, b) => b.latest.localeCompare(a.latest));
      if (!cancelled) setAlbums(summaries);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Albums</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your photo albums, organised like a familiar gallery.
      </p>

      <div className="mt-6">
        {albums === null ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-xl" />
            ))}
          </div>
        ) : albums.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 px-6 py-16 text-center">
            <ImagesIcon className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No albums yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload more than one image at once to create an album.
            </p>
            <Link
              to="/upload"
              className="mt-4 inline-block text-sm text-primary underline"
            >
              Create your first album
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {albums.map((a) => (
              <Link
                key={a.album_id}
                to="/a/$id"
                params={{ id: a.album_id }}
                className="group block overflow-hidden rounded-xl border border-border/60 bg-card transition hover:border-primary/60"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-muted">
                  {a.cover?.url ? (
                    <img
                      src={a.cover.url}
                      alt={a.album_title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImagesIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-xs font-medium shadow-md backdrop-blur">
                    <ImagesIcon className="h-3 w-3" />
                    {a.count}
                  </div>
                </div>
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-medium">{a.album_title}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.count} {a.count === 1 ? "photo" : "photos"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
