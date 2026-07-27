"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { ListQuery } from "@/lib/types";
import { uploadMedia, type UploadProgress } from "@/lib/upload";

export type MediaType = "IMAGE" | "VIDEO";

export interface MediaAsset {
  id: string;
  fileName: string;
  url: string;
  thumbnailUrl: string | null;
  mimeType: string;
  type: MediaType;
  size: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  title: string | null;
  uploadedById: string | null;
  createdAt: string;
  updatedAt: string;
  uploadedBy?: { id: string; name: string; email: string } | null;
}

const MEDIA_KEY = ["media"] as const;

export const useMediaList = (query: ListQuery, enabled = true) =>
  useQuery({
    queryKey: [...MEDIA_KEY, "list", query],
    queryFn: () => api.list<MediaAsset>("/media", query),
    enabled,
  });

/** Resolves a stored id back to the asset, so an edit form can show a preview. */
export const useMediaAsset = (id: string | null | undefined) =>
  useQuery({
    queryKey: [...MEDIA_KEY, "detail", id],
    queryFn: () => api.get<MediaAsset>(`/media/${id}`),
    enabled: Boolean(id),
    staleTime: 60_000,
  });

export const useUploadMedia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      files,
      onProgress,
    }: {
      files: File[];
      onProgress?: (progress: UploadProgress) => void;
    }) => uploadMedia<MediaAsset[]>(files, onProgress),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MEDIA_KEY });
    },
  });
};

export const useUpdateMedia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { altText?: string | null; title?: string | null };
    }) => api.patch<MediaAsset>(`/media/${id}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MEDIA_KEY });
    },
  });
};

export const useDeleteMedia = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) =>
      api.delete<{ id: string; fileName: string; detached: number }>(
        `/media/${id}`,
        force ? { force: "true" } : undefined,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MEDIA_KEY });
    },
  });
};
