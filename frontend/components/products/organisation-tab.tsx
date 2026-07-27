"use client";

import { DataState } from "@/components/shared/data-state";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ATTRIBUTE_TYPE_LABELS, useAttributes, type AttributeType } from "@/hooks/use-attributes";
import { useBrands } from "@/hooks/use-brands";
import { flattenTree, useCategoryTree } from "@/hooks/use-categories";

const NO_BRAND = "none";

export const OrganisationTab = ({
  brandId,
  onBrandChange,
  categoryIds,
  onCategoriesChange,
  attributeIds,
  onAttributesChange,
  showAttributes,
  disabled,
}: {
  brandId: string;
  onBrandChange: (next: string) => void;
  categoryIds: string[];
  onCategoriesChange: (next: string[]) => void;
  attributeIds: string[];
  onAttributesChange: (next: string[]) => void;
  showAttributes: boolean;
  disabled: boolean;
}) => {
  const brandsQuery = useBrands({ limit: 100 });
  const categoryTree = useCategoryTree();
  const attributesQuery = useAttributes({ limit: 100 });

  const brands = brandsQuery.data?.data ?? [];
  const categories = flattenTree(categoryTree.data ?? []);
  const attributes = attributesQuery.data?.data ?? [];

  const toggle = (list: string[], id: string, onChange: (next: string[]) => void) =>
    onChange(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="brandId">Brand</Label>
        <Select value={brandId} onValueChange={onBrandChange} disabled={disabled}>
          <SelectTrigger id="brandId" className="sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_BRAND}>No brand</SelectItem>
            {brands.map((brand) => (
              <SelectItem key={brand.id} value={brand.id}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">At most one brand per product.</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Categories</Label>
          <span className="text-xs text-muted-foreground">{categoryIds.length} selected</span>
        </div>

        <DataState
          isLoading={categoryTree.isLoading}
          isError={categoryTree.isError}
          error={categoryTree.error}
          isEmpty={categories.length === 0}
          emptyTitle="No categories yet"
          emptyDescription="Create categories first, then file this product under them."
          onRetry={() => void categoryTree.refetch()}
          loadingRows={3}
          loadingColumns={2}
        >
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
            {categories.map((category) => (
              <label
                key={category.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                style={{ paddingLeft: `${category.depth * 16 + 8}px` }}
              >
                <Checkbox
                  checked={categoryIds.includes(category.id)}
                  disabled={disabled}
                  onCheckedChange={() => toggle(categoryIds, category.id, onCategoriesChange)}
                />
                {category.name}
                {!category.isActive ? (
                  <Badge variant="secondary" className="text-[10px]">
                    Inactive
                  </Badge>
                ) : null}
              </label>
            ))}
          </div>
        </DataState>
        <p className="text-xs text-muted-foreground">
          A product can sit in many categories, and a category can hold many products.
        </p>
      </div>

      {showAttributes ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Participating attributes</Label>
            <span className="text-xs text-muted-foreground">{attributeIds.length} selected</span>
          </div>

          <DataState
            isLoading={attributesQuery.isLoading}
            isError={attributesQuery.isError}
            error={attributesQuery.error}
            isEmpty={attributes.length === 0}
            emptyTitle="No attributes yet"
            emptyDescription="Create attributes such as Colour or Size before building variants."
            onRetry={() => void attributesQuery.refetch()}
            loadingRows={2}
            loadingColumns={2}
          >
            <div className="grid gap-2 rounded-md border p-2 sm:grid-cols-2">
              {attributes.map((attribute) => (
                <label
                  key={attribute.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <Checkbox
                    checked={attributeIds.includes(attribute.id)}
                    disabled={disabled}
                    onCheckedChange={() => toggle(attributeIds, attribute.id, onAttributesChange)}
                  />
                  <span className="flex-1">{attribute.name}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {ATTRIBUTE_TYPE_LABELS[attribute.type as AttributeType]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {attribute._count.values}
                  </span>
                </label>
              ))}
            </div>
          </DataState>
          <p className="text-xs text-muted-foreground">
            These are the dimensions this product varies along. The Variants tab builds
            combinations from their values.
          </p>
        </div>
      ) : null}
    </div>
  );
};
