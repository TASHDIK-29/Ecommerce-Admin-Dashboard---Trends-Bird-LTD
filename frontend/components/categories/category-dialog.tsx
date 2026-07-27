"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { MediaField } from "@/components/shared/media-picker";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  collectSubtreeIds,
  flattenTree,
  useCreateCategory,
  useUpdateCategory,
  type CategoryNode,
} from "@/hooks/use-categories";
import { useMediaAsset, type MediaAsset } from "@/hooks/use-media";
import { applyApiErrors } from "@/lib/form-errors";

const NO_PARENT = "none";

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
  description: z.string().trim().max(1000, "Keep it under 1000 characters.").optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999),
});

type FormValues = z.infer<typeof schema>;

const FIELDS = ["name", "slug", "description", "sortOrder", "parentId", "imageId"] as const;

const CategoryForm = ({
  category,
  defaultParentId,
  tree,
  onDone,
  onCancel,
}: {
  category?: CategoryNode | null;
  defaultParentId?: string | null;
  tree: CategoryNode[];
  onDone: () => void;
  onCancel: () => void;
}) => {
  const isEdit = Boolean(category);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const imageQuery = useMediaAsset(category?.imageId);

  const [parentId, setParentId] = useState(category?.parentId ?? defaultParentId ?? NO_PARENT);
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [image, setImage] = useState<MediaAsset | null>(null);
  const [imageTouched, setImageTouched] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: category?.name ?? "",
      slug: category?.slug ?? "",
      description: category?.description ?? "",
      sortOrder: category?.sortOrder ?? 0,
    },
  });

  // Offering the category itself or any descendant would build a loop, which
  // the server rejects with a 409. Leaving them out means the UI cannot ask.
  const excluded = category ? new Set(collectSubtreeIds(tree, category.id)) : new Set<string>();
  const options = flattenTree(tree).filter((node) => !excluded.has(node.id));

  const isPending = createCategory.isPending || updateCategory.isPending;
  const currentImage = imageTouched ? image : (imageQuery.data ?? null);

  const onSubmit = handleSubmit(async (values) => {
    setFormErrors([]);

    const payload = {
      name: values.name,
      slug: values.slug || undefined,
      description: values.description || undefined,
      parentId: parentId === NO_PARENT ? null : parentId,
      isActive,
      sortOrder: values.sortOrder,
      imageId: imageTouched ? (image?.id ?? null) : undefined,
    };

    try {
      if (isEdit && category) {
        await updateCategory.mutateAsync({ id: category.id, payload });
        toast.success(`"${values.name}" updated.`);
      } else {
        await createCategory.mutateAsync(payload);
        toast.success(`"${values.name}" created.`);
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
          <Label htmlFor="name">Name</Label>
          <Input id="name" aria-invalid={Boolean(errors.name)} {...register("name")} />
          {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            placeholder="Generated from the name"
            aria-invalid={Boolean(errors.slug)}
            {...register("slug")}
          />
          {errors.slug ? (
            <p className="text-sm text-destructive">{errors.slug.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Leave blank to generate one. Renaming does not change an existing slug.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="parentId">Parent category</Label>
          <Select value={parentId} onValueChange={setParentId} disabled={isPending}>
            <SelectTrigger id="parentId">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PARENT}>No parent (top level)</SelectItem>
              {options.map((node) => (
                <SelectItem key={node.id} value={node.id}>
                  {`${"— ".repeat(node.depth)}${node.name}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isEdit ? (
            <p className="text-xs text-muted-foreground">
              This category and everything under it are not listed, because a category
              cannot become its own ancestor.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="sortOrder">Sort order</Label>
          <Input
            id="sortOrder"
            type="number"
            min={0}
            max={9999}
            aria-invalid={Boolean(errors.sortOrder)}
            {...register("sortOrder")}
          />
          {errors.sortOrder ? (
            <p className="text-sm text-destructive">{errors.sortOrder.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">Lower numbers appear first.</p>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={2}
            aria-invalid={Boolean(errors.description)}
            {...register("description")}
          />
          {errors.description ? (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          ) : null}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>Image</Label>
          <MediaField
            value={currentImage}
            onChange={(asset) => {
              setImage(asset);
              setImageTouched(true);
            }}
            label="image"
            disabled={isPending}
          />
        </div>

        <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
          <div>
            <p className="text-sm font-medium">Active</p>
            <p className="text-xs text-muted-foreground">
              Inactive categories stay in the tree but can be filtered out.
            </p>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={setIsActive}
            disabled={isPending}
            aria-label="Active"
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {isEdit ? "Save changes" : "Create category"}
        </Button>
      </DialogFooter>
    </form>
  );
};

export const CategoryDialog = ({
  open,
  onOpenChange,
  category,
  defaultParentId,
  tree,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CategoryNode | null;
  defaultParentId?: string | null;
  tree: CategoryNode[];
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
        <DialogDescription>
          Categories nest without a depth limit, so Electronics &gt; Phones &gt; Android is one
          path through one table.
        </DialogDescription>
      </DialogHeader>

      {open ? (
        <CategoryForm
          key={category?.id ?? `new-${defaultParentId ?? "root"}`}
          category={category}
          defaultParentId={defaultParentId}
          tree={tree}
          onDone={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      ) : null}
    </DialogContent>
  </Dialog>
);
