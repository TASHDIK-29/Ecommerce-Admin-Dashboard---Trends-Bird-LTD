"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/lib/auth-context";

interface PermissionGateProps {
  permission?: string;
  anyOf?: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export const PermissionGate = ({
  permission,
  anyOf,
  children,
  fallback = null,
}: PermissionGateProps) => {
  const { can, canAny } = useAuth();

  const allowed = permission ? can(permission) : anyOf ? canAny(anyOf) : true;

  return <>{allowed ? children : fallback}</>;
};
