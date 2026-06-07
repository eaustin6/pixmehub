import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Upload, Images } from "lucide-react";

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
      <section className="mb-10 text-center">
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
          A quiet place for <span className="text-primary">images</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
          Drop in a photo or a whole album, share a link, build a small public
          library. Fast, minimal, yours — no account required.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild size="lg" className="glow-ring">
            <Link to="/upload">
              <Upload className="h-4 w-4" />
              Upload images
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link to="/upload">
              <Images className="h-4 w-4" />
              Create an album
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
