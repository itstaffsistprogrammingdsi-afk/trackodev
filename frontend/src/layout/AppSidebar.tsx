import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
  useLocation,
} from "react-router-dom";

import UserDropdown from "../components/header/UserDropdown";

import {
  BoxCubeIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  UserCircleIcon,
} from "../icons";

import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "@/context/AuthContext";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

type ChildItem = {
  name: string;
  path: string;
};

type SubItem = {
  name: string;
  path: string;
  children?: ChildItem[];
};

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: SubItem[];
};

/* -------------------------------------------------------------------------- */
/*                                DARK MODE HOOK                              */
/* -------------------------------------------------------------------------- */

// function useDarkMode() {
//   const [dark, setDark] =
//     useState(false);

//   useEffect(() => {
//     if (
//       typeof window ===
//       "undefined"
//     )
//       return;

//     const storedTheme =
//       localStorage.getItem(
//         "theme"
//       );

//     const initialDark =
//       storedTheme === "dark" ||
//       (!storedTheme &&
//         window.matchMedia(
//           "(prefers-color-scheme: dark)"
//         ).matches);

//     setDark(initialDark);
//   }, []);

//   useEffect(() => {
//     if (
//       typeof window ===
//       "undefined"
//     )
//       return;

//     const root =
//       document.documentElement;

//     if (dark) {
//       root.classList.add(
//         "dark"
//       );

//       localStorage.setItem(
//         "theme",
//         "dark"
//       );
//     } else {
//       root.classList.remove(
//         "dark"
//       );

//       localStorage.setItem(
//         "theme",
//         "light"
//       );
//     }
//   }, [dark]);

//   const toggleDark =
//     useCallback(() => {
//       setDark((prev) => !prev);
//     }, []);

//   return {
//     dark,
//     toggleDark,
//   };
// }

/* -------------------------------------------------------------------------- */
/*                                 UTILITIES                                  */
/* -------------------------------------------------------------------------- */

const DotIcon = memo(() => {
  return (
    <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
  );
});

const menuItemBase =
  "flex items-center gap-3 rounded-xl transition-all duration-200";

const menuItemInactive =
  "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5";

const menuItemActive =
  "bg-indigo-500 text-white shadow-sm";

/* -------------------------------------------------------------------------- */
/*                                ROUTE MATCHER                               */
/* -------------------------------------------------------------------------- */

function normalizePath(
  path: string
) {
  if (
    !path ||
    path === "/"
  ) {
    return "/";
  }

  return path.replace(
    /\/+$/,
    ""
  );
}

function matchDynamicRoute(
  pathname: string,
  routePath: string
) {
  const pathnameParts =
    normalizePath(
      pathname
    ).split("/");

  const routeParts =
    normalizePath(
      routePath
    ).split("/");

  if (
    pathnameParts.length !==
    routeParts.length
  ) {
    return false;
  }

  return routeParts.every(
    (part, index) => {
      if (
        part.startsWith(":")
      ) {
        return true;
      }

      return (
        part ===
        pathnameParts[index]
      );
    }
  );
}

/* -------------------------------------------------------------------------- */
/*                           FIXED ACTIVE MATCHER                             */
/* -------------------------------------------------------------------------- */

function matchPathname(
  pathname: string,
  routePath: string
) {
  if (!routePath) {
    return false;
  }

  const normalizedPathname =
    normalizePath(pathname);

  const normalizedRoute =
    normalizePath(routePath);

  // dynamic route
  if (
    normalizedRoute.includes(":")
  ) {
    return matchDynamicRoute(
      normalizedPathname,
      normalizedRoute
    );
  }

  // root
  if (
    normalizedRoute === "/"
  ) {
    return (
      normalizedPathname ===
      "/"
    );
  }

  // exact match
  if (
    normalizedPathname ===
    normalizedRoute
  ) {
    return true;
  }

  // nested route
  const pathnameParts =
    normalizedPathname.split(
      "/"
    );

  const routeParts =
    normalizedRoute.split(
      "/"
    );

  if (
    routeParts.length >
    pathnameParts.length
  ) {
    return false;
  }

  return routeParts.every(
    (part, index) =>
      pathnameParts[index] ===
      part
  );
}

/* -------------------------------------------------------------------------- */
/*                            PERSIST LAST PARAMS                             */
/* -------------------------------------------------------------------------- */

