import React from "react";

import { useAuth } from "@/context/AuthContext";

type PermissionGuardProps = {
  permission?: string;

  permissions?: string[];

  role?: string;

  roles?: string[];

  fallback?: React.ReactNode;

  children: React.ReactNode;
};

export default function PermissionGuard({
  permission,
  permissions,
  role,
  roles,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { user, can, hasRole } =
    useAuth();

  // ============================================
  // NO USER
  // ============================================

  if (!user) {
    return <>{fallback}</>;
  }

  // ============================================
  // SUPER ADMIN BYPASS
  // ============================================

  if (hasRole("super_admin")) {
    return <>{children}</>;
  }

  // ============================================
  // SINGLE ROLE
  // ============================================

  if (role && !hasRole(role)) {
    return <>{fallback}</>;
  }

  // ============================================
  // MULTIPLE ROLES
  // ============================================

  if (
    roles &&
    !roles.some((r) => hasRole(r))
  ) {
    return <>{fallback}</>;
  }

  // ============================================
  // SINGLE PERMISSION
  // ============================================

  if (
    permission &&
    !can(permission)
  ) {
    return <>{fallback}</>;
  }

  // ============================================
  // MULTIPLE PERMISSIONS
  // ============================================

  if (
    permissions &&
    !permissions.some((p) => can(p))
  ) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}