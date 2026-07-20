import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Menu } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import NotificationBell from "../components/header/NotificationBell";
import { useSidebar } from "../context/SidebarContext";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

type BreadcrumbRoute = {
  pattern: string;
  label: string;
};

type BreadcrumbItem = {
  label: string;
  href?: string;
};

/* -------------------------------------------------------------------------- */
/*                                   ROUTES                                   */
/* -------------------------------------------------------------------------- */

const breadcrumbRoutes: BreadcrumbRoute[] = [
  { pattern: "/divisions", label: "Divisions" },
  { pattern: "/divisions/:id", label: "Workspace" },
  { pattern: "/workspaces/:workspaceId/campaigns", label: "Campaigns" },
  {
    pattern: "/workspaces/:workspaceId/campaigns/:campaignId",
    label: "Campaign Detail",
  },
  {
    pattern: "/workspaces/:workspaceId/campaigns/:campaignId/boards",
    label: "Board",
  },
  { pattern: "/forms", label: "Forms" },
  { pattern: "/forms/create", label: "Create Form" },
  { pattern: "/forms/:id/responses", label: "Responses" },
  { pattern: "/chats", label: "Chats" },
  { pattern: "/report", label: "Report" },
  { pattern: "/profile", label: "Profile" },
];

/* -------------------------------------------------------------------------- */
/*                             MATCH ROUTE HELPER                             */
/* -------------------------------------------------------------------------- */

function matchRoute(pathname: string, pattern: string): boolean {
  if (pathname === pattern) return true;
  const regex = new RegExp("^" + pattern.replace(/:[^/]+/g, "[^/]+") + "$");
  return regex.test(pathname);
}

/* -------------------------------------------------------------------------- */
/*                             BUILD BREADCRUMBS                              */
/* -------------------------------------------------------------------------- */

function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  if (pathname === "/divisions") {
    return [{ href: "/divisions", label: "Divisions" }];
  }

  const workspaceMatch = pathname.match(/^\/divisions\/([^/]+)$/);
  if (workspaceMatch) {
    const divisionId = workspaceMatch[1];
    return [
      { href: "/divisions", label: "Divisions" },
      { href: `/divisions/${divisionId}`, label: "Workspace" },
    ];
  }

  const campaignListMatch = pathname.match(
    /^\/workspaces\/([^/]+)\/campaigns$/,
  );
  if (campaignListMatch) {
    const workspaceId = campaignListMatch[1];
    return [
      { href: "/divisions", label: "Divisions" },
      { label: "Workspace" },
      { href: `/workspaces/${workspaceId}/campaigns`, label: "Campaigns" },
    ];
  }

  const campaignDetailMatch = pathname.match(
    /^\/workspaces\/([^/]+)\/campaigns\/([^/]+)$/,
  );
  if (campaignDetailMatch) {
    const workspaceId = campaignDetailMatch[1];
    const campaignId = campaignDetailMatch[2];
    return [
      { href: "/divisions", label: "Divisions" },
      { label: "Workspace" },
      { href: `/workspaces/${workspaceId}/campaigns`, label: "Campaigns" },
      {
        href: `/workspaces/${workspaceId}/campaigns/${campaignId}`,
        label: "Campaign Detail",
      },
    ];
  }

  const boardMatch = pathname.match(
    /^\/workspaces\/([^/]+)\/campaigns\/([^/]+)\/boards$/,
  );
  if (boardMatch) {
    const workspaceId = boardMatch[1];
    const campaignId = boardMatch[2];
    return [
      { href: "/divisions", label: "Divisions" },
      { label: "Workspace" },
      { href: `/workspaces/${workspaceId}/campaigns`, label: "Campaigns" },
      {
        href: `/workspaces/${workspaceId}/campaigns/${campaignId}`,
        label: "Campaign Detail",
      },
      { label: "Board" },
    ];
  }

  const formResponsesMatch = pathname.match(/^\/forms\/([^/]+)\/responses$/);
  if (formResponsesMatch) {
    return [
      { href: "/forms", label: "Forms" },
      { label: "Responses" },
    ];
  }

  const matchedRoute = breadcrumbRoutes
    .filter((route) => matchRoute(pathname, route.pattern))
    .sort((a, b) => b.pattern.length - a.pattern.length)[0];

  if (matchedRoute) {
    return [{ href: pathname, label: matchedRoute.label }];
  }

  return [];
}

/* -------------------------------------------------------------------------- */
/*                                 COMPONENT                                  */
/* -------------------------------------------------------------------------- */

const AppHeader: React.FC = () => {
  const location = useLocation();
  const auth = useAuth();
  const { toggleMobileSidebar } = useSidebar();

  const isSuperAdmin = useMemo(() => {
    try {
      return typeof auth?.hasRole === "function"
        ? !!auth.hasRole("super_admin")
        : false;
    } catch {
      return false;
    }
  }, [auth]);

  const impersonatedBy = useMemo(() => {
    const raw = localStorage.getItem("impersonated_by");
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const breadcrumbs = useMemo(() => {
    const raw = buildBreadcrumbs(location.pathname);
    if (isSuperAdmin) return raw;

    return raw.map((crumb) =>
      crumb.href === "/divisions" ? { ...crumb, href: undefined } : crumb,
    );
  }, [location.pathname, isSuperAdmin]);

  const handleBackToAdmin = (): void => {
    const adminToken = localStorage.getItem("admin_token");
    if (!adminToken) {
      alert("Admin token tidak ditemukan");
      return;
    }

    localStorage.setItem("token", adminToken);
    localStorage.removeItem("admin_token");
    localStorage.removeItem("impersonated_by");

    window.location.href = "/";
  };

  return (
<header
  className="
    flex
    shrink-0
    flex-col
    gap-3
    px-4
    pt-3
    pb-3
    transition-colors
    lg:flex-row
    lg:items-center
    lg:justify-between
    lg:px-8
    lg:pt-10
    lg:pb-4
  "
>
      {/* Breadcrumb & Mobile Menu */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="rounded-lg p-1 text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
          aria-label="Toggle mobile sidebar"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="min-w-0 flex-1 overflow-hidden">
          <nav className="scrollbar-hide flex items-center gap-2 overflow-x-auto whitespace-nowrap py-1">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors ${
                location.pathname === "/"
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              Dashboard
            </Link>

            {breadcrumbs.map((breadcrumb, index) => {
              const isLast = index === breadcrumbs.length - 1;

              return (
                <div
                  key={`${breadcrumb.href ?? breadcrumb.label}-${index}`}
                  className="flex shrink-0 items-center gap-2"
                >
                  <ChevronRight className="h-4 w-4 text-slate-400" />

                  {isLast || !breadcrumb.href ? (
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {breadcrumb.label}
                    </span>
                  ) : (
                    <Link
                      to={breadcrumb.href}
                      className="text-sm font-medium text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                    >
                      {breadcrumb.label}
                    </Link>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Action Items */}
      <div className="flex items-center justify-between gap-3 lg:justify-end">
        {impersonatedBy && (
          <div className="flex flex-1 items-center justify-between gap-3 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 dark:border-orange-800 dark:bg-orange-900/20 lg:flex-none">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-orange-500" />
              </span>

              <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                Visitor
              </span>
            </div>

            <button
              type="button"
              onClick={handleBackToAdmin}
              className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white transition-all hover:bg-red-600 active:scale-95"
            >
              Kembali
            </button>
          </div>
        )}

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
          <NotificationBell />
        </div>
      </div>
    </header>
  );
};

export default AppHeader;