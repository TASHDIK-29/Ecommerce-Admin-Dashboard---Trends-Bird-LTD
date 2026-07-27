"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use } from "react";

import { RoleForm } from "@/components/roles/role-form";
import { DataState } from "@/components/shared/data-state";
import { Forbidden } from "@/components/shared/forbidden";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useRole } from "@/hooks/use-roles";
import { useAuth } from "@/lib/auth-context";

/**
 * Next 16 passes `params` as a Promise, so a client page reads it with React's
 * `use()` rather than destructuring it directly.
 */
export default function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { can } = useAuth();
  const query = useRole(id);

  if (!can("role:update")) {
    return <Forbidden permission="role:update" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={query.data ? `Edit ${query.data.name}` : "Edit role"}
        description="Tick or untick permissions, then save. Changes take effect on the holder's next request."
        actions={
          <Button variant="outline" asChild>
            <Link href="/roles">
              <ArrowLeft className="size-4" aria-hidden />
              Back to roles
            </Link>
          </Button>
        }
      />

      <DataState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        loadingRows={6}
      >
        {query.data ? <RoleForm role={query.data} /> : null}
      </DataState>
    </div>
  );
}
