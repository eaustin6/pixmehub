import { createFileRoute } from "@tanstack/react-router";
import { ImageGrid } from "@/components/image-grid";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/my")({
  head: () => ({ meta: [{ title: "My uploads — Lumen" }] }),
  component: MyPage,
});

function MyPage() {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">My uploads</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Everything you've uploaded — public and private.
      </p>
      <div className="mt-6">
        {user && (
          <ImageGrid scope="mine" userId={user.id} emptyHint="You haven't uploaded anything yet." />
        )}
      </div>
    </div>
  );
}
