import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ImagePlus, Loader2, X } from "lucide-react";

export const Route = createFileRoute("/upload")({
  head: () => ({ meta: [{ title: "Upload — Lumen" }] }),
  component: UploadPage,
});

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/avif";
const MAX_BYTES = 15 * 1024 * 1024;

function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  function selectFile(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("File is larger than 15 MB");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  function clear() {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
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
    if (!file || !user) return;
    setBusy(true);
    setProgress(10);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const dims = await getDimensions(file);
      setProgress(35);

      const { error: upErr } = await supabase.storage
        .from("images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      setProgress(75);

      const { data: row, error: insErr } = await supabase
        .from("images")
        .insert({
          user_id: user.id,
          storage_path: path,
          title: title || null,
          width: dims?.w ?? null,
          height: dims?.h ?? null,
          size_bytes: file.size,
          mime_type: file.type,
          is_public: isPublic,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      setProgress(100);
      toast.success("Uploaded");
      navigate({ to: "/i/$id", params: { id: row.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Upload an image</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        JPG, PNG, WebP, GIF, or AVIF · up to 15 MB.
      </p>

      <div className="mt-6 space-y-4">
        {!preview ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              selectFile(e.dataTransfer.files?.[0] ?? null);
            }}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/80 bg-card/40 px-6 py-16 text-center transition-colors hover:border-primary/60 hover:bg-card/60"
          >
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium">Click or drop an image here</span>
            <span className="text-xs text-muted-foreground">Max 15 MB</span>
          </button>
        ) : (
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card">
            <img src={preview} alt="Preview" className="max-h-[420px] w-full object-contain" />
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-2 top-2"
              onClick={clear}
              disabled={busy}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
        />

        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="A nice descriptive title"
          />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/60 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Public</p>
            <p className="text-xs text-muted-foreground">
              Show this image in the public gallery.
            </p>
          </div>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} />
        </div>

        {busy && <Progress value={progress} />}

        <div className="flex gap-2">
          <Button onClick={onUpload} disabled={!file || busy} className="flex-1 glow-ring">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Upload
          </Button>
        </div>
      </div>
    </div>
  );
}
