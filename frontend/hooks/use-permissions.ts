"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { ListQuery } from "@/lib/types";

export interface Permission {
  id: string;
  name: string;
  action: string;
  description: string | null;
  groupId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionGroup {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  permissions: Permission[];
}

export interface CreateGroupPayload {
  name: string;
  description?: string;
  actions: string[];
}

export interface UpdateGroupPayload {
  name?: string;
  description?: string;
  actions?: string[];
}

const GROUPS_KEY = ["permission-groups"] as const;

export const usePermissionGroups = (query: ListQuery) =>
  useQuery({
    queryKey: [...GROUPS_KEY, query],
    queryFn: () => api.list<PermissionGroup>("/permissions/groups", query),
  });

export const useStandardActions = () =>
  useQuery({
    queryKey: ["permission-actions"],
    queryFn: () => api.get<string[]>("/permissions/actions"),
    staleTime: Infinity,
  });

/** Flat permission list, used by the Role screen's grid. */
export const useAllPermissions = (enabled = true) =>
  useQuery({
    queryKey: ["permissions", "all"],
    queryFn: () => api.list<Permission & { group: { id: string; name: string; slug: string } }>(
      "/permissions",
      { limit: 100 },
    ),
    enabled,
    staleTime: 60_000,
  });

export const useCreateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateGroupPayload) =>
      api.post<PermissionGroup>("/permissions/groups", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: GROUPS_KEY });
      void queryClient.invalidateQueries({ queryKey: ["permissions"] });
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateGroupPayload }) =>
      api.patch<PermissionGroup>(`/permissions/groups/${id}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: GROUPS_KEY });
      void queryClient.invalidateQueries({ queryKey: ["permissions"] });
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ id: string; name: string; deletedPermissions: number }>(
        `/permissions/groups/${id}`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: GROUPS_KEY });
      void queryClient.invalidateQueries({ queryKey: ["permissions"] });
    },
  });
};
