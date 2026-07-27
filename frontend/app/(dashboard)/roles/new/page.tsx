"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { RoleForm } from "@/components/roles/role-form";
import { Forbidden } from "@/components/shared/forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export default function NewRolePage() {
  const { can } = useAuth();

  if (!can("role:create")) {
    return <Forbidden permission="role:create" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New role"
        description="Name the role, then grant its permissions in the grid below."
        actions={
          <Button variant="outline" asChild>
            <Link href="/roles">
              <ArrowLeft className="size-4" aria-hidden />
              Back to roles
            </Link>
          </Button>
        }
      />

      <RoleForm />
    </div>
  );
}
