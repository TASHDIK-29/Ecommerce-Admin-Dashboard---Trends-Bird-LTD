"use client";

import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAttributes, type Attribute } from "@/hooks/use-attributes";
import {
  buildCombinations,
  useDeleteVariant,
  useGenerateVariants,
  useUpdateVariant,
  type ProductVariant,
} from "@/hooks/use-products";
import { errorMessage } from "@/lib/form-errors";

export interface DraftVariant {
  key: string;
  attributeValueIds: string[];
  labels: string[];
  sku: string;
  price: string;
  salePrice: string;
  stock: string;
}

const ValueSelector = ({
  attributes,
  selected,
  onChange,
  disabled,
}: {
  attributes: Attribute[];
  selected: Record<string, string[]>;
  onChange: (next: Record<string, string[]>) => void;
  disabled: boolean;
}) => (
  <div className="space-y-3">
    {attributes.map((attribute) => {
      const chosen = selected[attribute.id] ?? [];

      return (
        <div key={attribute.id} className="rounded-md border p-3">
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-sm">{attribute.name}</Label>
            <span className="text-xs text-muted-foreground">{chosen.length} selected</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {attribute.values.map((value) => (
              <label
                key={value.id}
                className="flex cursor-pointer items-center gap-2 rounded border px-2 py-1 text-sm hover:bg-accent"
              >
                <Checkbox
                  checked={chosen.includes(value.id)}
                  disabled={disabled}
                  onCheckedChange={(checked) =>
                    onChange({
                      ...selected,
                      [attribute.id]: checked
                        ? [...chosen, value.id]
                        : chosen.filter((id) => id !== value.id),
                    })
                  }
                />
                {value.colorCode ? (
                  <span
                    className="size-3 rounded-full border"
                    style={{ backgroundColor: value.colorCode }}
                    aria-hidden
                  />
                ) : null}
                {value.value}
              </label>
            ))}
            {attribute.values.length === 0 ? (
              <span className="text-sm text-muted-foreground">This attribute has no values.</span>
            ) : null}
          </div>
        </div>
      );
    })}
  </div>
);

