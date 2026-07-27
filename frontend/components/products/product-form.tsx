"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { DetailsTab, type DetailsValues } from "@/components/products/details-tab";
import { MediaTab, type DraftAttachment } from "@/components/products/media-tab";
import { OrganisationTab } from "@/components/products/organisation-tab";
import { VariantsTab, type DraftVariant } from "@/components/products/variants-tab";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCreateProduct,
  useUpdateProduct,
  type CreateProductPayload,
  type ProductDetail,
} from "@/hooks/use-products";
import { applyApiErrors } from "@/lib/form-errors";

/**
 * Inputs hand back strings, so the schema validates strings and the conversion
 * to numbers happens once, at submit. Coercing inside the schema would make the
 * resolver's output type disagree with the form's own values.
 */
const isNonNegative = (value: string, integer: boolean) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && (!integer || Number.isInteger(parsed));
};

const optionalNumber = (label: string, integer = false) =>
  z
    .union([
      z.literal(""),
      z
        .string()
        .refine(
          (value) => isNonNegative(value, integer),
          `${label} must be a ${integer ? "whole " : ""}number and cannot be negative.`,
        ),
    ])
    .optional();

const schema = z.object({
  name: z.string().trim().min(2, "At least 2 characters.").max(200),
  slug: z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens only."),
    ])
    .optional(),
  sku: z
    .string()
    .trim()
    .min(1, "A SKU is required.")
    .max(64)
    .regex(/^[A-Za-z0-9._-]+$/, "Letters, numbers, dots, hyphens and underscores only."),
  shortDescription: z.string().trim().max(500).optional(),
  longDescription: z.string().trim().max(20000).optional(),
  price: optionalNumber("Price"),
  salePrice: optionalNumber("Sale price"),
  stock: optionalNumber("Stock", true),
  lowStockThreshold: optionalNumber("Low stock threshold", true),
  weight: optionalNumber("Weight"),
  sortOrder: z
    .string()
    .refine((value) => isNonNegative(value, true), "Sort order must be a whole number."),
});

const FIELDS = [
  "name",
  "slug",
  "sku",
  "shortDescription",
  "longDescription",
  "price",
  "salePrice",
  "stock",
  "lowStockThreshold",
  "weight",
  "sortOrder",
  "categoryIds",
  "attributeIds",
  "variants",
  "media",
  "brandId",
] as const;

const NO_BRAND = "none";

const numberOrUndefined = (value?: string) =>
  value === undefined || value === "" ? undefined : Number(value);

