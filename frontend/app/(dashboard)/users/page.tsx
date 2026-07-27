"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataState } from "@/components/shared/data-state";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { PermissionGate } from "@/components/shared/permission-gate";
import { SearchInput } from "@/components/shared/search-input";
import { UserDialog } from "@/components/users/user-dialog";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useRoles } from "@/hooks/use-roles";
import {
  useDeleteUser,
  useUpdateUserStatus,
  useUsers,
  type UserRow,
} from "@/hooks/use-users";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/form-errors";

const ALL = "all";

export default function UsersPage() {
  const { user: currentUser, can } = useAuth();

  const [search, setSearch] = useState("");
  const [roleId, setRoleId] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search);
  const rolesQuery = useRoles({ limit: 100 });

  const query = useUsers({
    page,
    limit,
    searchTerm: debouncedSearch || undefined,
    roleId: roleId === ALL ? undefined : roleId,
    isActive: status === ALL ? undefined : status,
  });

  const updateStatus = useUpdateUserStatus();
  const deleteUser = useDeleteUser();

  const users = query.data?.data ?? [];
  const roles = rolesQuery.data?.data ?? [];

  const toggleStatus = async (user: UserRow, next: boolean) => {
    try {
      await updateStatus.mutateAsync({ id: user.id, isActive: next });
      toast.success(`"${user.name}" ${next ? "activated" : "deactivated"}.`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteError(null);

    try {
      await deleteUser.mutateAsync(deleting.id);
      toast.success(`"${deleting.name}" deleted.`);
      setDeleting(null);
    } catch (error) {
      setDeleteError(errorMessage(error));
    }
  };

  const resetPage = () => setPage(1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Dashboard accounts. Each holds exactly one role."
        actions={
          <PermissionGate permission="user:create">
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" aria-hidden />
              New user
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
                resetPage();
              }}
              placeholder="Search by name or email…"
            />

            <Select
              value={roleId}
              onValueChange={(value) => {
                setRoleId(value);
                resetPage();
              }}
            >
              <SelectTrigger className="w-full sm:w-48" aria-label="Filter by role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                resetPage();
              }}
            >
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DataState
            isLoading={query.isLoading}
            isError={query.isError}
            error={query.error}
            isEmpty={users.length === 0}
            emptyTitle={
              debouncedSearch || roleId !== ALL || status !== ALL
                ? "No users match those filters"
                : "No users yet"
            }
            emptyDescription={
              debouncedSearch || roleId !== ALL || status !== ALL
                ? "Try a different term, or clear the filters."
                : "Create a user and give them a role."
            }
            onRetry={() => void query.refetch()}
            loadingColumns={5}
          >
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {users.map((user) => {
                    const isSelf = user.id === currentUser?.id;

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{user.name}</span>
                            {isSelf ? (
                              <Badge variant="outline" className="text-xs">
                                You
                              </Badge>
                            ) : null}
                          </div>
                          {user.phone ? (
                            <p className="text-xs text-muted-foreground">{user.phone}</p>
                          ) : null}
                        </TableCell>

                        <TableCell className="text-sm">{user.email}</TableCell>

                        <TableCell>
                          <Badge variant="secondary">{user.role.name}</Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={user.isActive}
                              disabled={isSelf || !can("user:update") || updateStatus.isPending}
                              onCheckedChange={(next) => void toggleStatus(user, next)}
                              aria-label={`${user.isActive ? "Deactivate" : "Activate"} ${user.name}`}
                            />
                            <span className="text-sm text-muted-foreground">
                              {user.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <PermissionGate permission="user:update">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditing(user);
                                  setDialogOpen(true);
                                }}
                                aria-label={`Edit ${user.name}`}
                              >
                                <Pencil className="size-4" aria-hidden />
                              </Button>
                            </PermissionGate>

                            <PermissionGate permission="user:delete">
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={isSelf}
                                onClick={() => {
                                  setDeleteError(null);
                                  setDeleting(user);
                                }}
                                aria-label={`Delete ${user.name}`}
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
                  resetPage();
                }}
              />
            ) : null}
          </DataState>
        </CardContent>
      </Card>

      <UserDialog open={dialogOpen} onOpenChange={setDialogOpen} user={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
            setDeleteError(null);
          }
        }}
        title={`Delete "${deleting?.name}"?`}
        description="This is a soft delete: the record is kept and hidden from lists, and the email stays reserved."
        confirmLabel="Delete user"
        destructive
        isPending={deleteUser.isPending}
        error={deleteError}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
