"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface ForbiddenProps {
  permission?: string;
  message?: string;
}

export const Forbidden = ({ permission, message }: ForbiddenProps) => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
    <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
      <ShieldAlert className="size-7 text-destructive" aria-hidden />
    </div>

    <div className="space-y-2">
      <h1 className="text-xl font-semibold">You do not have access to this screen</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {message ??
          "Your role does not include the permission this screen requires. Ask an administrator to grant it."}
      </p>
      {permission ? (
        <p className="text-xs text-muted-foreground">
          Required permission: <code className="rounded bg-muted px-1.5 py-0.5">{permission}</code>
        </p>
      ) : null}
    </div>

    <Button asChild variant="outline">
      <Link href="/">Back to dashboard</Link>
    </Button>
  </div>
);
