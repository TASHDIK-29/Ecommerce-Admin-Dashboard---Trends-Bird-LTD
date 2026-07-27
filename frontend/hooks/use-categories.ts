"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { ListQuery } from "@/lib/types";

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageId: string | null;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
  depth: number;
  children: CategoryNode[];
}

export interface CategoryDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageId: string | null;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  image: { id: string; url: string; thumbnailUrl: string | null; altText: string | null } | null;
  parent: { id: string; name: string; slug: string } | null;
  children: { id: string; name: string; slug: string; isActive: boolean; sortOrder: number }[];
  _count: { children: number };
}

export interface CategoryPayload {
  name?: string;
  slug?: string;
  description?: string;
  imageId?: string | null;
  parentId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
}

const CATEGORIES_KEY = ["categories"] as const;

export const useCategoryTree = (query: { isActive?: string } = {}) =>
  useQuery({
    queryKey: [...CATEGORIES_KEY, "tree", query],
    queryFn: () => api.get<CategoryNode[]>("/categories/tree", query),
  });

export const useCategories = (query: ListQuery) =>
  useQuery({
    queryKey: [...CATEGORIES_KEY, "list", query],
    queryFn: () => api.list<CategoryDetail>("/categories", query),
  });

const invalidate = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CategoryPayload) => api.post<CategoryDetail>("/categories", payload),
    onSuccess: () => invalidate(queryClient),
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CategoryPayload }) =>
      api.patch<CategoryDetail>(`/categories/${id}`, payload),
    onSuccess: () => invalidate(queryClient),
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<{ id: string; name: string }>(`/categories/${id}`),
    onSuccess: () => invalidate(queryClient),
  });
};

/** Depth-first flatten, used to build the parent picker's indented options. */
export const flattenTree = (nodes: CategoryNode[]): CategoryNode[] =>
  nodes.flatMap((node) => [node, ...flattenTree(node.children)]);

/**
 * A category may not become its own ancestor, so the parent picker must not
 * offer the category itself or anything beneath it.
 */
export const collectSubtreeIds = (nodes: CategoryNode[], rootId: string): string[] => {
  const find = (list: CategoryNode[]): CategoryNode | undefined => {
    for (const node of list) {
      if (node.id === rootId) return node;
      const nested = find(node.children);
      if (nested) return nested;
    }
    return undefined;
  };

  const root = find(nodes);
  if (!root) return [rootId];

  const gather = (node: CategoryNode): string[] => [
    node.id,
    ...node.children.flatMap(gather),
  ];

  return gather(root);
};
