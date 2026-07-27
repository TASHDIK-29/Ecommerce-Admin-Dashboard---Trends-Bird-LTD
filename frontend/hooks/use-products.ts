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

const PRODUCTS_KEY = ["products"] as const;

export const useProducts = (query: ListQuery) =>
  useQuery({
    queryKey: [...PRODUCTS_KEY, "list", query],
    queryFn: () => api.list<ProductRow>("/products", query),
  });

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
