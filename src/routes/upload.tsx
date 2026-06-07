import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { parseTags } from "@/lib/images";
import { toast } from "sonner";
import { ImagePlus, Loader2, X, Images as ImagesIcon } from "lucide-react";

export const Route = createFileRoute("/upload")({
  head: () => ({ meta: [{ title: "Upload — Lumen" }] }),
  component: UploadPage,
});

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/avif";
const MAX_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 30;

type Picked = { file: File; preview: string; title: string };

function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Picked[]>([]);
  const [albumTitle, setAlbumTitle] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const isAnon = !user;
  const isAlbum = items.length > 1;

  function addFiles(files: FileList | File[] | null) {
    if (!files) return;
    const arr = Array.from(files);
    const next: Picked[] = [];
    for (const f of arr) {
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name}: not an image`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name}: larger than 50 MB`);
        continue;
      }
      next.push({
        file: f,
        preview: URL.createObjectURL(f),
        title: f.name.replace(/\.[^.]+$/, ""),
      });
    }
    setItems((prev) => {
      const merged = [...prev, ...next].slice(0, MAX_FILES);
      if (prev.length + next.length > MAX_FILES) {
        toast.error(`Max ${MAX_FILES} files`);
      }
      return merged;
    });
  }

  function removeAt(i: number) {
    setItems((prev) => {
      const copy = [...prev];
      const [gone] = copy.splice(i, 1);
      if (gone) URL.revokeObjectURL(gone.preview);
      return copy;
    });
  }

  function updateTitle(i: number, v: string) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, title: v } : it)));
  }

  function clearAll() {
    items.forEach((i) => URL.revokeObjectURL(i.preview));
    setItems([]);
    setProgress(0);
  }

  async function getDimensions(f: File): Promise<{ w: number; h: number } | null> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(f);
      img.onload = () => {
        resolve({ w: img.naturalWidth, h: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        resolve(null);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });
  }

  async function onUpload() {
    if (items.length === 0) return;
    setBusy(true);
    setProgress(2);

    let bearer: string | undefined;
    if (user) {
      const { data: sess } = await supabase.auth.getSession();
      bearer = sess.session?.access_token;
      if (!bearer) {
        toast.error("Session expired — sign in again");
        setBusy(false);
        return;
      }
    }


    const album_id = isAlbum ? crypto.randomUUID() : null;
    const album_title = isAlbum ? albumTitle.trim() || "Untitled album" : null;
    const tags = parseTags(tagsInput);

    const insertedIds: string[] = [];
    try {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const dims = await getDimensions(it.file);

        const fd = new FormData();
        fd.append("file", it.file, it.file.name);
        fd.append("title", it.title || "");
        fd.append("tags", JSON.stringify(tags));
        fd.append("is_public", String(isPublic));
        if (album_id) fd.append("album_id", album_id);
        if (album_title) fd.append("album_title", album_title);
        if (dims) {
          fd.append("width", String(dims.w));
          fd.append("height", String(dims.h));
        }

        const res = await fetch("/api/public/tg-upload", {
          method: "POST",
          headers: bearer ? { Authorization: `Bearer ${bearer}` } : undefined,
          body: fd,
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          let msg = txt;
          try {
            const j = JSON.parse(txt);
            msg = j.error ?? txt;
          } catch {
            /* ignore */
          }
          throw new Error(msg || `Upload failed (${res.status})`);
        }
        const json = (await res.json()) as { id: string };
        insertedIds.push(json.id);
        setProgress(Math.round(((i + 1) / items.length) * 100));
      }

      toast.success(isAlbum ? "Album uploaded" : "Uploaded");
      if (isAlbum && album_id) {
        navigate({ to: "/a/$id", params: { id: album_id } });
      } else {
        navigate({ to: "/i/$id", params: { id: insertedIds[0] } });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">
        Upload {isAlbum ? "an album" : "images"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        JPG, PNG, WebP, GIF, or AVIF · up to 50 MB each · up to {MAX_FILES} files.
        Files are stored in a private Telegram channel — unlimited capacity.
      </p>

      <div className="mt-6 space-y-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/80 bg-card/40 px-6 py-12 text-center transition-colors hover:border-primary/60 hover:bg-card/60"
        >
          {isAlbum ? (
            <ImagesIcon className="h-8 w-8 text-muted-foreground" />
          ) : (
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">
            {items.length === 0
              ? "Click or drop images here"
              : "Add more images"}
          </span>
          <span className="text-xs text-muted-foreground">
            {items.length}/{MAX_FILES} selected
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />

        {items.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((it, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-xl border border-border/60 bg-card"
              >
                <img
                  src={it.preview}
                  alt={it.title}
                  className="aspect-square w-full object-cover"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-1.5 top-1.5 h-7 w-7"
                  onClick={() => removeAt(i)}
                  disabled={busy}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
                <Input
                  value={it.title}
                  maxLength={120}
                  onChange={(e) => updateTitle(i, e.target.value)}
                  className="rounded-none border-0 border-t border-border/60 text-xs"
                  placeholder="Title"
                />
              </div>
            ))}
          </div>
        )}

        {isAlbum && (
          <div className="space-y-1.5">
            <Label htmlFor="album">Album title</Label>
            <Input
              id="album"
              value={albumTitle}
              maxLength={120}
              onChange={(e) => setAlbumTitle(e.target.value)}
              placeholder="Trip to Kyoto"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="tags">Tags {isAlbum && "(applied to every image)"}</Label>
          <Input
            id="tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="nature, sunset, travel"
          />
          <p className="text-xs text-muted-foreground">
            Comma or space separated · up to 12 tags
          </p>
        </div>

        {!isAnon && (
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/60 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Public</p>
              <p className="text-xs text-muted-foreground">
                Show in the public gallery.
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        )}

        {busy && <Progress value={progress} />}

        <div className="flex gap-2">
          <Button
            onClick={onUpload}
            disabled={items.length === 0 || busy}
            className="flex-1 glow-ring"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isAlbum ? `Upload album (${items.length})` : "Upload"}
          </Button>
          {items.length > 0 && !busy && (
            <Button variant="secondary" onClick={clearAll}>
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
