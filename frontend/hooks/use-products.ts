"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { ListQuery } from "@/lib/types";

export type StockStatus = "IN_STOCK" | "OUT_OF_STOCK" | "LOW_STOCK";

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  IN_STOCK: "In stock",
  LOW_STOCK: "Low stock",
  OUT_OF_STOCK: "Out of stock",
};

export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  sku: string;
  hasVariants: boolean;
  price: number | null;
  salePrice: number | null;
  priceRange: { min: number; max: number } | null;
  stock: number | null;
  stockStatus: StockStatus | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  variantCount: number;
  createdAt: string;
  updatedAt: string;
  brand: { id: string; name: string; slug: string } | null;
  categories: { id: string; name: string; slug: string }[];
  thumbnail: { id: string; url: string; thumbnailUrl: string | null; altText: string | null } | null;
}

export interface VariantAttributeValue {
  id: string;
  value: string;
  slug: string;
  colorCode: string | null;
  mediaId: string | null;
  attribute: { id: string; name: string; slug: string; type: string };
}

export interface MediaAttachment {
  id: string;
  mediaId: string;
  variantId: string | null;
  attributeValueId: string | null;
  isThumbnail: boolean;
  isGallery: boolean;
  sortOrder: number;
  media: {
    id: string;
    url: string;
    thumbnailUrl: string | null;
    altText: string | null;
    title: string | null;
    type: string;
  };
}

export interface ProductVariant {
  id: string;
  sku: string;
  price: number;
  salePrice: number | null;
  stock: number;
  stockStatus: StockStatus;
  lowStockThreshold: number | null;
  weight: number | null;
  isActive: boolean;
  attributeValues: VariantAttributeValue[];
  media: MediaAttachment[];
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  longDescription: string | null;
  hasVariants: boolean;
  price: number | null;
  salePrice: number | null;
  stock: number | null;
  stockStatus: StockStatus | null;
  lowStockThreshold: number | null;
  weight: number | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  brandId: string | null;
  brand: { id: string; name: string; slug: string; status: string } | null;
  categories: { id: string; name: string; slug: string; parentId: string | null }[];
  attributes: { id: string; name: string; slug: string; type: string }[];
  media: MediaAttachment[];
  variants: ProductVariant[];
}

export interface VariantInput {
  sku: string;
  attributeValueIds: string[];
  price: number;
  salePrice?: number | null;
  stock?: number;
  lowStockThreshold?: number | null;
  weight?: number | null;
  isActive?: boolean;
  mediaIds?: string[];
}

export interface MediaAttachmentInput {
  mediaId: string;
  variantId?: string | null;
  attributeValueId?: string | null;
  isThumbnail?: boolean;
  isGallery?: boolean;
  sortOrder?: number;
}

export interface CreateProductPayload {
  name: string;
  slug?: string;
  sku: string;
  shortDescription?: string;
  longDescription?: string;
  hasVariants?: boolean;
  price?: number;
  salePrice?: number | null;
  stock?: number;
  lowStockThreshold?: number | null;
  weight?: number | null;
  isActive?: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
  brandId?: string | null;
  categoryIds?: string[];
  attributeIds?: string[];
  media?: MediaAttachmentInput[];
  variants?: VariantInput[];
}

export type UpdateProductPayload = Omit<CreateProductPayload, "media" | "variants" | "hasVariants">;

const PRODUCTS_KEY = ["products"] as const;

export const useProducts = (query: ListQuery) =>
  useQuery({
    queryKey: [...PRODUCTS_KEY, "list", query],
    queryFn: () => api.list<ProductRow>("/products", query),
  });

export const useProduct = (id: string | undefined) =>
  useQuery({
    queryKey: [...PRODUCTS_KEY, "detail", id],
    queryFn: () => api.get<ProductDetail>(`/products/${id}`),
    enabled: Boolean(id),
  });

/**
 * The edit screen addresses a product by slug so its id never reaches the address
 * bar. The id still comes back in the payload, which the mutations below need.
 */
