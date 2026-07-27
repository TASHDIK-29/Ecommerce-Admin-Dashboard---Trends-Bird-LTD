"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "@/components/layout/nav-items";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const isActive = (pathname: string, href: string): boolean =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

export const Sidebar = ({ onNavigate }: { onNavigate?: () => void }) => {
  const pathname = usePathname();
  const { can } = useAuth();

  const items = NAV_ITEMS.filter((item) => can(item.watch));

  return (
    <nav className="flex h-full flex-col gap-1 p-3" aria-label="Main navigation">
      <div className="px-3 py-4">
        <p className="text-sm font-semibold leading-tight">Trends Bird</p>
        <p className="text-xs text-muted-foreground">Admin dashboard</p>
      </div>

      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}

      {items.length === 0 ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">
          Your role has no screens assigned.
        </p>
      ) : null}
    </nav>
  );
};
