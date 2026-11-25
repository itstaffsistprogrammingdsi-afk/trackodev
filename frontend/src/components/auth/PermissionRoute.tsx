import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";

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
  const { showToast } = useToast();
  const { t } = useLanguage();
  const location = useLocation();

  const fallbackPath = can("dashboard.view")
    ? "/dashboard"
    : can("my_work.view")
      ? "/my-work"
      : can("calendar.view")
        ? "/calendar"
        : "/account/edit";
  const accessDenied = Boolean(
    user &&
      !loading &&
      ((role && !hasRole(role)) ||
        (permission && !can(permission)) ||
        (permissions?.length && !permissions.some((item) => can(item)))),
  );
  const isImpersonating =
    typeof localStorage !== "undefined" &&
    Boolean(localStorage.getItem("impersonated_by"));

  useEffect(() => {
    if (!accessDenied || isImpersonating) return;

    showToast({
      variant: "error",
      title: t("Akses ditolak", "Access denied"),
      message: t(
        "Anda tidak memiliki izin untuk membuka halaman ini.",
        "You do not have permission to open this page.",
      ),
    });
  }, [accessDenied, isImpersonating, showToast, t]);

  // tunggu proses getMe selesai
  if (loading) {
    return <div>{t("Memuat...", "Loading...")}</div>;
  }

  // belum login
  if (!user) {
    const redirect = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/signin?redirect=${encodeURIComponent(redirect)}`}
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
