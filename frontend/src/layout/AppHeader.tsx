import { Link, useLocation } from "react-router-dom";
import NotificationBell from "../components/header/NotificationBell";
import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";

/* -------------------------------------------------------------------------- */
/*                                   ROUTES                                   */
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
  {
    pattern: "/divisions",
    label: "Divisions",
  },
  {
    pattern: "/divisions/:id",
    label: "Workspace",
  },
  {
    pattern: "/workspaces/:workspaceId/campaigns",
    label: "Campaigns",
  },
  {
    pattern: "/workspaces/:workspaceId/campaigns/:campaignId",
    label: "Campaign Detail",
  },
  {
    pattern: "/workspaces/:workspaceId/campaigns/:campaignId/boards",
    label: "Board",
  },
  {
    pattern: "/forms",
    label: "Forms",
  },
  {
    pattern: "/forms/create",
    label: "Create Form",
  },
  {
    pattern: "/forms/:id/responses",
    label: "Responses",
  },
  {
    pattern: "/chats",
    label: "Chats",
  },
  {
    pattern: "/report",
    label: "Report",
  },
  {
    pattern: "/profile",
    label: "Profile",
  },
];

/* -------------------------------------------------------------------------- */
/*                              MATCH ROUTE HELPER                            */
/* -------------------------------------------------------------------------- */

function matchRoute(pathname: string, pattern: string): boolean {
  if (pathname === pattern) {
    return true;
  }

  const regex = new RegExp("^" + pattern.replace(/:[^/]+/g, "[^/]+") + "$");

  return regex.test(pathname);
}

/* -------------------------------------------------------------------------- */
/*                            BUILD BREADCRUMBS                               */
/* -------------------------------------------------------------------------- */

function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  // /divisions
  if (pathname === "/divisions") {
    return [
      {
        href: "/divisions",
        label: "Divisions",
      },
    ];
  }

  // /divisions/:divisionId
  const workspaceMatch = pathname.match(/^\/divisions\/([^/]+)$/);

  if (workspaceMatch) {
    const divisionId = workspaceMatch[1];

    return [
      {
        href: "/divisions",
        label: "Divisions",
      },
      {
        href: `/divisions/${divisionId}`,
        label: "Workspace",
      },
    ];
  }

  // /workspaces/:workspaceId/campaigns
  const campaignListMatch = pathname.match(
    /^\/workspaces\/([^/]+)\/campaigns$/,
  );

  if (campaignListMatch) {
    const workspaceId = campaignListMatch[1];

    return [
      {
        href: "/divisions",
        label: "Divisions",
      },
      {
        label: "Workspace",
      },
      {
        href: `/workspaces/${workspaceId}/campaigns`,
        label: "Campaigns",
      },
    ];
  }

  // /campaigns/:campaignId

  const campaignDetailMatch = pathname.match(
  /^\/workspaces\/([^/]+)\/campaigns\/([^/]+)$/
);

if (campaignDetailMatch) {
  const workspaceId = campaignDetailMatch[1];
  const campaignId = campaignDetailMatch[2];

  return [
    {
      href: "/divisions",
      label: "Divisions",
    },
    {
      label: "Workspace",
    },
    {
      href: `/workspaces/${workspaceId}/campaigns`,
      label: "Campaigns",
    },
    {
      href: `/workspaces/${workspaceId}/campaigns/${campaignId}`,
      label: "Campaign Detail",
    },
  ];
}
  // /campaigns/:campaignId/boards
const boardMatch = pathname.match(
  /^\/workspaces\/([^/]+)\/campaigns\/([^/]+)\/boards$/
);

