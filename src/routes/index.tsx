import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ImageGrid } from "@/components/image-grid";
import { Button } from "@/components/ui/button";
import { Upload, Sparkles } from "lucide-react";

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
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:pt-16">
      <section className="mb-12 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Powered by Lovable Cloud
        </div>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
          A quiet place for <span className="text-primary">images</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
          Drop in a photo, share a link, build a small public library. Fast,
          minimal, yours.
        </p>
        <div className="mt-6 flex justify-center gap-2">
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

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Recent uploads</h2>
          <span className="text-xs text-muted-foreground">Public gallery</span>
        </div>
        <ImageGrid
          scope="public"
          emptyHint="No public images yet — be the first to upload."
        />
      </section>
    </div>
  );
}