const LiveVariantRow = ({
  productId,
  variant,
  disabled,
}: {
  productId: string;
  variant: ProductVariant;
  disabled: boolean;
}) => {
  const updateVariant = useUpdateVariant();
  const deleteVariant = useDeleteVariant();

  const [sku, setSku] = useState(variant.sku);
  const [price, setPrice] = useState(String(variant.price));
  const [salePrice, setSalePrice] = useState(
    variant.salePrice === null ? "" : String(variant.salePrice),
  );
  const [stock, setStock] = useState(String(variant.stock));

  const dirty =
    sku !== variant.sku ||
    price !== String(variant.price) ||
    salePrice !== (variant.salePrice === null ? "" : String(variant.salePrice)) ||
    stock !== String(variant.stock);

  const busy = disabled || updateVariant.isPending || deleteVariant.isPending;

  const save = async () => {
    try {
      await updateVariant.mutateAsync({
        id: productId,
        variantId: variant.id,
        payload: {
          sku,
          price: Number(price),
          salePrice: salePrice === "" ? null : Number(salePrice),
          stock: Number(stock),
        },
      });
      toast.success(`Variant "${sku}" saved.`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const remove = async () => {
    try {
      await deleteVariant.mutateAsync({ id: productId, variantId: variant.id });
      toast.success(`Variant "${variant.sku}" removed.`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {variant.attributeValues.map((value) => (
            <Badge key={value.id} variant="secondary" className="gap-1 text-[10px]">
              {value.colorCode ? (
                <span
                  className="size-2 rounded-full border"
                  style={{ backgroundColor: value.colorCode }}
                  aria-hidden
                />
              ) : null}
              {value.attribute.name}: {value.value}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell>
        <Input value={sku} onChange={(e) => setSku(e.target.value)} disabled={busy} className="w-40" />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={busy}
          className="w-24"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={salePrice}
          onChange={(e) => setSalePrice(e.target.value)}
          disabled={busy}
          className="w-24"
          placeholder="—"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min="0"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          disabled={busy}
          className="w-20"
        />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {dirty ? (
            <Button type="button" size="sm" onClick={save} disabled={busy}>
              {updateVariant.isPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : null}
              Save
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={remove}
            disabled={busy}
            aria-label={`Delete variant ${variant.sku}`}
          >
            <Trash2 className="size-4 text-destructive" aria-hidden />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export const VariantsTab = ({
  productId,
  variants,
  attributeIds,
  drafts,
  onDraftsChange,
  skuPrefix,
  disabled,
}: {
  productId?: string;
  variants?: ProductVariant[];
  attributeIds: string[];
  drafts: DraftVariant[];
  onDraftsChange: (next: DraftVariant[]) => void;
  skuPrefix: string;
  disabled: boolean;
}) => {
  const attributesQuery = useAttributes({ limit: 100 });
  const generateVariants = useGenerateVariants();

  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [basePrice, setBasePrice] = useState("0");
  const [baseStock, setBaseStock] = useState("0");

  const all = attributesQuery.data?.data ?? [];
  const participating = all.filter((attribute) => attributeIds.includes(attribute.id));

  const chosenGroups = participating
    .map((attribute) => selected[attribute.id] ?? [])
    .filter((group) => group.length > 0);

  const combinationCount = chosenGroups.reduce((total, group) => total * group.length, 1);
  const canGenerate = chosenGroups.length > 0 && combinationCount > 0;

  const labelFor = (valueId: string) => {
    for (const attribute of all) {
      const value = attribute.values.find((item) => item.id === valueId);
      if (value) return value.value;
    }
    return "";
  };

  const generateDrafts = () => {
    const groups = participating
      .map((attribute) => selected[attribute.id] ?? [])
      .filter((group) => group.length > 0);

    const combinations = buildCombinations(groups);
    const existing = new Set(drafts.map((draft) => [...draft.attributeValueIds].sort().join("|")));

    const additions = combinations
      .filter((combination) => !existing.has([...combination].sort().join("|")))
      .map((combination) => {
        const labels = combination.map(labelFor);
        const suffix = labels.join("-").toUpperCase().replace(/[^A-Z0-9-]/g, "");
        return {
          key: crypto.randomUUID(),
          attributeValueIds: combination,
          labels,
          sku: `${skuPrefix || "VAR"}-${suffix}`,
          price: basePrice || "0",
          salePrice: "",
          stock: baseStock || "0",
        };
      });

    if (additions.length === 0) {
      toast.info("Every combination is already in the list.");
      return;
    }

    onDraftsChange([...drafts, ...additions]);
    toast.success(`${additions.length} combination(s) added.`);
  };

  const generateLive = async () => {
    if (!productId) return;

    const attributes = participating
      .filter((attribute) => (selected[attribute.id] ?? []).length > 0)
      .map((attribute) => ({ attributeId: attribute.id, valueIds: selected[attribute.id] }));

    try {
      const result = await generateVariants.mutateAsync({
        id: productId,
        payload: {
          attributes,
          skuPrefix: skuPrefix || undefined,
          price: Number(basePrice) || 0,
          stock: Number(baseStock) || 0,
        },
      });
      toast.success(`${result.created} variant(s) generated, ${result.skipped} already existed.`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  if (attributeIds.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          Pick the participating attributes on the <strong>Brand &amp; categories</strong> tab
          first. Those are the dimensions this product varies along.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <Label className="text-sm">Choose the values that take part</Label>
          <p className="text-xs text-muted-foreground">
            Every combination of the ticked values becomes a variant. Remove the ones you do
            not stock.
          </p>
        </div>

        <ValueSelector
          attributes={participating}
          selected={selected}
          onChange={setSelected}
          disabled={disabled}
        />

        <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
          <div className="space-y-1">
            <Label htmlFor="basePrice" className="text-xs">
              Starting price
            </Label>
            <Input
              id="basePrice"
              type="number"
              step="0.01"
              min="0"
              value={basePrice}
              onChange={(event) => setBasePrice(event.target.value)}
              className="w-28"
              disabled={disabled}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="baseStock" className="text-xs">
              Starting stock
            </Label>
            <Input
              id="baseStock"
              type="number"
              min="0"
              value={baseStock}
              onChange={(event) => setBaseStock(event.target.value)}
              className="w-24"
              disabled={disabled}
            />
          </div>

          <Button
            type="button"
            variant="secondary"
            disabled={disabled || !canGenerate || generateVariants.isPending}
            onClick={() => (productId ? void generateLive() : generateDrafts())}
          >
            {generateVariants.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-4" aria-hidden />
            )}
            Generate {canGenerate ? `${combinationCount} ` : ""}combination
            {combinationCount === 1 ? "" : "s"}
          </Button>
        </div>
      </div>

      {productId ? (
        <div className="space-y-2">
          <Label className="text-sm">Variants</Label>
          {(variants ?? []).length === 0 ? (
            <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
              No variants yet. Generate combinations above.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Combination</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Sale</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(variants ?? []).map((variant) => (
                    <LiveVariantRow
                      key={variant.id}
                      productId={productId}
                      variant={variant}
                      disabled={disabled}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Changes here save immediately. Each variant needs a unique SKU, and no two
            variants may share the same combination.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label className="text-sm">Variants to create ({drafts.length})</Label>
          {drafts.length === 0 ? (
            <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
              No variants yet. Tick some values and generate the combinations.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Combination</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Sale</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead className="text-right">Remove</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drafts.map((draft, index) => {
                    const patch = (changes: Partial<DraftVariant>) =>
                      onDraftsChange(
                        drafts.map((item, position) =>
                          position === index ? { ...item, ...changes } : item,
                        ),
                      );

                    return (
                      <TableRow key={draft.key}>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {draft.labels.map((label) => (
                              <Badge key={label} variant="secondary" className="text-[10px]">
                                {label}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={draft.sku}
                            onChange={(event) => patch({ sku: event.target.value })}
                            disabled={disabled}
                            className="w-44"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={draft.price}
                            onChange={(event) => patch({ price: event.target.value })}
                            disabled={disabled}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={draft.salePrice}
                            onChange={(event) => patch({ salePrice: event.target.value })}
                            disabled={disabled}
                            className="w-24"
                            placeholder="—"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={draft.stock}
                            onChange={(event) => patch({ stock: event.target.value })}
                            disabled={disabled}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={disabled}
                            onClick={() =>
                              onDraftsChange(drafts.filter((item) => item.key !== draft.key))
                            }
                            aria-label={`Remove ${draft.sku}`}
                          >
                            <Trash2 className="size-4 text-destructive" aria-hidden />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
