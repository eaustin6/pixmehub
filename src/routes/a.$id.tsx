import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { attachUrls, type ImageRow, type ImageWithUrl } from "@/lib/images";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/a/$id")({
  head: () => ({ meta: [{ title: "Album — Lumen" }] }),
  component: AlbumPage,
});

function AlbumPage() {
  const { id } = Route.useParams();
  const [items, setItems] = useState<ImageWithUrl[] | null>(null);
  const [title, setTitle] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("images")
        .select("*")
        .eq("album_id", id)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      const rows = (data ?? []) as ImageRow[];
      setTitle(rows[0]?.album_title ?? "Album");
      const withUrls = await attachUrls(rows);
      if (!cancelled) setItems(withUrls);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function copyLink() {
    if (typeof window === "undefined") return;
    await navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied");
  }

  async function downloadOne(img: ImageWithUrl) {
    try {
      const res = await fetch(img.url);
      const blob = await res.blob();
      const ext = (img.mime_type?.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
      const name = `${(img.title ?? "image").replace(/[^a-z0-9-_]+/gi, "_")}.${ext}`;
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch {
      toast.error("Download failed");
    }
  }

  async function downloadAll() {
    if (!items) return;
    toast.message(`Downloading ${items.length} images…`);
    for (const img of items) {
      await downloadOne(img);
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  if (items === null) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-semibold">Album not found</h1>
        <Link to="/" className="mt-4 inline-block text-sm text-primary underline">
          Back home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title ?? "Album"}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? "image" : "images"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={copyLink}>
            <Copy className="h-4 w-4" />
            Copy album link
          </Button>
          <Button onClick={downloadAll}>
            <Download className="h-4 w-4" />
            Download all
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((img) => (
          <div
            key={img.id}
            className="group relative overflow-hidden rounded-xl border border-border/60 bg-card"
          >
            <Link to="/i/$id" params={{ id: img.id }}>
              <div className="aspect-square w-full overflow-hidden bg-muted">
                <img
                  src={img.url}
                  alt={img.title ?? "Image"}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </div>
            </Link>
            <button
              type="button"
              onClick={() => downloadOne(img)}
              aria-label="Download image"
              className="absolute right-2 top-2 rounded-full bg-background/80 p-2 text-foreground opacity-0 shadow-md backdrop-blur transition group-hover:opacity-100 focus:opacity-100"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
