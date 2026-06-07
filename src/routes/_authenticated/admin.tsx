import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ImageGrid } from "@/components/image-grid";
import { useIsSuperAdmin } from "@/hooks/use-role";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { ShieldAlert, Upload, Database, Loader2 } from "lucide-react";
import { backupDatabase } from "@/lib/backup.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Control panel — Lumen" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { isSuperAdmin, loading } = useIsSuperAdmin();
  const [search, setSearch] = useState("");
  const [backingUp, setBackingUp] = useState(false);
  const runBackup = useServerFn(backupDatabase);

  async function onBackup() {
    setBackingUp(true);
    try {
      const res = await runBackup();
      const blob = new Blob([res.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url;
      a.download = `lumen-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Backup failed");
    } finally {
      setBackingUp(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground">Checking access…</div>;
  }

  if (!isSuperAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Forbidden</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You need super admin role to access the control panel.
        </p>
        <Link to="/" className="mt-4 inline-block text-sm text-primary underline">
          Back to gallery
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">Control panel</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link to="/upload">
              <Upload className="h-4 w-4" />
              Add files
            </Link>
          </Button>
          <Button onClick={onBackup} disabled={backingUp}>
            {backingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Backup database
          </Button>
        </div>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Manage every image on the platform, upload new files, or download a full JSON
        snapshot of the database (images, profiles, roles, storage listing).
      </p>
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