export const ProductForm = ({ product }: { product?: ProductDetail }) => {
  const router = useRouter();
  const isEdit = Boolean(product);

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const [tab, setTab] = useState("details");
  const [hasVariants, setHasVariants] = useState(product?.hasVariants ?? false);
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false);
  const [brandId, setBrandId] = useState(product?.brandId ?? NO_BRAND);
  const [categoryIds, setCategoryIds] = useState<string[]>(
    product?.categories.map((category) => category.id) ?? [],
  );
  const [attributeIds, setAttributeIds] = useState<string[]>(
    product?.attributes.map((attribute) => attribute.id) ?? [],
  );
  const [mediaDrafts, setMediaDrafts] = useState<DraftAttachment[]>([]);
  const [variantDrafts, setVariantDrafts] = useState<DraftVariant[]>([]);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<DetailsValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: product?.name ?? "",
      slug: product?.slug ?? "",
      sku: product?.sku ?? "",
      shortDescription: product?.shortDescription ?? "",
      longDescription: product?.longDescription ?? "",
      price: product?.price === null || product?.price === undefined ? "" : String(product.price),
      salePrice:
        product?.salePrice === null || product?.salePrice === undefined
          ? ""
          : String(product.salePrice),
      stock: product?.stock === null || product?.stock === undefined ? "" : String(product.stock),
      lowStockThreshold:
        product?.lowStockThreshold === null || product?.lowStockThreshold === undefined
          ? ""
          : String(product.lowStockThreshold),
      weight:
        product?.weight === null || product?.weight === undefined ? "" : String(product.weight),
      sortOrder: String(product?.sortOrder ?? 0),
    },
  });

  const isPending = createProduct.isPending || updateProduct.isPending;

  const onSubmit = handleSubmit(async (values) => {
    setFormErrors([]);

    if (!isEdit && hasVariants && variantDrafts.length === 0) {
      setFormErrors(["A variable product needs at least one variant. Generate them on the Variants tab."]);
      setTab("variants");
      return;
    }

    if (!isEdit && !hasVariants && (values.price === "" || values.price === undefined)) {
      setFormErrors(["A simple product needs a price."]);
      setTab("details");
      return;
    }

    const shared = {
      name: values.name,
      slug: values.slug || undefined,
      sku: values.sku,
      shortDescription: values.shortDescription || undefined,
      longDescription: values.longDescription || undefined,
      weight: numberOrUndefined(values.weight),
      isActive,
      isFeatured,
      sortOrder: Number(values.sortOrder),
      brandId: brandId === NO_BRAND ? null : brandId,
      categoryIds,
      attributeIds,
    };

    try {
      if (isEdit && product) {
        await updateProduct.mutateAsync({
          id: product.id,
          payload: {
            ...shared,
            // Price and stock only exist on a simple product; sending them for a
            // variable one is rejected by the server.
            ...(product.hasVariants
              ? {}
              : {
                  price: numberOrUndefined(values.price),
                  salePrice:
                    values.salePrice === "" ? null : numberOrUndefined(values.salePrice),
                  stock: numberOrUndefined(values.stock),
                  lowStockThreshold:
                    values.lowStockThreshold === ""
                      ? null
                      : numberOrUndefined(values.lowStockThreshold),
                }),
          },
        });
        toast.success(`"${values.name}" saved.`);
        router.push("/products");
        return;
      }

      const payload: CreateProductPayload = {
        ...shared,
        hasVariants,
        ...(hasVariants
          ? {}
          : {
              price: numberOrUndefined(values.price),
              salePrice: values.salePrice === "" ? null : numberOrUndefined(values.salePrice),
              stock: numberOrUndefined(values.stock) ?? 0,
              lowStockThreshold:
                values.lowStockThreshold === ""
                  ? null
                  : numberOrUndefined(values.lowStockThreshold),
            }),
        media: mediaDrafts.map((draft, index) => ({
          mediaId: draft.mediaId,
          isThumbnail: draft.isThumbnail,
          isGallery: draft.isGallery,
          sortOrder: index,
        })),
        variants: hasVariants
          ? variantDrafts.map((draft) => ({
              sku: draft.sku,
              attributeValueIds: draft.attributeValueIds,
              price: Number(draft.price) || 0,
              salePrice: draft.salePrice === "" ? null : Number(draft.salePrice),
              stock: Number(draft.stock) || 0,
            }))
          : undefined,
      };

      const created = await createProduct.mutateAsync(payload);
      toast.success(
        `"${created.name}" created${created.variants.length > 0 ? ` with ${created.variants.length} variant(s)` : ""}.`,
      );
      router.push(`/products/${created.id}/edit`);
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

      {!isEdit ? (
        <Alert>
          <AlertDescription>
            Everything below is saved in one request. If any variant fails validation, no
            half-built product is left behind.
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="organisation">Brand &amp; categories</TabsTrigger>
          <TabsTrigger value="media">
            Media{isEdit ? "" : mediaDrafts.length > 0 ? ` (${mediaDrafts.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="variants" disabled={!hasVariants}>
            Variants
            {hasVariants
              ? isEdit
                ? ` (${product?.variants.length ?? 0})`
                : variantDrafts.length > 0
                  ? ` (${variantDrafts.length})`
                  : ""
              : ""}
          </TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <CardContent className="pt-6">
            <TabsContent value="details" className="mt-0">
              <DetailsTab
                register={register}
                errors={errors}
                hasVariants={hasVariants}
                onHasVariantsChange={setHasVariants}
                canToggleKind={!isEdit}
                isActive={isActive}
                onIsActiveChange={setIsActive}
                isFeatured={isFeatured}
                onIsFeaturedChange={setIsFeatured}
                disabled={isPending}
              />
            </TabsContent>

            <TabsContent value="organisation" className="mt-0">
              <OrganisationTab
                brandId={brandId}
                onBrandChange={setBrandId}
                categoryIds={categoryIds}
                onCategoriesChange={setCategoryIds}
                attributeIds={attributeIds}
                onAttributesChange={setAttributeIds}
                showAttributes={hasVariants}
                disabled={isPending}
              />
            </TabsContent>

            <TabsContent value="media" className="mt-0">
              <MediaTab
                productId={product?.id}
                attachments={product?.media}
                drafts={mediaDrafts}
                onDraftsChange={setMediaDrafts}
                disabled={isPending}
              />
            </TabsContent>

            <TabsContent value="variants" className="mt-0">
              <VariantsTab
                productId={product?.id}
                variants={product?.variants}
                attributeIds={attributeIds}
                drafts={variantDrafts}
                onDraftsChange={setVariantDrafts}
                skuPrefix={product?.sku ?? ""}
                disabled={isPending}
              />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/products")}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {isEdit ? "Save changes" : "Create product"}
        </Button>
      </div>
    </form>
  );
};
