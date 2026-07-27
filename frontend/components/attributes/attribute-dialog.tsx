"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  draftToPayload,
  emptyDraft,
  ValueRow,
  type DraftValue,
} from "@/components/attributes/value-editor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ATTRIBUTE_TYPES,
  ATTRIBUTE_TYPE_LABELS,
  useAddValues,
  useCreateAttribute,
  useDeleteValue,
  useUpdateAttribute,
  useUpdateValue,
  type Attribute,
  type AttributeType,
} from "@/hooks/use-attributes";
import { applyApiErrors, errorMessage } from "@/lib/form-errors";

const schema = z.object({
  name: z.string().trim().min(2, "At least 2 characters.").max(100),
  slug: z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .min(2)
        .max(120)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only."),
    ])
    .optional(),
});

type FormValues = z.infer<typeof schema>;

const FIELDS = ["name", "slug", "type", "values"] as const;

const toDraft = (value: Attribute["values"][number]): DraftValue => ({
  key: value.id,
  value: value.value,
  colorCode: value.colorCode ?? "#4F46E5",
  media: null,
  mediaId: value.mediaId,
  mediaThumb: value.media?.thumbnailUrl ?? value.media?.url ?? null,
});

const AttributeForm = ({
  attribute,
  onDone,
  onCancel,
}: {
  attribute?: Attribute | null;
  onDone: () => void;
  onCancel: () => void;
}) => {
  const isEdit = Boolean(attribute);
  const createAttribute = useCreateAttribute();
  const updateAttribute = useUpdateAttribute();
  const addValues = useAddValues();
  const updateValue = useUpdateValue();
  const deleteValue = useDeleteValue();

  const [type, setType] = useState<AttributeType>(attribute?.type ?? "DROPDOWN");
  const [drafts, setDrafts] = useState<DraftValue[]>(
    attribute ? attribute.values.map(toDraft) : [emptyDraft()],
  );
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [valueError, setValueError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: attribute?.name ?? "", slug: attribute?.slug ?? "" },
  });

  const existingIds = new Set((attribute?.values ?? []).map((value) => value.id));

  const isPending =
    createAttribute.isPending ||
    updateAttribute.isPending ||
    addValues.isPending ||
    updateValue.isPending ||
    deleteValue.isPending;

  const updateDraft = (index: number, next: DraftValue) =>
    setDrafts((current) => current.map((draft, position) => (position === index ? next : draft)));

  const removeDraft = async (index: number) => {
    const draft = drafts[index];
    setValueError(null);

    // Rows that already exist server-side are removed through the nested route,
    // so the deletion is refused if a product variant is using the value.
    if (attribute && existingIds.has(draft.key)) {
      try {
        await deleteValue.mutateAsync({ id: attribute.id, valueId: draft.key });
        toast.success(`"${draft.value}" removed.`);
      } catch (error) {
        setValueError(errorMessage(error));
        return;
      }
    }

    setDrafts((current) => current.filter((_, position) => position !== index));
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormErrors([]);
    setValueError(null);

    const filled = drafts.filter((draft) => draft.value.trim() !== "");

    if (filled.length === 0 && !isEdit) {
      setValueError("Add at least one value.");
      return;
    }

    try {
      if (isEdit && attribute) {
        await updateAttribute.mutateAsync({
          id: attribute.id,
          payload: { name: values.name, slug: values.slug || undefined, type },
        });

        const additions = filled.filter((draft) => !existingIds.has(draft.key));
        const edits = filled.filter((draft) => existingIds.has(draft.key));

        for (const draft of edits) {
          await updateValue.mutateAsync({
            id: attribute.id,
            valueId: draft.key,
            payload: draftToPayload(draft, type),
          });
        }

        if (additions.length > 0) {
          await addValues.mutateAsync({
            id: attribute.id,
            values: additions.map((draft) => draftToPayload(draft, type)),
          });
        }

        toast.success(`"${values.name}" updated.`);
      } else {
        await createAttribute.mutateAsync({
          name: values.name,
          slug: values.slug || undefined,
          type,
          values: filled.map((draft) => draftToPayload(draft, type)),
        });
        toast.success(`"${values.name}" created with ${filled.length} value(s).`);
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

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="Colour" aria-invalid={Boolean(errors.name)} {...register("name")} />
          {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            placeholder="Generated"
            aria-invalid={Boolean(errors.slug)}
            {...register("slug")}
          />
          {errors.slug ? <p className="text-sm text-destructive">{errors.slug.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Select value={type} onValueChange={(next) => setType(next as AttributeType)}>
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ATTRIBUTE_TYPES.map((option) => (
                <SelectItem key={option} value={option}>
                  {ATTRIBUTE_TYPE_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isEdit && attribute && attribute.type !== type ? (
        <Alert>
          <AlertDescription>
            Changing the type re-checks every existing value. A colour swatch needs a hex on
            each value, and an image swatch needs an image, so the save is refused if any value
            does not fit.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Values</Label>
          <span className="text-xs text-muted-foreground">
            Unique within this attribute — &quot;Red&quot; may also exist under another one.
          </span>
        </div>

        <div className="space-y-2">
          {drafts.map((draft, index) => (
            <ValueRow
              key={draft.key}
              draft={draft}
              type={type}
              disabled={isPending}
              showLabels={index === 0}
              onChange={(next) => updateDraft(index, next)}
              onRemove={() => void removeDraft(index)}
            />
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => setDrafts((current) => [...current, emptyDraft()])}
        >
          <Plus className="size-4" aria-hidden />
          Add value
        </Button>

        {valueError ? <p className="text-sm text-destructive">{valueError}</p> : null}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {isEdit ? "Save changes" : "Create attribute"}
        </Button>
      </DialogFooter>
    </form>
  );
};

export const AttributeDialog = ({
  open,
  onOpenChange,
  attribute,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attribute?: Attribute | null;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>{attribute ? "Edit attribute" : "New attribute"}</DialogTitle>
        <DialogDescription>
          The dimensions a product varies along — Size, Colour, Storage — and the values each
          can take.
        </DialogDescription>
      </DialogHeader>

      {open ? (
        <AttributeForm
          key={attribute?.id ?? "new"}
          attribute={attribute}
          onDone={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      ) : null}
    </DialogContent>
  </Dialog>
);
