"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { ListQuery } from "@/lib/types";

export type RoleStatus = "ACTIVE" | "INACTIVE";

export interface RoleListRow {
  id: string;
  name: string;
  description: string | null;
  status: RoleStatus;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  permissionCount: number;
}

export interface RolePermission {
  id: string;
  name: string;
  action: string;
  description: string | null;
  group: { id: string; name: string; slug: string };
}

export interface RoleDetail {
  id: string;
  name: string;
  description: string | null;
  status: RoleStatus;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { users: number };
  permissions: RolePermission[];
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  status?: RoleStatus;
  permissionIds?: string[];
  grantAll?: boolean;
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  status?: RoleStatus;
  permissionIds?: string[];
}

const ROLES_KEY = ["roles"] as const;

export const useRoles = (query: ListQuery) =>
  useQuery({
    queryKey: [...ROLES_KEY, "list", query],
    queryFn: () => api.list<RoleListRow>("/roles", query),
  });

export const useRole = (id: string | undefined) =>
  useQuery({
    queryKey: [...ROLES_KEY, "detail", id],
    queryFn: () => api.get<RoleDetail>(`/roles/${id}`),
    enabled: Boolean(id),
  });

const invalidate = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.invalidateQueries({ queryKey: ROLES_KEY });
  // A role change can alter the signed-in user's own permissions.
  void queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateRolePayload) => api.post<RoleDetail>("/roles", payload),
    onSuccess: () => invalidate(queryClient),
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRolePayload }) =>
      api.patch<RoleDetail>(`/roles/${id}`, payload),
    onSuccess: () => invalidate(queryClient),
  });
};

export const useGrantAll = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.post<RoleDetail>(`/roles/${id}/permissions/grant-all`, {}),
    onSuccess: () => invalidate(queryClient),
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete<{ id: string; name: string }>(`/roles/${id}`),
    onSuccess: () => invalidate(queryClient),
  });
};