function usePersistedRouteParams() {
  const location =
    useLocation();

  const [
    divisionId,
    setDivisionId,
  ] = useState<
    string | null
  >(() =>
    localStorage.getItem(
      "lastDivisionId"
    )
  );

  const [
    workspaceId,
    setWorkspaceId,
  ] = useState<
    string | null
  >(() =>
    localStorage.getItem(
      "lastWorkspaceId"
    )
  );

  const [
    campaignId,
    setCampaignId,
  ] = useState<
    string | null
  >(() =>
    localStorage.getItem(
      "lastCampaignId"
    )
  );

  useEffect(() => {
    const divisionMatch =
      location.pathname.match(
        /^\/divisions\/([^/]+)/
      );

    if (
      divisionMatch?.[1]
    ) {
      const id =
        divisionMatch[1];

      setDivisionId(id);

      localStorage.setItem(
        "lastDivisionId",
        id
      );
    }

    const workspaceMatch =
      location.pathname.match(
        /^\/workspaces\/([^/]+)/
      );

    if (
      workspaceMatch?.[1]
    ) {
      const id =
        workspaceMatch[1];

      setWorkspaceId(id);

      localStorage.setItem(
        "lastWorkspaceId",
        id
      );
    }

    const campaignMatch =
      location.pathname.match(
        /^\/campaigns\/([^/]+)/
      );

    if (
      campaignMatch?.[1]
    ) {
      const id =
        campaignMatch[1];

      setCampaignId(id);

      localStorage.setItem(
        "lastCampaignId",
        id
      );
    }
  }, [location.pathname]);

  return {
    divisionId,
    workspaceId,
    campaignId,
  };
}

/* -------------------------------------------------------------------------- */
/*                                 TREE LEAF                                  */
/* -------------------------------------------------------------------------- */

const TreeLeaf = memo(
  function TreeLeaf({
    name,
    path,
    active,
  }: {
    name: string;
    path: string;
    active: boolean;
  }) {
    return (
      <li>
        <Link
          to={path}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all
          ${
            active
              ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400"
              : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
          }`}
        >
          <DotIcon />

          <span className="truncate">
            {name}
          </span>
        </Link>
      </li>
    );
  }
);

/* -------------------------------------------------------------------------- */
/*                                TREE BRANCH                                 */
/* -------------------------------------------------------------------------- */

const TreeBranch = memo(
  function TreeBranch({
    subItem,
    isActive,
  }: {
    subItem: SubItem;
    isActive: (
      path: string
    ) => boolean;
  }) {
    const hasChildren =
      !!subItem.children
        ?.length;

    const active =
      useMemo(() => {
        return (
          isActive(
            subItem.path
          ) ||
          subItem.children?.some(
            (child) =>
              isActive(
                child.path
              )
          ) ||
          false
        );
      }, [
        isActive,
        subItem.path,
        subItem.children,
      ]);

    const [open, setOpen] =
      useState(active);

    useEffect(() => {
      if (active) {
        setOpen(true);
      }
    }, [active]);

    const contentRef =
      useRef<HTMLDivElement>(
        null
      );

    const [height, setHeight] =
      useState(0);

    useEffect(() => {
      if (
        !contentRef.current
      )
        return;

      const element =
        contentRef.current;

      const updateHeight =
        () => {
          setHeight(
            element.scrollHeight
          );
        };

      updateHeight();

      const resizeObserver =
        new ResizeObserver(
          updateHeight
        );

      resizeObserver.observe(
        element
      );

      return () => {
        resizeObserver.disconnect();
      };
    }, []);

    return (
      <li>
        {hasChildren ? (
          <>
            <button
              type="button"
              onClick={() =>
                setOpen(
                  (prev) =>
                    !prev
                )
              }
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all
              ${
                active
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
              }`}
            >
              <span className="flex-1 text-left truncate">
                {
                  subItem.name
                }
              </span>

              <ChevronDownIcon
                className={`w-4 h-4 transition-transform duration-200 shrink-0
                ${
                  open
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            <div
              ref={contentRef}
              className="overflow-hidden transition-all duration-300"
              style={{
                maxHeight:
                  open
                    ? `${height}px`
                    : "0px",
              }}
            >
              <ul className="ml-4 mt-1 border-l border-gray-200 dark:border-gray-700 pl-3 space-y-1">
                {subItem.children?.map(
                  (child) => (
                    <TreeLeaf
                      key={
                        child.path
                      }
                      name={
                        child.name
                      }
                      path={
                        child.path
                      }
                      active={isActive(
                        child.path
                      )}
                    />
                  )
                )}
              </ul>
            </div>
          </>
        ) : (
          <Link
            to={subItem.path}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all
            ${
              active
                ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            }`}
          >
            <DotIcon />

            <span className="truncate">
              {subItem.name}
            </span>
          </Link>
        )}
      </li>
    );
  }
);

