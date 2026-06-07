import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ImageGrid } from "@/components/image-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Search, X } from "lucide-react";
import { parseTags } from "@/lib/images";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumen — A quiet place for images" },
      {
        name: "description",
        content: "Upload, share, and discover beautiful images on Lumen.",
      },
      { property: "og:title", content: "Lumen — A quiet place for images" },
      {
        property: "og:description",
        content: "Upload, share, and discover beautiful images on Lumen.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const [query, setQuery] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);

  function addTag(e: React.FormEvent) {
    e.preventDefault();
    const next = parseTags(tagInput);
    if (next.length) {
      setActiveTags((prev) => Array.from(new Set([...prev, ...next])).slice(0, 8));
      setTagInput("");
    }
  }

  function removeTag(t: string) {
    setActiveTags((prev) => prev.filter((x) => x !== t));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:pt-16">
      <section className="mb-10 text-center">
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
          A quiet place for <span className="text-primary">images</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
          Drop in a photo, share a link, build a small public library. Fast,
          minimal, yours — no account required.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild size="lg" className="glow-ring">
            <Link to="/upload">
              <Upload className="h-4 w-4" />
              Upload an image
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link to="/auth">Create account</Link>
          </Button>
        </div>
      </section>

      <section className="mb-6 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles…"
            className="pl-9"
          />
        </div>
        <form onSubmit={addTag} className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Filter by tag (e.g. sunset)"
          />
          <Button type="submit" variant="secondary">
            Add tag
          </Button>
        </form>
        {activeTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {activeTags.map((t) => (
              <button
                key={t}
                onClick={() => removeTag(t)}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-3 py-1 text-xs hover:bg-muted"
              >
                #{t}
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Recent uploads</h2>
          <span className="text-xs text-muted-foreground">Public gallery</span>
        </div>
        <ImageGrid
          scope="public"
          search={query}
          tags={activeTags}
          emptyHint="No images match — try different search or tags."
        />
      </section>
    </div>
  );
}
