import { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useIsSuperAdmin } from "@/hooks/use-role";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ImageIcon,
  Upload,
  LogOut,
  LayoutGrid,
  ShieldAlert,
  Menu,
  User,
  Images as ImagesIcon,
} from "lucide-react";

export function SiteHeader() {
  const { user } = useAuth();
  const { isSuperAdmin } = useIsSuperAdmin();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    router.invalidate();
    router.navigate({ to: "/" });
  }

  const navItems = (
    <>
      <Button asChild variant="ghost" size="sm" onClick={() => setOpen(false)}>
        <Link to="/">
          <LayoutGrid className="h-4 w-4" />
          Gallery
        </Link>
      </Button>
      <Button asChild size="sm" className="glow-ring" onClick={() => setOpen(false)}>
        <Link to="/upload">
          <Upload className="h-4 w-4" />
          Upload
        </Link>
      </Button>
      {user ? (
        <>
          <Button asChild variant="ghost" size="sm" onClick={() => setOpen(false)}>
            <Link to="/my">
              <User className="h-4 w-4" />
              My uploads
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" onClick={() => setOpen(false)}>
            <Link to="/albums">
              <ImagesIcon className="h-4 w-4" />
              Albums
            </Link>
          </Button>
          {isSuperAdmin && (
            <Button asChild variant="ghost" size="sm" onClick={() => setOpen(false)}>
              <Link to="/admin">
                <ShieldAlert className="h-4 w-4" />
                Admin
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </>
      ) : (
        <Button asChild variant="ghost" size="sm" onClick={() => setOpen(false)}>
          <Link to="/auth">Sign in</Link>
        </Button>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground glow-ring">
            <ImageIcon className="h-4 w-4" />
          </span>
          <span>Lumen</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">{navItems}</nav>

        {/* Mobile nav */}
        <div className="flex items-center gap-1 md:hidden">
          <Button asChild size="sm" className="glow-ring">
            <Link to="/upload">
              <Upload className="h-4 w-4" />
            </Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <ImageIcon className="h-4 w-4" />
                  </span>
                  Lumen
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-2">{navItems}</div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
