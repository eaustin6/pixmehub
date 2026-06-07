import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import bgSky from "@/assets/bg-sky.jpeg.asset.json";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          That page drifted off into the void.
        </p>
        <a href="/" className="mt-6 inline-block text-sm text-primary underline">
          Back to gallery
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">Try again in a moment.</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lumen — Image hosting" },
      { name: "description", content: "Upload, share, and discover beautiful images." },
      { property: "og:title", content: "Lumen — Image hosting" },
      { property: "og:description", content: "Upload, share, and discover beautiful images." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Lumen — Image hosting" },
      { name: "twitter:description", content: "Upload, share, and discover beautiful images." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1e060951-0979-44fc-8a7e-bba7a784960f/id-preview-aeed3208--75a8ad67-6dd7-4b1a-aeb0-ff0401908b7d.lovable.app-1780834603482.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1e060951-0979-44fc-8a7e-bba7a784960f/id-preview-aeed3208--75a8ad67-6dd7-4b1a-aeb0-ff0401908b7d.lovable.app-1780834603482.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">
          <Outlet />
        </main>
        <footer className="border-t border-border/60 bg-background/30 py-6 text-center backdrop-blur-sm">
          <a
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-2 rounded-full border border-primary/30 bg-gradient-to-r from-primary/10 via-fuchsia-500/10 to-amber-400/10 px-4 py-1.5 text-xs font-medium tracking-wide text-foreground/90 shadow-[0_0_25px_-5px_hsl(var(--primary)/0.5)] transition hover:scale-[1.03] hover:shadow-[0_0_30px_-2px_hsl(var(--primary)/0.7)]"
          >
            <span className="text-base animate-pulse">✦</span>
            <span>
              Crafted with{" "}
              <span className="inline-block animate-pulse bg-gradient-to-r from-rose-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
                ♥
              </span>{" "}
              by{" "}
              <span className="bg-gradient-to-r from-primary via-fuchsia-400 to-amber-300 bg-clip-text font-semibold text-transparent">
                Niaz Nafis
              </span>
            </span>
            <span className="text-base animate-pulse">✦</span>
          </a>
        </footer>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}