export const useProductBySlug = (slug: string | undefined) =>
  useQuery({
    queryKey: [...PRODUCTS_KEY, "detail", "slug", slug],
    queryFn: () => api.get<ProductDetail>(`/products/slug/${encodeURIComponent(slug ?? "")}`),
    enabled: Boolean(slug),
  });

const invalidateProducts = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProductPayload) =>
      api.post<ProductDetail>("/products", payload),
    onSuccess: () => invalidateProducts(queryClient),
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProductPayload }) =>
      api.patch<ProductDetail>(`/products/${id}`, payload),
    onSuccess: () => invalidateProducts(queryClient),
  });
};

export const useAddVariant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: VariantInput }) =>
      api.post<ProductVariant>(`/products/${id}/variants`, payload),
    onSuccess: () => invalidateProducts(queryClient),
  });
};

export const useUpdateVariant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      variantId,
      payload,
    }: {
      id: string;
      variantId: string;
      payload: Partial<VariantInput>;
    }) => api.patch<ProductVariant>(`/products/${id}/variants/${variantId}`, payload),
    onSuccess: () => invalidateProducts(queryClient),
  });
};

export const useDeleteVariant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, variantId }: { id: string; variantId: string }) =>
      api.delete<{ id: string; sku: string }>(`/products/${id}/variants/${variantId}`),
    onSuccess: () => invalidateProducts(queryClient),
  });
};

export const useGenerateVariants = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        attributes: { attributeId: string; valueIds: string[] }[];
        skuPrefix?: string;
        price: number;
        salePrice?: number | null;
        stock?: number;
        replaceExisting?: boolean;
      };
    }) =>
      api.post<{ created: number; skipped: number; product: ProductDetail }>(
        `/products/${id}/variants/generate`,
        payload,
      ),
    onSuccess: () => invalidateProducts(queryClient),
  });
};

export const useAttachMedia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, attachments }: { id: string; attachments: MediaAttachmentInput[] }) =>
      api.post<ProductDetail>(`/products/${id}/media`, { attachments }),
    onSuccess: () => invalidateProducts(queryClient),
  });
};

export const useUpdateAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      attachmentId,
      payload,
    }: {
      id: string;
      attachmentId: string;
      payload: { isThumbnail?: boolean; isGallery?: boolean; sortOrder?: number };
    }) => api.patch<MediaAttachment>(`/products/${id}/media/${attachmentId}`, payload),
    onSuccess: () => invalidateProducts(queryClient),
  });
};

export const useReorderMedia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      order,
    }: {
      id: string;
      order: { attachmentId: string; sortOrder: number }[];
    }) => api.patch<ProductDetail>(`/products/${id}/media/reorder`, { order }),
    onSuccess: () => invalidateProducts(queryClient),
  });
};

export const useDetachMedia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, attachmentId }: { id: string; attachmentId: string }) =>
      api.delete<{ id: string; mediaId: string; mediaAssetKept: boolean }>(
        `/products/${id}/media/${attachmentId}`,
      ),
    onSuccess: () => invalidateProducts(queryClient),
  });
};

/** Cartesian product of the chosen attribute values, used to seed the variant matrix. */
export const buildCombinations = (groups: string[][]): string[][] =>
  groups.reduce<string[][]>(
    (acc, group) => acc.flatMap((combo) => group.map((value) => [...combo, value])),
    [[]],
  );

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{
        id: string;
        name: string;
        sku: string;
        deletedVariants: number;
        detachedMedia: number;
      }>(`/products/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
      // Deleting a product frees its brand and categories for deletion.
      void queryClient.invalidateQueries({ queryKey: ["brands"] });
      void queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
};

const amountFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatAmount = (value: number): string => amountFormatter.format(value);

/** A simple product shows one price; a variable one shows the range across its variants. */
export const priceLabel = (product: ProductRow): string => {
  if (product.hasVariants) {
    if (!product.priceRange) return "No variants";
    const { min, max } = product.priceRange;
    return min === max ? formatAmount(min) : `${formatAmount(min)} – ${formatAmount(max)}`;
  }

  if (product.price === null) return "—";
  return formatAmount(product.salePrice ?? product.price);
};