if (boardMatch) {
  const workspaceId = boardMatch[1];
  const campaignId = boardMatch[2];

  return [
    {
      href: "/divisions",
      label: "Divisions",
    },
    {
      label: "Workspace",
    },
    {
      href: `/workspaces/${workspaceId}/campaigns`,
      label: "Campaigns",
    },
    {
      href: `/workspaces/${workspaceId}/campaigns/${campaignId}`,
      label: "Campaign Detail",
    },
    {
      label: "Board",
    },
  ];
}

  // /forms/:id/responses
  const formResponsesMatch = pathname.match(/^\/forms\/([^/]+)\/responses$/);

  if (formResponsesMatch) {
    return [
      {
        href: "/forms",
        label: "Forms",
      },
      {
        label: "Responses",
      },
    ];
  }

  // static routes
const matchedRoute = breadcrumbRoutes
  .filter((route) => matchRoute(pathname, route.pattern))
  .sort((a, b) => b.pattern.length - a.pattern.length)[0];

  if (matchedRoute) {
    return [
      {
        href: pathname,
        label: matchedRoute.label,
      },
    ];
  }

  return [];
}

/* -------------------------------------------------------------------------- */
/*                                 COMPONENT                                  */
/* -------------------------------------------------------------------------- */

const AppHeader: React.FC = () => {
const location = useLocation();

const auth = useAuth();

// Sama seperti di AppSidebar: superadmin satu-satunya role yang boleh
// buka /divisions (daftar semua division). admin/user -- termasuk yang
// cuma "tamu" karena diundang lintas divisi ke satu campaign/workspace --
// tidak boleh akses halaman itu, jadi breadcrumb "Divisions" untuk mereka
// tidak boleh berupa link (biar tidak berujung 403 kalau diklik).
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
  const raw = localStorage.getItem(
    "impersonated_by"
  );

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}, []);

  const breadcrumbs = useMemo(() => {
    const raw = buildBreadcrumbs(location.pathname);

    if (isSuperAdmin) {
      return raw;
    }

    return raw.map((crumb) =>
      crumb.href === "/divisions"
        ? { ...crumb, href: undefined }
        : crumb
    );
  }, [location.pathname, isSuperAdmin]);

  const currentPage =
    breadcrumbs.length > 0
      ? breadcrumbs[breadcrumbs.length - 1].label
      : "Dashboard";

      const handleBackToAdmin = (): void => {
  const adminToken =
    localStorage.getItem(
      "admin_token"
    );

  if (!adminToken) {
    alert(
      "Admin token tidak ditemukan"
    );

    return;
  }

  localStorage.setItem(
    "token",
    adminToken
  );

  localStorage.removeItem(
    "admin_token"
  );

  localStorage.removeItem(
    "impersonated_by"
  );

  window.location.href = "/";
};

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800">
      <div className="min-w-0">
        {/* Breadcrumb */}
        <nav className="flex items-center flex-wrap gap-1 text-sm">
          <Link
            to="/"
            className={`transition-colors
            ${
              location.pathname === "/"
                ? "font-semibold text-indigo-600 dark:text-indigo-400"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            Dashboard
          </Link>

          {breadcrumbs.map((breadcrumb, index) => {
            const isLast = index === breadcrumbs.length - 1;

            return (
              <div
                key={`${breadcrumb.href}-${breadcrumb.label}`}
                className="flex items-center gap-1"
              >
                <span className="text-gray-300 dark:text-gray-600">/</span>

                {isLast || !breadcrumb.href ? (
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {breadcrumb.label}
                  </span>
                ) : (
                  <Link
                    to={breadcrumb.href}
                    className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                  >
                    {breadcrumb.label}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        {/* Title */}
        <h1 className="mt-1 text-xl font-bold text-gray-900 dark:text-white truncate">
          {currentPage}
        </h1>
      </div>

<div className="flex items-center gap-3">
  {impersonatedBy && (
    <div className="flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5">
      <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />

      <span className="text-xs font-medium text-orange-700">
        Login as Visitor
      </span>

      <button
        type="button"
        onClick={handleBackToAdmin}
        className="
          rounded-full
          bg-red-500
          px-3
          py-1
          text-xs
          font-medium
          text-white
          hover:bg-red-700
          transition
        "
      >
        Kembali
      </button>
    </div>
  )}

  <NotificationBell />
</div>
    </header>
  );
};

export default AppHeader;
