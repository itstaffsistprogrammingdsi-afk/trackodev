import React from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/context/AuthContext";

interface Props {
  children: React.ReactNode;
  permission?: string;
  permissions?: string[];
  role?: string;
}

export default function PermissionRoute({
  children,
  permission,
  permissions,
  role,
}: Props) {
  const {
    user,
    loading,
    can,
    hasRole,
  } = useAuth();

  const fallbackPath = can("dashboard.view") ? "/dashboard" : "/my-work";

  // tunggu proses getMe selesai
  if (loading) {
    return <div>Loading...</div>;
  }

  // belum login
  if (!user) {
    return (
      <Navigate
        to="/signin"
        replace
      />
    );
  }

  // cek role
  if (role && !hasRole(role)) {
    return (
      <Navigate
        to={fallbackPath}
        replace
      />
    );
  }

  // cek permission
  if (
    (permission && !can(permission))
    || (permissions?.length && !permissions.some((item) => can(item)))
  ) {
    return (
      <Navigate
        to={fallbackPath}
        replace
      />
    );
  }

  return children;
}
