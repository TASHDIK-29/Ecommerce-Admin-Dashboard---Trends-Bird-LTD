"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { NAV_ITEMS } from "@/components/layout/nav-items";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Forbidden } from "@/components/shared/forbidden";
import { useAuth } from "@/lib/auth-context";

/**
 * Finds the nav entry that owns the current path, so the layout can enforce the
 * same `:watch` permission that decides whether the sidebar entry is visible.
 * Without this, hiding a menu item would still leave the URL reachable.
 */
const matchNavItem = (pathname: string) =>
  NAV_ITEMS.filter((item) => item.href !== "/")
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ??
  (pathname === "/" ? NAV_ITEMS[0] : undefined);

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, can } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    // A role without dashboard:watch would otherwise land on a 403 wall at "/".
    // Send it to the first screen it can actually open instead.
    if (pathname === "/" && !can("dashboard:watch")) {
      const firstAllowed = NAV_ITEMS.find(
        (item) => item.href !== "/" && can(item.watch),
      );
      if (firstAllowed) router.replace(firstAllowed.href);
    }
  }, [isLoading, user, pathname, can, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  if (!user) return null;

  const navItem = matchNavItem(pathname);
  const allowed = !navItem || can(navItem.watch);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r bg-background md:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <Sidebar />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 bg-muted/30 p-4 md:p-6">
          {allowed ? (
            children
          ) : (
            <Forbidden permission={navItem?.watch} />
          )}
        </main>
      </div>
    </div>
  );
}
