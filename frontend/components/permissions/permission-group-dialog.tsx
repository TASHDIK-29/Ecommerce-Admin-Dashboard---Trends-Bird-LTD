"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateGroup,
  useStandardActions,
  useUpdateGroup,
  type PermissionGroup,
} from "@/hooks/use-permissions";
import { applyApiErrors } from "@/lib/form-errors";
import { STANDARD_ACTIONS } from "@/lib/permissions";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "A group name must be at least 2 characters.")
    .max(50, "A group name must be at most 50 characters."),
  description: z.string().trim().max(255, "Keep the description under 255 characters.").optional(),
});

type FormValues = z.infer<typeof schema>;

const FIELDS = ["name", "description"] as const;

/** Mirrors the server's normalisation so the preview matches what gets created. */
const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const GroupForm = ({
  group,
  actionList,
  onDone,
  onCancel,
}: {
  group?: PermissionGroup | null;
  actionList: string[];
  onDone: () => void;
  onCancel: () => void;
}) => {
  const isEdit = Boolean(group);
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();

  const initialActions = group?.permissions.map((permission) => permission.action) ?? [];

  const [selected, setSelected] = useState<string[]>(initialActions);
  const [customActions, setCustomActions] = useState<string[]>(
    initialActions.filter((action) => !actionList.includes(action)),
  );
  const [customDraft, setCustomDraft] = useState("");
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: group?.name ?? "", description: group?.description ?? "" },
  });

  // useWatch rather than watch(): watch() returns a function React Compiler
  // cannot memoize, which makes it skip optimising the whole component.
  const nameValue = useWatch({ control, name: "name" });
  const previewSlug = toSlug(nameValue || "");

  const toggleAction = (action: string, checked: boolean) => {
    setActionError(null);
    setSelected((current) =>
      checked ? [...new Set([...current, action])] : current.filter((item) => item !== action),
    );
  };

  const addCustomAction = () => {
    const normalised = toSlug(customDraft);

    if (!normalised) {
      setActionError("Enter a name for the custom action.");
      return;
    }
    if (selected.includes(normalised)) {
      setActionError(`"${normalised}" is already selected.`);
      return;
    }

    setCustomActions((current) => [...new Set([...current, normalised])]);
    setSelected((current) => [...new Set([...current, normalised])]);
    setCustomDraft("");
    setActionError(null);
  };

  const removeCustomAction = (action: string) => {
    setCustomActions((current) => current.filter((item) => item !== action));
    setSelected((current) => current.filter((item) => item !== action));
  };

  const removedActions = initialActions.filter((action) => !selected.includes(action));
  const isPending = createGroup.isPending || updateGroup.isPending;

  const onSubmit = handleSubmit(async (values) => {
    setFormErrors([]);

    if (selected.length === 0) {
      setActionError("Select at least one action for this group.");
      return;
    }

    const payload = {
      name: values.name,
      description: values.description || undefined,
      actions: selected,
    };

    try {
      if (isEdit && group) {
        await updateGroup.mutateAsync({ id: group.id, payload });
        toast.success(`"${values.name}" updated.`);
      } else {
        await createGroup.mutateAsync(payload);
        toast.success(`"${values.name}" created with ${selected.length} permission(s).`);
      }
      onDone();
    } catch (error) {
      setFormErrors(applyApiErrors(error, setError, FIELDS));
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Group name (module name)</Label>
          <Input
            id="name"
            placeholder="Catalog Discount"
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
          {errors.name ? (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          ) : previewSlug ? (
            <p className="text-xs text-muted-foreground">
              Permissions will be named{" "}
              <code className="rounded bg-muted px-1 py-0.5">{previewSlug}:action</code>
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={2}
            placeholder="What this module covers"
            aria-invalid={Boolean(errors.description)}
            {...register("description")}
          />
          {errors.description ? (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Permissions</Label>
          <span className="text-xs text-muted-foreground">{selected.length} selected</span>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-3">
          {actionList.map((action) => (
            <label
              key={action}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm capitalize hover:bg-accent"
            >
              <Checkbox
                checked={selected.includes(action)}
                onCheckedChange={(checked) => toggleAction(action, checked === true)}
              />
              {action}
            </label>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="custom-action">Custom permission</Label>
          <div className="flex gap-2">
            <Input
              id="custom-action"
              value={customDraft}
              placeholder="Bulk Import"
              onChange={(event) => setCustomDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCustomAction();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addCustomAction}>
              <Plus className="size-4" aria-hidden />
              Add
            </Button>
          </div>

          {customActions.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {customActions.map((action) => (
                <Badge key={action} variant="secondary" className="gap-1">
                  {action}
                  <button
                    type="button"
                    onClick={() => removeCustomAction(action)}
                    aria-label={`Remove ${action}`}
                    className="rounded-full hover:text-destructive"
                  >
                    <X className="size-3" aria-hidden />
                  </button>
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
      </div>

      {isEdit && removedActions.length > 0 ? (
        <Alert>
          <AlertDescription>
            Unticking {removedActions.map((action) => `"${action}"`).join(", ")} deletes{" "}
            {removedActions.length === 1 ? "that permission" : "those permissions"} and removes{" "}
            {removedActions.length === 1 ? "it" : "them"} from every role that holds{" "}
            {removedActions.length === 1 ? "it" : "them"}.
          </AlertDescription>
        </Alert>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {isEdit ? "Save changes" : "Create group"}
        </Button>
      </DialogFooter>
    </form>
  );
};

export const PermissionGroupDialog = ({
  open,
  onOpenChange,
  group,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: PermissionGroup | null;
}) => {
  const { data: standardActions } = useStandardActions();
  const actionList = standardActions ?? [...STANDARD_ACTIONS];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{group ? "Edit permission group" : "New permission group"}</DialogTitle>
          <DialogDescription>
            Name the module and tick its actions. Ticking Create on a group named Product produces{" "}
            <code className="rounded bg-muted px-1 py-0.5">product:create</code>.
          </DialogDescription>
        </DialogHeader>

        {/*
          Remounted per target so the form seeds itself from props instead of
          synchronising state inside an effect.
        */}
        {open ? (
          <GroupForm
            key={group?.id ?? "new"}
            group={group}
            actionList={actionList}
            onDone={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
