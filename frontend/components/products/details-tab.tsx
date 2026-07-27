"use client";

import type { UseFormRegister, FieldErrors } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export interface DetailsValues {
  name: string;
  slug?: string;
  sku: string;
  shortDescription?: string;
  longDescription?: string;
  price?: string;
  salePrice?: string;
  stock?: string;
  lowStockThreshold?: string;
  weight?: string;
  sortOrder: string;
}

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="text-sm text-destructive">{message}</p> : null;

export const DetailsTab = ({
  register,
  errors,
  hasVariants,
  onHasVariantsChange,
  canToggleKind,
  isActive,
  onIsActiveChange,
  isFeatured,
  onIsFeaturedChange,
  disabled,
}: {
  register: UseFormRegister<DetailsValues>;
  errors: FieldErrors<DetailsValues>;
  hasVariants: boolean;
  onHasVariantsChange: (next: boolean) => void;
  canToggleKind: boolean;
  isActive: boolean;
  onIsActiveChange: (next: boolean) => void;
  isFeatured: boolean;
  onIsFeaturedChange: (next: boolean) => void;
  disabled: boolean;
}) => (
  <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" aria-invalid={Boolean(errors.name)} {...register("name")} />
        <FieldError message={errors.name?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sku">SKU</Label>
        <Input id="sku" placeholder="TEE-001" aria-invalid={Boolean(errors.sku)} {...register("sku")} />
        <FieldError message={errors.sku?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          placeholder="Generated from the name"
          aria-invalid={Boolean(errors.slug)}
          {...register("slug")}
        />
        <FieldError message={errors.slug?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="sortOrder">Sort order</Label>
        <Input
          id="sortOrder"
          type="number"
          min={0}
          aria-invalid={Boolean(errors.sortOrder)}
          {...register("sortOrder")}
        />
        <FieldError message={errors.sortOrder?.message} />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="shortDescription">Short description</Label>
        <Textarea id="shortDescription" rows={2} {...register("shortDescription")} />
        <FieldError message={errors.shortDescription?.message} />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="longDescription">Long description</Label>
        <Textarea id="longDescription" rows={5} {...register("longDescription")} />
        <FieldError message={errors.longDescription?.message} />
      </div>
    </div>

    <div className="space-y-3 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">This product has variants</p>
          <p className="text-xs text-muted-foreground">
            A simple product carries its own price and stock. A variable one carries them on
            each variant instead.
          </p>
        </div>
        <Switch
          checked={hasVariants}
          onCheckedChange={onHasVariantsChange}
          disabled={disabled || !canToggleKind}
          aria-label="Has variants"
        />
      </div>

      {!canToggleKind ? (
        <Alert>
          <AlertDescription>
            Simple and variable products store price and stock differently, so this cannot be
            switched after creation. Create a new product instead.
          </AlertDescription>
        </Alert>
      ) : null}

      {hasVariants ? (
        <Alert>
          <AlertDescription>
            Price and stock move to the Variants tab. The server rejects a price on a variable
            product.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              aria-invalid={Boolean(errors.price)}
              {...register("price")}
            />
            <FieldError message={errors.price?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="salePrice">Sale price</Label>
            <Input
              id="salePrice"
              type="number"
              step="0.01"
              min="0"
              aria-invalid={Boolean(errors.salePrice)}
              {...register("salePrice")}
            />
            <FieldError message={errors.salePrice?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock">Stock</Label>
            <Input
              id="stock"
              type="number"
              min="0"
              aria-invalid={Boolean(errors.stock)}
              {...register("stock")}
            />
            <FieldError message={errors.stock?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lowStockThreshold">Low stock at</Label>
            <Input
              id="lowStockThreshold"
              type="number"
              min="0"
              aria-invalid={Boolean(errors.lowStockThreshold)}
              {...register("lowStockThreshold")}
            />
            <FieldError message={errors.lowStockThreshold?.message} />
          </div>
        </div>
      )}
    </div>

    <div className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="weight">Weight</Label>
        <Input id="weight" type="number" step="0.001" min="0" {...register("weight")} />
        <FieldError message={errors.weight?.message} />
      </div>

      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <p className="text-sm font-medium">Active</p>
          <p className="text-xs text-muted-foreground">Published</p>
        </div>
        <Switch
          checked={isActive}
          onCheckedChange={onIsActiveChange}
          disabled={disabled}
          aria-label="Active"
        />
      </div>

      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <p className="text-sm font-medium">Featured</p>
          <p className="text-xs text-muted-foreground">Promoted</p>
        </div>
        <Switch
          checked={isFeatured}
          onCheckedChange={onIsFeaturedChange}
          disabled={disabled}
          aria-label="Featured"
        />
      </div>
    </div>
  </div>
);
