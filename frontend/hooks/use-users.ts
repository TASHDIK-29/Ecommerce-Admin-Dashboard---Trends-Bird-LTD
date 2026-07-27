"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import type { ListQuery } from "@/lib/types";

export type Gender = "MALE" | "FEMALE" | "OTHER";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  gender: Gender | null;
  avatarId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  role: { id: string; name: string; status: string };
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  gender?: Gender;
  avatarId?: string | null;
  roleId: string;
  isActive?: boolean;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  gender?: Gender;
  avatarId?: string | null;
  roleId?: string;
  isActive?: boolean;
}

const USERS_KEY = ["users"] as const;

export const useUsers = (query: ListQuery) =>
  useQuery({
    queryKey: [...USERS_KEY, "list", query],
    queryFn: () => api.list<UserRow>("/users", query),
  });

const invalidate = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.invalidateQueries({ queryKey: USERS_KEY });
  // Role counts on the Roles screen move when a user is added or reassigned.
  void queryClient.invalidateQueries({ queryKey: ["roles"] });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUserPayload) => api.post<UserRow>("/users", payload),
    onSuccess: () => invalidate(queryClient),
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      api.patch<UserRow>(`/users/${id}`, payload),
    onSuccess: () => invalidate(queryClient),
  });
};

export const useUpdateUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch<UserRow>(`/users/${id}/status`, { isActive }),
    onSuccess: () => invalidate(queryClient),
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ id: string; email: string; deleted: string }>(`/users/${id}`),
    onSuccess: () => invalidate(queryClient),
  });
};
