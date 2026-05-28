import { Link, useLocation } from "react-router-dom";

/* -------------------------------------------------------------------------- */
/*                                   ROUTES                                   */
/* -------------------------------------------------------------------------- */

type BreadcrumbRoute = {
  pattern: string;
  label: string;
};

const breadcrumbRoutes: BreadcrumbRoute[] = [
  {
    pattern: "/",
    label: "Dashboard",
  },

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
    pattern: "/campaigns/:campaignId",
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

function matchRoute(
  pathname: string,
  pattern: string
) {
  if (pattern === pathname) {
    return true;
  }

  const regex = new RegExp(
    "^" +
      pattern.replace(/:[^/]+/g, "[^/]+") +
      "$"
  );

  return regex.test(pathname);
}

/* -------------------------------------------------------------------------- */
/*                            BUILD BREADCRUMBS                               */
/* -------------------------------------------------------------------------- */

function buildBreadcrumbs(pathname: string) {
  /*
    DIVISIONS -> WORKSPACE
  */

  const divisionMatch = pathname.match(
    /^\/divisions\/([^/]+)$/
  );

  if (divisionMatch) {
    return [
      {
        href: "/divisions",
        label: "Divisions",
      },
      {
        href: pathname,
        label: "Workspace",
      },
    ];
  }

  /*
    WORKSPACE -> CAMPAIGNS
  */

  const workspaceCampaignMatch =
    pathname.match(
      /^\/workspaces\/([^/]+)\/campaigns$/
    );

  if (workspaceCampaignMatch) {
    const workspaceId =
      workspaceCampaignMatch[1];

    return [
      {
        href: `/divisions/${workspaceId}`,
        label: "Workspace",
      },
      {
        href: pathname,
        label: "Campaigns",
      },
    ];
  }

  /*
    CAMPAIGN -> BOARD
  */

  const campaignMatch = pathname.match(
    /^\/campaigns\/([^/]+)$/
  );

  if (campaignMatch) {
    return [
      {
        href: "/divisions",
        label: "Divisions",
      },
      {
        href: pathname,
        label: "Board",
      },
    ];
  }

  /*
    FORMS -> RESPONSES
  */

  const formResponsesMatch =
    pathname.match(
      /^\/forms\/([^/]+)\/responses$/
    );

  if (formResponsesMatch) {
    const formId = formResponsesMatch[1];

    return [
      {
        href: `/forms/${formId}/responses`,
        label: "Responses",
      },
    ];
  }

  /*
    STATIC ROUTES
  */

  const matchedRoute =
    breadcrumbRoutes.find((route) =>
      matchRoute(pathname, route.pattern)
    );

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

  const breadcrumbs = buildBreadcrumbs(
    location.pathname
  );

  const currentPage =
    breadcrumbs.length > 0
      ? breadcrumbs[breadcrumbs.length - 1]
          .label
      : "Dashboard";

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

          {breadcrumbs.map(
            (breadcrumb, index) => {
              const isLast =
                index ===
                breadcrumbs.length - 1;

              return (
                <div
                  key={`${breadcrumb.href}-${breadcrumb.label}`}
                  className="flex items-center gap-1"
                >
                  <span className="text-gray-300 dark:text-gray-600">
                    /
                  </span>

                  {isLast ? (
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
            }
          )}
        </nav>

        {/* Title */}
        <h1 className="mt-1 text-xl font-bold text-gray-900 dark:text-white truncate">
          {currentPage}
        </h1>
      </div>
    </header>
  );
};

export default AppHeader;