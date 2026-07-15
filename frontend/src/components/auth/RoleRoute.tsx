import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

/* -------------------------------------------------------------------------- */
/*                                 ROLE ROUTE                                  */
/* -------------------------------------------------------------------------- */
/*
 * Sama seperti PermissionRoute, tapi gate-nya berdasarkan role
 * (mis. "super_admin"), bukan permission.
 *
 * Dipakai untuk halaman yang memang cuma boleh dibuka satu role tertentu,
 * seperti /dashboard yang cuma untuk Super Admin -- Admin & User diarahkan
 * ke /my-work.
 */

type RoleRouteProps = {
  role: string;
  redirectTo?: string;
  children: React.ReactNode;
};

export default function RoleRoute({
  role,
  redirectTo = "/my-work",
  children,
}: RoleRouteProps) {
  const auth = useAuth();

  // try/catch + default false: kalau hasRole() belum siap (mis. permission
  // masih di-fetch) atau errornya tak terduga, jangan sampai malah
  // meloloskan akses -- fallback-nya aman (redirect), bukan tampil.
  const hasRole = (() => {
    try {
      return typeof auth?.hasRole === "function"
        ? !!auth.hasRole(role)
        : false;
    } catch {
      return false;
    }
  })();

  if (!hasRole) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
