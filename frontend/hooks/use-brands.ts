"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { ListQuery } from "@/lib/types";

export type BrandStatus = "ACTIVE" | "INACTIVE";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoId: string | null;
  status: BrandStatus;
  createdAt: string;
  updatedAt: string;
  logo: { id: string; url: string; thumbnailUrl: string | null; altText: string | null } | null;
}

export interface BrandPayload {
  name?: string;
  slug?: string;
  description?: string;
  logoId?: string | null;
  status?: BrandStatus;
}

const BRANDS_KEY = ["brands"] as const;

export const useBrands = (query: ListQuery) =>
  useQuery({
    queryKey: [...BRANDS_KEY, "list", query],
    queryFn: () => api.list<Brand>("/brands", query),
  });

const invalidate = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.invalidateQueries({ queryKey: BRANDS_KEY });
};

export const useCreateBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BrandPayload) => api.post<Brand>("/brands", payload),
    onSuccess: () => invalidate(queryClient),
  });
};

export const useUpdateBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: BrandPayload }) =>
      api.patch<Brand>(`/brands/${id}`, payload),
    onSuccess: () => invalidate(queryClient),
  });
};

export const useDeleteBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<{ id: string; name: string }>(`/brands/${id}`),
    onSuccess: () => invalidate(queryClient),
  });
};
