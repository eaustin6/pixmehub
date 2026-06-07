import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { signImage, formatBytes, type ImageRow } from "@/lib/images";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _signImage = signImage;
import { useAuth } from "@/hooks/use-auth";
import { useIsSuperAdmin } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Copy, Trash2, Globe, Lock, EyeOff, Eye, Download } from "lucide-react";

export const Route = createFileRoute("/i/$id")({
  head: () => ({ meta: [{ title: "Image — Lumen" }] }),
  component: ImageDetail,
});

function ImageDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { isSuperAdmin } = useIsSuperAdmin();
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
      const r = data as ImageRow;
      setRow(r);
      try {
        if (r.telegram_file_id) {
          setUrl(`/api/public/tg-image/${r.id}`);
        } else if (r.storage_path) {
          const u = await signImage(r.storage_path);
          if (!cancelled) setUrl(u);
        }
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

  async function onDownload() {
    if (!url || !row || row === "missing") return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const ext = (row.mime_type?.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
      const name = `${(row.title ?? "image").replace(/[^a-z0-9-_]+/gi, "_")}.${ext}`;
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

  async function onDelete() {
    if (!row || row === "missing") return;
    if (!confirm("Delete this image? This cannot be undone.")) return;
    if (row.storage_path) {
      await supabase.storage.from("images").remove([row.storage_path]);
    }
    const { error } = await supabase.from("images").delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    navigate({ to: "/" });
  }

  async function toggleHidden() {
    if (!row || row === "missing") return;
    const next = !row.is_hidden;
    const reason = next ? prompt("Reason (optional)") ?? null : null;
    const { error } = await supabase
      .from("images")
      .update({ is_hidden: next, hidden_reason: reason })
      .eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRow({ ...row, is_hidden: next, hidden_reason: reason });
    toast.success(next ? "Image hidden" : "Image restored");
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

  const isOwner = !!user && user.id === row.user_id;
  const canManage = isOwner || isSuperAdmin;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {row.is_hidden && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          This image is hidden from the public gallery.
          {row.hidden_reason && <> Reason: {row.hidden_reason}</>}
        </div>
      )}
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
            {!row.user_id && <span className="italic">anonymous</span>}
          </p>
          {row.tags?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {row.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border/60 bg-card px-2.5 py-0.5 text-xs text-muted-foreground"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={copyLink}>
            <Copy className="h-4 w-4" />
            Copy link
          </Button>
          <Button onClick={onDownload} disabled={!url}>
            <Download className="h-4 w-4" />
            Download
          </Button>
          {isSuperAdmin && (
            <Button variant="secondary" onClick={toggleHidden}>
              {row.is_hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {row.is_hidden ? "Restore" : "Hide"}
            </Button>
          )}
          {canManage && (
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
