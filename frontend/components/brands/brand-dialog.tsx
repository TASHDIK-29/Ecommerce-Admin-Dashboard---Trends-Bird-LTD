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
import { Textarea } from "@/components/ui/textarea";
import { useCreateBrand, useUpdateBrand, type Brand, type BrandStatus } from "@/hooks/use-brands";
import { useMediaAsset, type MediaAsset } from "@/hooks/use-media";
import { applyApiErrors } from "@/lib/form-errors";

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
});

type FormValues = z.infer<typeof schema>;

const FIELDS = ["name", "slug", "description", "logoId", "status"] as const;

const BrandForm = ({
  brand,
  onDone,
  onCancel,
}: {
  brand?: Brand | null;
  onDone: () => void;
  onCancel: () => void;
}) => {
  const isEdit = Boolean(brand);
  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();
  const logoQuery = useMediaAsset(brand?.logoId);

  const [status, setStatus] = useState<BrandStatus>(brand?.status ?? "ACTIVE");
  const [logo, setLogo] = useState<MediaAsset | null>(null);
  const [logoTouched, setLogoTouched] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: brand?.name ?? "",
      slug: brand?.slug ?? "",
      description: brand?.description ?? "",
    },
  });

  const isPending = createBrand.isPending || updateBrand.isPending;
  const currentLogo = logoTouched ? logo : (logoQuery.data ?? null);

  const onSubmit = handleSubmit(async (values) => {
    setFormErrors([]);

    const payload = {
      name: values.name,
      slug: values.slug || undefined,
      description: values.description || undefined,
      status,
      logoId: logoTouched ? (logo?.id ?? null) : undefined,
    };

    try {
      if (isEdit && brand) {
        await updateBrand.mutateAsync({ id: brand.id, payload });
        toast.success(`"${values.name}" updated.`);
      } else {
        await createBrand.mutateAsync(payload);
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
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as BrandStatus)}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Logo</Label>
          <MediaField
            value={currentLogo}
            onChange={(asset) => {
              setLogo(asset);
              setLogoTouched(true);
            }}
            label="logo"
            disabled={isPending}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={3}
            aria-invalid={Boolean(errors.description)}
            {...register("description")}
          />
          {errors.description ? (
            <p className="text-sm text-destructive">{errors.description.message}</p>
          ) : null}
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {isEdit ? "Save changes" : "Create brand"}
        </Button>
      </DialogFooter>
    </form>
  );
};

export const BrandDialog = ({
  open,
  onOpenChange,
  brand,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand?: Brand | null;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{brand ? "Edit brand" : "New brand"}</DialogTitle>
        <DialogDescription>
          A product has at most one brand, and a brand can have many products.
        </DialogDescription>
      </DialogHeader>

      {open ? (
        <BrandForm
          key={brand?.id ?? "new"}
          brand={brand}
          onDone={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      ) : null}
    </DialogContent>
  </Dialog>
);
