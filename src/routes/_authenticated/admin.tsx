import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ImageGrid } from "@/components/image-grid";
import { useIsSuperAdmin } from "@/hooks/use-role";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Moderation — Lumen" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { isSuperAdmin, loading } = useIsSuperAdmin();
  const [search, setSearch] = useState("");

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground">Checking access…</div>;
  }

  if (!isSuperAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Forbidden</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You need super admin role to access moderation.
        </p>
        <Link to="/" className="mt-4 inline-block text-sm text-primary underline">
          Back to gallery
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight">Moderation</h1>
      </div>
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search titles…"
        className="mb-6 max-w-md"
      />
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All images</TabsTrigger>
          <TabsTrigger value="hidden">Hidden</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-6">
          <ImageGrid scope="all" search={search} emptyHint="No images." />
        </TabsContent>
        <TabsContent value="hidden" className="mt-6">
          <ImageGrid scope="hidden" search={search} emptyHint="Nothing hidden." />
        </TabsContent>
      </Tabs>
    </div>
  );
}
