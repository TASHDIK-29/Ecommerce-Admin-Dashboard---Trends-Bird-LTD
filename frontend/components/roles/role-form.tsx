"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PermissionGrid } from "@/components/roles/permission-grid";
import { DataState } from "@/components/shared/data-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { usePermissionGroups } from "@/hooks/use-permissions";
import {
  useCreateRole,
  useUpdateRole,
  type RoleDetail,
  type RoleStatus,
} from "@/hooks/use-roles";
import { applyApiErrors } from "@/lib/form-errors";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "A role name must be at least 2 characters.")
    .max(50, "A role name must be at most 50 characters."),
  description: z.string().trim().max(255, "Keep the description under 255 characters.").optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

type FormValues = z.infer<typeof schema>;

const FIELDS = ["name", "description", "status"] as const;

export const RoleForm = ({ role }: { role?: RoleDetail }) => {
  const router = useRouter();
  const isEdit = Boolean(role);

  const groupsQuery = usePermissionGroups({ limit: 100 });
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();

  const [selectedIds, setSelectedIds] = useState<string[]>(
    role?.permissions.map((permission) => permission.id) ?? [],
  );
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: role?.name ?? "",
      description: role?.description ?? "",
      status: role?.status ?? "ACTIVE",
    },
  });

  const groups = groupsQuery.data?.data ?? [];
  const isPending = createRole.isPending || updateRole.isPending;

  const onSubmit = handleSubmit(async (values) => {
    setFormErrors([]);

    const payload = {
      name: values.name,
      description: values.description || undefined,
      status: values.status as RoleStatus,
      permissionIds: selectedIds,
    };

    try {
      if (isEdit && role) {
        await updateRole.mutateAsync({ id: role.id, payload });
        toast.success(`"${values.name}" updated with ${selectedIds.length} permission(s).`);
      } else {
        await createRole.mutateAsync(payload);
        toast.success(`"${values.name}" created with ${selectedIds.length} permission(s).`);
      }
      router.push("/roles");
    } catch (error) {
      setFormErrors(applyApiErrors(error, setError, FIELDS));
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {formErrors.length > 0 ? (
        <Alert variant="destructive">
          <AlertDescription>
            {formErrors.map((message) => (
              <span key={message} className="block">
                {message}
              </span>
            ))}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Role name</Label>
            <Input
              id="name"
              placeholder="Content Editor"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
            {errors.name ? (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              defaultValue={role?.status ?? "ACTIVE"}
              onValueChange={(value) => setValue("status", value as RoleStatus)}
              disabled={role?.isSystem}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
            {role?.isSystem ? (
              <p className="text-xs text-muted-foreground">
                System roles must stay active.
              </p>
            ) : null}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={2}
              placeholder="What this role is for"
              aria-invalid={Boolean(errors.description)}
              {...register("description")}
            />
            {errors.description ? (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4" aria-hidden />
            Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataState
            isLoading={groupsQuery.isLoading}
            isError={groupsQuery.isError}
            error={groupsQuery.error}
            isEmpty={groups.length === 0}
            emptyTitle="No permissions defined"
            emptyDescription="Create permission groups first, then come back to grant them."
            onRetry={() => void groupsQuery.refetch()}
            loadingColumns={6}
          >
            <PermissionGrid
              groups={groups}
              selectedIds={selectedIds}
              onChange={setSelectedIds}
              disabled={isPending}
            />
          </DataState>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/roles")}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {isEdit ? "Save changes" : "Create role"}
        </Button>
      </div>
    </form>
  );
};
