import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { signImage, formatBytes, type ImageRow } from "@/lib/images";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Copy, Trash2, Globe, Lock } from "lucide-react";

export const Route = createFileRoute("/i/$id")({
  head: () => ({ meta: [{ title: "Image — Lumen" }] }),
  component: ImageDetail,
});

function ImageDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [row, setRow] = useState<ImageRow | null | "missing">(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("images").select("*").eq("id", id).maybeSingle();
      if (cancelled) return;
      if (!data) {
        setRow("missing");
        return;
      }
      setRow(data);
      try {
        const u = await signImage(data.storage_path);
        if (!cancelled) setUrl(u);
      } catch {
        /* noop */
      }
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

  async function onDelete() {
    if (!row || row === "missing") return;
    if (!confirm("Delete this image? This cannot be undone.")) return;
    await supabase.storage.from("images").remove([row.storage_path]);
    const { error } = await supabase.from("images").delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    navigate({ to: "/my" });
  }

  if (row === null) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Skeleton className="aspect-video w-full rounded-2xl" />
      </div>
    );
  }
  if (row === "missing") {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-semibold">Image not found</h1>
        <Link to="/" className="mt-4 inline-block text-sm text-primary underline">
          Back to gallery
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === row.user_id;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        {url ? (
          <img src={url} alt={row.title ?? "Image"} className="mx-auto max-h-[78vh] w-full object-contain" />
        ) : (
          <Skeleton className="aspect-video w-full" />
        )}
      </div>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {row.title ?? "Untitled"}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              {row.is_public ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              {row.is_public ? "Public" : "Private"}
            </span>
            {row.width && row.height && (
              <span>
                {row.width} × {row.height}
              </span>
            )}
            <span>{formatBytes(row.size_bytes)}</span>
            <span>{row.mime_type}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={copyLink}>
            <Copy className="h-4 w-4" />
            Copy link
          </Button>
          {isOwner && (
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
