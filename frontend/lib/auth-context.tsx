"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

import { api, setUnauthorizedHandler } from "./api-client";
import type { LoginResult, SessionUser } from "./types";

export const SESSION_QUERY_KEY = ["auth", "session"] as const;

interface AuthContextValue {
  user: SessionUser | null;
  permissions: string[];
  isLoading: boolean;
  can: (permission: string) => boolean;
  canAny: (permissions: string[]) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  /**
   * The session is restored from the cookie on every load, which is what makes
   * a hard refresh keep the user signed in. Holding it in the query cache means
   * no effect has to synchronise it into local state.
   */
  const { data, isLoading } = useQuery<SessionUser | null>({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      try {
        return await api.get<SessionUser>("/auth/session");
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const user = data ?? null;

  useEffect(() => {
    setUnauthorizedHandler(() => {
      queryClient.setQueryData(SESSION_QUERY_KEY, null);
      router.replace("/login");
    });

    return () => setUnauthorizedHandler(null);
  }, [queryClient, router]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await api.post<LoginResult>("/auth/login", { email, password });
      queryClient.setQueryData(SESSION_QUERY_KEY, result.user);
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout", {});
    } finally {
      queryClient.setQueryData(SESSION_QUERY_KEY, null);
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "auth" });
      router.replace("/login");
    }
  }, [queryClient, router]);

  const refreshSession = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
  }, [queryClient]);

  const permissions = useMemo(() => user?.permissions ?? [], [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      permissions,
      isLoading,
      can: (permission: string) => permissions.includes(permission),
      canAny: (required: string[]) => required.some((p) => permissions.includes(p)),
      login,
      logout,
      refreshSession,
    }),
    [user, permissions, isLoading, login, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
};
