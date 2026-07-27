"use client";

import { Pencil, Plus, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataState } from "@/components/shared/data-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { PermissionGate } from "@/components/shared/permission-gate";
import { SearchInput } from "@/components/shared/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useDeleteRole, useRoles, type RoleListRow } from "@/hooks/use-roles";
import { errorMessage } from "@/lib/form-errors";

const ALL = "all";

export default function RolesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [deleting, setDeleting] = useState<RoleListRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search);

  const query = useRoles({
    page,
    limit,
    searchTerm: debouncedSearch || undefined,
    status: status === ALL ? undefined : status,
  });

  const deleteRole = useDeleteRole();
  const roles = query.data?.data ?? [];

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteError(null);

    try {
      await deleteRole.mutateAsync(deleting.id);
      toast.success(`"${deleting.name}" deleted.`);
      setDeleting(null);
    } catch (error) {
      setDeleteError(errorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        description="A role bundles permissions and is handed to a user."
        actions={
          <PermissionGate permission="role:create">
            <Button asChild>
              <Link href="/roles/new">
                <Plus className="size-4" aria-hidden />
                New role
              </Link>
            </Button>
          </PermissionGate>
        }
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search roles…"
            />

            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-44" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DataState
            isLoading={query.isLoading}
            isError={query.isError}
            error={query.error}
            isEmpty={roles.length === 0}
            emptyTitle={debouncedSearch ? "No roles match that search" : "No roles yet"}
            emptyDescription={
              debouncedSearch
                ? "Try a different term, or clear the search."
                : "Create a role to group permissions for a job function."
            }
            onRetry={() => void query.refetch()}
            loadingColumns={5}
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Users</TableHead>
                    <TableHead className="text-center">Permissions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{role.name}</span>
                          {role.isSystem ? (
                            <Badge variant="outline" className="text-xs">
                              System
                            </Badge>
                          ) : null}
                        </div>
                        {role.description ? (
                          <p className="text-xs text-muted-foreground">{role.description}</p>
                        ) : null}
                      </TableCell>

                      <TableCell>
                        <Badge variant={role.status === "ACTIVE" ? "default" : "secondary"}>
                          {role.status === "ACTIVE" ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 text-sm tabular-nums">
                          <Users className="size-3.5 text-muted-foreground" aria-hidden />
                          {role.userCount}
                        </span>
                      </TableCell>

                      <TableCell className="text-center tabular-nums">
                        {role.permissionCount}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <PermissionGate permission="role:update">
                            <Button variant="ghost" size="icon" asChild>
                              <Link
                                href={`/roles/${role.id}/edit`}
                                aria-label={`Edit ${role.name}`}
                              >
                                <Pencil className="size-4" aria-hidden />
                              </Link>
                            </Button>
                          </PermissionGate>

                          <PermissionGate permission="role:delete">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeleteError(null);
                                setDeleting(role);
                              }}
                              aria-label={`Delete ${role.name}`}
                            >
                              <Trash2 className="size-4 text-destructive" aria-hidden />
                            </Button>
                          </PermissionGate>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {query.data ? (
              <Pagination
                meta={query.data.meta}
                onPageChange={setPage}
                onLimitChange={(next) => {
                  setLimit(next);
                  setPage(1);
                }}
              />
            ) : null}
          </DataState>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
            setDeleteError(null);
          }
        }}
        title={`Delete "${deleting?.name}"?`}
        description={
          deleting && deleting.userCount > 0
            ? `${deleting.userCount} user(s) currently hold this role. The server will refuse the delete until they are reassigned.`
            : "This cannot be undone."
        }
        confirmLabel="Delete role"
        destructive
        isPending={deleteRole.isPending}
        error={deleteError}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
