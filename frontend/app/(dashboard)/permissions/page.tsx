"use client";

import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PermissionGroupDialog } from "@/components/permissions/permission-group-dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  useDeleteGroup,
  usePermissionGroups,
  useStandardActions,
  type PermissionGroup,
} from "@/hooks/use-permissions";
import { errorMessage } from "@/lib/form-errors";
import { STANDARD_ACTIONS } from "@/lib/permissions";

export default function PermissionsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PermissionGroup | null>(null);
  const [deleting, setDeleting] = useState<PermissionGroup | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search);
  const { data: standardActions } = useStandardActions();

  const query = usePermissionGroups({
    page,
    limit,
    searchTerm: debouncedSearch || undefined,
  });

  const deleteGroup = useDeleteGroup();

  const columns = standardActions ?? [...STANDARD_ACTIONS];
  const groups = query.data?.data ?? [];

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (group: PermissionGroup) => {
    setEditing(group);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteError(null);

    try {
      const result = await deleteGroup.mutateAsync(deleting.id);
      toast.success(`"${result.name}" deleted with ${result.deletedPermissions} permission(s).`);
      setDeleting(null);
    } catch (error) {
      setDeleteError(errorMessage(error));
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permissions"
        description="Every capability in the system, grouped by module."
        actions={
          <PermissionGate permission="permission:create">
            <Button onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              New group
            </Button>
          </PermissionGate>
        }
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <SearchInput value={search} onChange={handleSearch} placeholder="Search groups…" />

          <DataState
            isLoading={query.isLoading}
            isError={query.isError}
            error={query.error}
            isEmpty={groups.length === 0}
            emptyTitle={
              debouncedSearch ? "No groups match that search" : "No permission groups yet"
            }
            emptyDescription={
              debouncedSearch
                ? "Try a different term, or clear the search."
                : "Create a group to define the actions a module supports."
            }
            onRetry={() => void query.refetch()}
            loadingColumns={6}
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-40">Module</TableHead>
                    {columns.map((action) => (
                      <TableHead key={action} className="text-center capitalize">
                        {action}
                      </TableHead>
                    ))}
                    <TableHead>Custom</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {groups.map((group) => {
                    const held = new Set(group.permissions.map((p) => p.action));
                    const custom = group.permissions
                      .map((p) => p.action)
                      .filter((action) => !columns.includes(action));

                    return (
                      <TableRow key={group.id}>
                        <TableCell>
                          <div className="font-medium">{group.name}</div>
                          <code className="text-xs text-muted-foreground">{group.slug}</code>
                        </TableCell>

                        {columns.map((action) => (
                          <TableCell key={action} className="text-center">
                            {held.has(action) ? (
                              <span
                                title={`${group.slug}:${action}`}
                                className="inline-flex size-5 items-center justify-center rounded bg-primary/10"
                              >
                                <Check className="size-3.5 text-primary" aria-hidden />
                                <span className="sr-only">{`${group.slug}:${action}`}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40" aria-label="not granted">
                                —
                              </span>
                            )}
                          </TableCell>
                        ))}

                        <TableCell>
                          {custom.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {custom.map((action) => (
                                <Badge key={action} variant="secondary" className="text-xs">
                                  {action}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <PermissionGate permission="permission:update">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(group)}
                                aria-label={`Edit ${group.name}`}
                              >
                                <Pencil className="size-4" aria-hidden />
                              </Button>
                            </PermissionGate>

                            <PermissionGate permission="permission:delete">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setDeleteError(null);
                                  setDeleting(group);
                                }}
                                aria-label={`Delete ${group.name}`}
                              >
                                <Trash2 className="size-4 text-destructive" aria-hidden />
                              </Button>
                            </PermissionGate>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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

      <PermissionGroupDialog open={dialogOpen} onOpenChange={setDialogOpen} group={editing} />

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
          <>
            This deletes {deleting?.permissions.length ?? 0} permission(s) and removes them from
            every role that holds them. This cannot be undone.
          </>
        }
        confirmLabel="Delete group"
        destructive
        isPending={deleteGroup.isPending}
        error={deleteError}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