/* -------------------------------------------------------------------------- */
/*                                MAIN SIDEBAR                                */
/* -------------------------------------------------------------------------- */

const AppSidebar: React.FC =
  () => {
    const {
      isExpanded,
      isHovered,
      isMobileOpen,
      setIsHovered,
      toggleSidebar,
      toggleMobileSidebar,
    } = useSidebar();

    const location =
      useLocation();

    // const {
    //   dark,
    //   toggleDark,
    // } = useDarkMode();

    const {
      divisionId,
      workspaceId,
      campaignId,
    } =
      usePersistedRouteParams();

    const [
      openSubmenu,
      setOpenSubmenu,
    ] = useState<
      number | null
    >(null);

    const slim =
      !isExpanded &&
      !isHovered &&
      !isMobileOpen;

    /* ---------------------------------------------------------------------- */
    /*                               DYNAMIC MENU                             */
    /* ---------------------------------------------------------------------- */
    const { can } = useAuth();
    const navItems =
      useMemo<NavItem[]>(
        () => [
          {
            icon:
              <GridIcon />,
            name:
              "Dashboard",
            path: "/my-work",
          },

          {
            name:
              "Task Management",
            icon:
              <BoxCubeIcon />,
            subItems: [
              {
                name:
                  "Task Manager",

                path:
                  "/divisions",

                children: [
                  {
                    name:
                      "Divisions List",

                    path:
                      "/divisions",
                  },

                  {
                    name:
                      "Workspace",

                    path:
                      divisionId
                        ? `/divisions/${divisionId}`
                        : "/divisions",
                  },

                  {
                    name:
                      "Campaigns",

                    path:
                      workspaceId
                        ? `/workspaces/${workspaceId}/campaigns`
                        : "/divisions",
                  },

                  {
                    name:
                      "Board",

                    path:
                      campaignId
                        ? `/campaigns/${campaignId}`
                        : workspaceId
                        ? `/workspaces/${workspaceId}/campaigns`
                        : "/divisions",
                  },
                ],
              },
            ],
          },

          ...(can("form.view")
  ? [{
      name: "Forms",
      icon: <ListIcon />,
      subItems: [

        ...(can("form.view")
          ? [{
              name: "All Forms",
              path: "/forms",
            }]
          : []),

        ...(can("form.create")
          ? [{
              name: "Create Form",
              path: "/forms/create",
            }]
          : []),
      ],
    }]
  : []),

          {
            name: "Chats",
            icon:
              <ListIcon />,
            path: "/chats",
          },

          
...(can("report.view")
  ? [{
      name: "Report",
      icon: <ListIcon />,
      path: "/report",
    }]
  : []),

...(can("profile.view")
  ? [{
      icon: <UserCircleIcon />,
      name: "User Management",
      path: "/profile",
    }]
  : []),
        ],
        
        [
          divisionId,
          workspaceId,
          campaignId,
        ]
      );

    /* ---------------------------------------------------------------------- */
    /*                              ACTIVE MATCHER                            */
    /* ---------------------------------------------------------------------- */

    const isActive =
      useCallback(
        (path: string) => {
          return matchPathname(
            location.pathname,
            path
          );
        },
        [location.pathname]
      );

    useEffect(() => {
      const activeMenuIndex =
        navItems.findIndex(
          (item) => {
            if (
              !item.subItems
            ) {
              return false;
            }

            return item.subItems.some(
              (sub) =>
                isActive(
                  sub.path
                ) ||
                sub.children?.some(
                  (
                    child
                  ) =>
                    isActive(
                      child.path
                    )
                )
            );
          }
        );

      setOpenSubmenu(
        (prev) => {
          if (
            activeMenuIndex ===
            -1
          ) {
            return prev;
          }

          return activeMenuIndex;
        }
      );
    }, [
      navItems,
      isActive,
    ]);

    const handleMouseEnter =
      () => {
        if (
          !isExpanded
        ) {
          setIsHovered(
            true
          );
        }
      };

    const handleMouseLeave =
      () => {
        setIsHovered(false);
      };

    return (
      <>
        {isMobileOpen && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={
              toggleMobileSidebar
            }
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          />
        )}

        <aside
          className={`fixed top-0 left-0 z-50 h-screen bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 transition-all duration-300
        ${
          slim
            ? "w-[72px]"
            : "w-[260px]"
        }
        ${
          isMobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
          onMouseEnter={
            handleMouseEnter
          }
          onMouseLeave={
            handleMouseLeave
          }
        >
          {/* HEADER */}

          <div className="flex items-center justify-between px-4 py-5 border-b border-gray-100 dark:border-gray-800">
            <Link
              to="/"
              className="flex items-center shrink-0"
            >
              {slim ? (
                <img
                  src="/images/logo/icon.svg"
                  alt="Logo"
                  className="w-8 h-8 object-contain"
                />
              ) : (
                <img
                  src="/images/logo/logof.svg"
                  alt="Logo"
                  className="h-8 object-contain"
                />
              )}
            </Link>

            {!slim && (
              <button
                type="button"
                onClick={
                  toggleSidebar
                }
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                aria-label="Toggle sidebar"
              >
                ☰
              </button>
            )}
          </div>

          {/* CONTENT */}

          <div className="flex flex-col h-[calc(100vh-73px)] overflow-y-auto px-3 py-4 space-y-4">
            <UserDropdown
              compact={slim}
            />

            <div className="border-t border-gray-100 dark:border-gray-800" />

            {/* DARK MODE */}

            {/* <button
              type="button"
              onClick={
                toggleDark
              }
              className={`${menuItemBase} ${menuItemInactive} w-full px-3 py-2.5 ${
                slim
                  ? "justify-center"
                  : ""
              }`}
            >
              <span className="shrink-0">
                {dark
                  ? "☀️"
                  : "🌙"}
              </span>

              {!slim && (
                <span className="text-sm font-medium">
                  {dark
                    ? "Light Mode"
                    : "Dark Mode"}
                </span>
              )}
            </button> */}

            <div className="border-t border-gray-100 dark:border-gray-800" />

            {/* MENU */}

            <nav className="space-y-1">
              {!slim ? (
                <p className="mb-2 px-2 text-[10px] uppercase tracking-widest text-gray-400">
                  Menu
                </p>
              ) : (
                <div className="flex justify-center mb-2">
                  <HorizontaLDots className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                </div>
              )}

              <ul className="space-y-1">
                {navItems.map(
                  (
                    item,
                    index
                  ) => {
                    const isOpen =
                      openSubmenu ===
                      index;

                    if (
                      item.subItems
                    ) {
                      return (
                        <li
                          key={
                            item.name
                          }
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenSubmenu(
                                (
                                  prev
                                ) =>
                                  prev ===
                                  index
                                    ? null
                                    : index
                              )
                            }
                            className={`${menuItemBase} w-full px-3 py-2.5
                          ${
                            isOpen
                              ? menuItemActive
                              : menuItemInactive
                          }
                          ${
                            slim
                              ? "justify-center"
                              : ""
                          }`}
                          >
                            <span className="shrink-0">
                              {
                                item.icon
                              }
                            </span>

                            {!slim && (
                              <>
                                <span className="flex-1 text-left text-sm font-medium truncate">
                                  {
                                    item.name
                                  }
                                </span>

                                <ChevronDownIcon
                                  className={`w-4 h-4 shrink-0 transition-transform
                                ${
                                  isOpen
                                    ? "rotate-180"
                                    : ""
                                }`}
                                />
                              </>
                            )}
                          </button>

                          {!slim && (
                            <div
                              className={`overflow-hidden transition-all duration-300
                            ${
                              isOpen
                                ? "max-h-[600px] opacity-100"
                                : "max-h-0 opacity-0"
                            }`}
                            >
                              <ul className="ml-4 mt-2 border-l border-gray-200 dark:border-gray-700 pl-3 space-y-1">
                                {item.subItems.map(
                                  (
                                    subItem
                                  ) => (
                                    <TreeBranch
                                      key={`${item.name}-${subItem.path}`}
                                      subItem={
                                        subItem
                                      }
                                      isActive={
                                        isActive
                                      }
                                    />
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                        </li>
                      );
                    }

                    if (
                      !item.path
                    ) {
                      return null;
                    }

                    return (
                      <li
                        key={
                          item.name
                        }
                      >
                        <Link
                          to={
                            item.path
                          }
                          className={`${menuItemBase} px-3 py-2.5
                        ${
                          isActive(
                            item.path
                          )
                            ? menuItemActive
                            : menuItemInactive
                        }
                        ${
                          slim
                            ? "justify-center"
                            : ""
                        }`}
                        >
                          <span className="shrink-0">
                            {
                              item.icon
                            }
                          </span>

                          {!slim && (
                            <span className="text-sm font-medium truncate">
                              {
                                item.name
                              }
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  }
                )}
              </ul>
            </nav>
          </div>
        </aside>
      </>
    );
  };

export default memo(
  AppSidebar
);