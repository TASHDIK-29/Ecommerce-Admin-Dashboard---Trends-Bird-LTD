"use client";

import { LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/form-errors";

export const Topbar = () => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      toast.success("Signed out.");
    } catch (error) {
      toast.error(errorMessage(error));
      setLoggingOut(false);
    }
  };

  const initials = (user?.name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b bg-background px-4 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setMenuOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="size-5" aria-hidden />
      </Button>

      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials || "?"}
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.role.name}</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          <LogOut className="size-4" aria-hidden />
          <span className="hidden sm:inline">{loggingOut ? "Signing out…" : "Sign out"}</span>
        </Button>
      </div>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="left-0 top-0 h-full max-w-64 translate-x-0 translate-y-0 rounded-none p-0 sm:max-w-64">
          <DialogHeader className="sr-only">
            <DialogTitle>Navigation</DialogTitle>
            <DialogDescription>Dashboard sections available to your role</DialogDescription>
          </DialogHeader>
          <Sidebar onNavigate={() => setMenuOpen(false)} />
        </DialogContent>
      </Dialog>
    </header>
  );
};
