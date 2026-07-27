"use client";

import Link from "next/link";

import { NAV_ITEMS } from "@/components/layout/nav-items";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { user, permissions, can } = useAuth();

  const screens = NAV_ITEMS.filter((item) => item.href !== "/" && can(item.watch));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user?.name ?? ""}`}
        description="Admin dashboard for the Trends Bird catalog."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Signed in as</CardDescription>
            <CardTitle className="text-lg">{user?.email}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">{user?.role.name}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Permissions held</CardDescription>
            <CardTitle className="text-lg">{permissions.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Every screen and action below is driven by this list.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Screens available</CardDescription>
            <CardTitle className="text-lg">{screens.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Menu entries come from your <code className="text-xs">:watch</code> permissions.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Your screens</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {screens.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg border bg-background p-4 transition-colors hover:bg-accent"
              >
                <Icon className="size-5 text-muted-foreground" aria-hidden />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
