"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { ListQuery } from "@/lib/types";

export const ATTRIBUTE_TYPES = [
  "DROPDOWN",
  "RADIO",
  "CHECKBOX",
  "COLOR_SWATCH",
  "IMAGE_SWATCH",
] as const;

export type AttributeType = (typeof ATTRIBUTE_TYPES)[number];

export const ATTRIBUTE_TYPE_LABELS: Record<AttributeType, string> = {
  DROPDOWN: "Dropdown",
  RADIO: "Radio",
  CHECKBOX: "Checkbox",
  COLOR_SWATCH: "Colour swatch",
  IMAGE_SWATCH: "Image swatch",
};

export interface AttributeValue {
  id: string;
  value: string;
  slug: string;
  colorCode: string | null;
  mediaId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  media: { id: string; url: string; thumbnailUrl: string | null; altText: string | null } | null;
}

export interface Attribute {
  id: string;
  name: string;
  slug: string;
  type: AttributeType;
  createdAt: string;
  updatedAt: string;
  values: AttributeValue[];
  _count: { values: number };
}

export interface ValueInput {
  value: string;
  slug?: string;
  colorCode?: string | null;
  mediaId?: string | null;
  sortOrder?: number;
}

const ATTRIBUTES_KEY = ["attributes"] as const;

export const useAttributes = (query: ListQuery) =>
  useQuery({
    queryKey: [...ATTRIBUTES_KEY, "list", query],
    queryFn: () => api.list<Attribute>("/attributes", query),
  });

const invalidate = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.invalidateQueries({ queryKey: ATTRIBUTES_KEY });
};

export const useCreateAttribute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { name: string; slug?: string; type: AttributeType; values: ValueInput[] }) =>
      api.post<Attribute>("/attributes", payload),
    onSuccess: () => invalidate(queryClient),
  });
};

export const useUpdateAttribute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { name?: string; slug?: string; type?: AttributeType };
    }) => api.patch<Attribute>(`/attributes/${id}`, payload),
    onSuccess: () => invalidate(queryClient),
  });
};

export const useDeleteAttribute = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ id: string; name: string; deletedValues: number }>(`/attributes/${id}`),
    onSuccess: () => invalidate(queryClient),
  });
};

export const useAddValues = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: ValueInput[] }) =>
      api.post<Attribute>(`/attributes/${id}/values`, { values }),
    onSuccess: () => invalidate(queryClient),
  });
};

export const useUpdateValue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      valueId,
      payload,
    }: {
      id: string;
      valueId: string;
      payload: ValueInput;
    }) => api.patch<AttributeValue>(`/attributes/${id}/values/${valueId}`, payload),
    onSuccess: () => invalidate(queryClient),
  });
};

export const useDeleteValue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, valueId }: { id: string; valueId: string }) =>
      api.delete<{ id: string; value: string }>(`/attributes/${id}/values/${valueId}`),
    onSuccess: () => invalidate(queryClient),
  });
};

/** The server requires a hex for colour swatches and a media id for image swatches. */
export const requiresColor = (type: AttributeType): boolean => type === "COLOR_SWATCH";
export const requiresMedia = (type: AttributeType): boolean => type === "IMAGE_SWATCH";
