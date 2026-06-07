import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Upload, Images, Sparkles } from "lucide-react";
import neko1 from "@/assets/neko-1.png";
import neko2 from "@/assets/neko-2.png";

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
    <div className="relative mx-auto max-w-6xl overflow-hidden px-4 pb-20 pt-10 sm:pt-16">
      {/* Night sky stars */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,90,255,0.18),transparent_55%),radial-gradient(circle_at_75%_60%,rgba(255,180,90,0.12),transparent_55%)]" />
        {Array.from({ length: 30 }).map((_, i) => {
          // deterministic positions to avoid hydration mismatch
          const top = (i * 37) % 100;
          const left = (i * 53) % 100;
          const delay = (i % 6) * 0.4;
          const size = (i % 3) + 1;
          return (
            <span
              key={i}
              className="absolute rounded-full bg-white/80 animate-twinkle"
              style={{
                top: `${top}%`,
                left: `${left}%`,
                width: `${size}px`,
                height: `${size}px`,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>

      {/* Floating neko girls */}
      <img
        src={neko1}
        alt=""
        aria-hidden
        width={512}
        height={768}
        className="pointer-events-none absolute left-2 top-24 hidden w-28 animate-float-slow opacity-90 drop-shadow-[0_0_25px_rgba(120,90,255,0.35)] md:block lg:w-40"
      />
      <img
        src={neko2}
        alt=""
        aria-hidden
        width={512}
        height={768}
        className="pointer-events-none absolute right-2 top-32 hidden w-28 animate-float opacity-90 drop-shadow-[0_0_25px_rgba(255,200,120,0.35)] md:block lg:w-40"
      />

      <section className="relative mb-10 text-center">
        {/* Mobile: small nekos beside the title */}
        <div className="mb-4 flex items-center justify-center gap-4 md:hidden">
          <img
            src={neko1}
            alt=""
            aria-hidden
            width={512}
            height={768}
            className="w-16 animate-float-slow drop-shadow-[0_0_15px_rgba(120,90,255,0.4)]"
          />
          <Sparkles className="h-5 w-5 text-primary" />
          <img
            src={neko2}
            alt=""
            aria-hidden
            width={512}
            height={768}
            className="w-16 animate-float drop-shadow-[0_0_15px_rgba(255,200,120,0.4)]"
          />
        </div>

        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
          A quiet place for <span className="text-primary">images</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
          Drop in a single photo or a whole album, share a link, build a small
          public library. Fast, minimal, yours — no account required.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Button asChild size="lg" className="glow-ring w-full sm:w-auto">
            <Link to="/upload">
              <Upload className="h-4 w-4" />
              Upload images or album
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
            <Link to="/my">
              <Images className="h-4 w-4" />
              My uploads
            </Link>
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Pick one image or many — multiple files become a shareable album.
        </p>
      </section>
    </div>
  );
}
