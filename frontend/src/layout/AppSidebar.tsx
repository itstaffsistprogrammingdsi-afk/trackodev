import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AxiosError } from "axios";
import api from "@/lib/axios";

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
import { getMyDivisions } from "@/features/division/api/division.api";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

type ChildItem = {
  name: string;
  path: string;
  // true jika `path` hanya fallback (id dependency belum ada).
  // Dilewati saat menentukan active state agar tidak bentrok dengan menu lain.
  isFallback?: boolean;
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
/*                                 UTILITIES                                  */
/* -------------------------------------------------------------------------- */

const DotIcon = memo(() => (
  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
));

DotIcon.displayName = "DotIcon";

const menuItemBase =
  "flex items-center gap-3 rounded-xl transition-all duration-200";

const menuItemInactive =
  "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5";

const menuItemActive = "bg-indigo-500 text-white shadow-sm";

function normalizePath(path: string) {
  if (!path || path === "/") return "/";
  return path.replace(/\/+$/, "");
}

function startsWithRoute(pathname: string, prefix: string) {
  pathname = normalizePath(pathname);
  prefix = normalizePath(prefix);
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

/* -------------------------------------------------------------------------- */
/*                            PERSIST LAST PARAMS                             */
/* -------------------------------------------------------------------------- */

function usePersistedRouteParams(isSuperAdmin: boolean) {
  const location = useLocation();

  const [divisionId, setDivisionId] = useState<string | null>(() =>
    localStorage.getItem("lastDivisionId"),
  );

  const [workspaceId, setWorkspaceId] = useState<string | null>(() =>
    localStorage.getItem("lastWorkspaceId"),
  );

  const [campaignId, setCampaignId] = useState<string | null>(() =>
    localStorage.getItem("lastCampaignId"),
  );

  // Simpan ID terakhir ketika user berpindah halaman
  useEffect(() => {
    const divisionMatch = location.pathname.match(/^\/divisions\/([^/]+)/);
    if (divisionMatch?.[1]) {
      const id = divisionMatch[1];
      setDivisionId(id);
      localStorage.setItem("lastDivisionId", id);
    }

    const workspaceMatch = location.pathname.match(/^\/workspaces\/([^/]+)/);
    if (workspaceMatch?.[1]) {
      const id = workspaceMatch[1];
      setWorkspaceId(id);
      localStorage.setItem("lastWorkspaceId", id);
    }

    const campaignMatch = location.pathname.match(
      /^\/workspaces\/[^/]+\/campaigns\/([^/]+)/,
    );
    if (campaignMatch?.[1]) {
      const id = campaignMatch[1];
      setCampaignId(id);
      localStorage.setItem("lastCampaignId", id);
    }
  }, [location.pathname]);

  // Auto-discover divisionId untuk non-superadmin jika localStorage masih kosong
  useEffect(() => {
    if (isSuperAdmin || divisionId) return;

    let mounted = true;

    getMyDivisions()
      .then((divisions) => {
        if (!mounted) return;
        const first = divisions[0];
        if (first?.id) {
          setDivisionId(first.id);
          localStorage.setItem("lastDivisionId", first.id);
        }
      })
      .catch(() => {
        // Ignored
      });

    return () => {
      mounted = false;
    };
  }, [isSuperAdmin, divisionId]);

  // Validasi ID tersimpan ke server untuk menghindari ID invalid (4xx errors)
  useEffect(() => {
    let mounted = true;

    const validate = async (
      id: string | null,
      endpoint: string,
      storageKey: string,
      clearState: React.Dispatch<React.SetStateAction<string | null>>,
    ) => {
      if (!id) return;

      try {
        await api.get(`${endpoint}/${id}`);
      } catch (error: unknown) {
        const status =
          error instanceof AxiosError ? error.response?.status : undefined;

        if (mounted && status !== undefined && status >= 400 && status < 500) {
          localStorage.removeItem(storageKey);
          clearState(null);
        }
      }
    };

    void Promise.all([
      validate(divisionId, "/divisions", "lastDivisionId", setDivisionId),
      validate(workspaceId, "/workspaces", "lastWorkspaceId", setWorkspaceId),
      validate(campaignId, "/campaigns", "lastCampaignId", setCampaignId),
    ]);

    return () => {
      mounted = false;
    };
  }, [divisionId, workspaceId, campaignId]);

  return { divisionId, workspaceId, campaignId };
}

/* -------------------------------------------------------------------------- */
/*                                 TREE LEAF                                  */
/* -------------------------------------------------------------------------- */

type TreeLeafProps = {
  name: string;
  path: string;
  active: boolean;
  onNavigate?: () => void;
};

const TreeLeaf = memo(function TreeLeaf({
  name,
  path,
  active,
  onNavigate,
}: TreeLeafProps) {
  return (
    <li>
      <Link
        to={path}
        onClick={onNavigate}
        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-all ${
          active
            ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400"
            : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
        }`}
      >
        <DotIcon />
        <span className="truncate">{name}</span>
      </Link>
    </li>
  );
});

/* -------------------------------------------------------------------------- */
/*                                TREE BRANCH                                 */
/* -------------------------------------------------------------------------- */

type TreeBranchProps = {
  subItem: SubItem;
  onNavigate?: () => void;
};

const TreeBranch = memo(function TreeBranch({
  subItem,
  onNavigate,
}: TreeBranchProps) {
  const hasChildren = !!subItem.children?.length;
  const location = useLocation();

  const active = useMemo(() => {
    if (startsWithRoute(location.pathname, subItem.path)) {
      return true;
    }

    return (
      subItem.children?.some(
        (child) =>
          !child.isFallback && startsWithRoute(location.pathname, child.path),
      ) ?? false
    );
  }, [location.pathname, subItem]);

  const activeChildIndex = useMemo(() => {
    if (!subItem.children?.length) return -1;

    let bestIndex = -1;
    let bestLength = -1;

    subItem.children.forEach((child, index) => {
      if (
        !child.isFallback &&
        startsWithRoute(location.pathname, child.path) &&
        child.path.length > bestLength
      ) {
        bestLength = child.path.length;
        bestIndex = index;
      }
    });

    return bestIndex;
  }, [location.pathname, subItem.children]);

  const [open, setOpen] = useState(active);

  useEffect(() => {
    if (active) {
      setOpen(true);
    }
  }, [active]);

  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!contentRef.current) return;

    const element = contentRef.current;
    const updateHeight = () => setHeight(element.scrollHeight);

    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <li>
      {hasChildren ? (
        <>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              active
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            }`}
          >
            <span className="flex-1 truncate text-left">{subItem.name}</span>
            <ChevronDownIcon
              className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>

          <div
            ref={contentRef}
            className="overflow-hidden transition-all duration-300"
            style={{ maxHeight: open ? `${height}px` : "0px" }}
          >
            <ul className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-3 dark:border-gray-700">
              {subItem.children?.map((child, index) => (
                <TreeLeaf
                  key={child.name}
                  name={child.name}
                  path={child.path}
                  active={index === activeChildIndex}
                  onNavigate={onNavigate}
                />
              ))}
            </ul>
          </div>
        </>
      ) : (
        <Link
          to={subItem.path}
          onClick={onNavigate}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
            active
              ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
          }`}
        >
          <DotIcon />
          <span className="truncate">{subItem.name}</span>
        </Link>
      )}
    </li>
  );
});

/* -------------------------------------------------------------------------- */
/*                                MAIN SIDEBAR                                */
/* -------------------------------------------------------------------------- */

const AppSidebar: React.FC = () => {
  const {
    isExpanded,
    isHovered,
    isMobileOpen,
    setIsHovered,
    toggleSidebar,
    toggleMobileSidebar,
  } = useSidebar();

  const location = useLocation();
  const auth = useAuth();

  const isSuperAdmin = useMemo(() => {
    try {
      return typeof auth?.hasRole === "function"
        ? !!auth.hasRole("super_admin")
        : false;
    } catch {
      return false;
    }
  }, [auth]);

  const { divisionId, workspaceId, campaignId } =
    usePersistedRouteParams(isSuperAdmin);

  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);

  const slim = !isExpanded && !isHovered && !isMobileOpen;

  // Handler untuk menutup mobile menu setelah klik link
  const handleNavClick = useCallback(() => {
    if (isMobileOpen) {
      toggleMobileSidebar();
    }
  }, [isMobileOpen, toggleMobileSidebar]);

  const can = useCallback(
    (permission: string) => {
      if (isSuperAdmin) return true;
      try {
        return typeof auth?.can === "function" ? !!auth.can(permission) : false;
      } catch {
        return false;
      }
    },
    [auth, isSuperAdmin],
  );

  /* ---------------------------------------------------------------------- */
  /*                              DYNAMIC MENU                              */
  /* ---------------------------------------------------------------------- */

  const navItems = useMemo<NavItem[]>(() => {
    try {
      return [
        {
          icon: <GridIcon />,
          name: "Dashboard",
          path: isSuperAdmin ? "/dashboard" : "/my-work",
        },
        {
          name: "Task Management",
          icon: <BoxCubeIcon />,
          subItems: [
            {
              name: "Task Manager",
              path: "/divisions",
              children: [
                ...(isSuperAdmin
                  ? [
                      {
                        name: "Divisions",
                        path: "/divisions",
                      },
                    ]
                  : []),
                {
                  name: "Workspace",
                  path: divisionId
                    ? `/divisions/${divisionId}`
                    : isSuperAdmin
                      ? "/divisions"
                      : "/my-work",
                  isFallback: !divisionId,
                },
                {
                  name: "Campaigns",
                  path: workspaceId
                    ? `/workspaces/${workspaceId}/campaigns`
                    : isSuperAdmin
                      ? "/divisions"
                      : "/my-work",
                  isFallback: !workspaceId,
                },
                ...(workspaceId && campaignId
                  ? [
                      {
                        name: "Campaign Detail",
                        path: `/workspaces/${workspaceId}/campaigns/${campaignId}`,
                      },
                      {
                        name: "Board",
                        path: `/workspaces/${workspaceId}/campaigns/${campaignId}/boards`,
                      },
                    ]
                  : []),
              ],
            },
          ],
        },
        {
          name: "Calendar",
          icon: <ListIcon />,
          path: "/calendar",
        },
        ...(can("form.view")
          ? [
              {
                name: "Forms",
                icon: <ListIcon />,
                subItems: [
                  ...(can("form.view")
                    ? [
                        {
                          name: "All Forms",
                          path: "/forms",
                        },
                      ]
                    : []),
                  ...(can("form.create")
                    ? [
                        {
                          name: "Create Form",
                          path: "/forms/create",
                        },
                      ]
                    : []),
                ],
              },
            ]
          : []),
        {
          name: "Chats",
          icon: <ListIcon />,
          path: "/chats",
        },
        ...(can("report.view")
          ? [
              {
                name: "Report",
                icon: <ListIcon />,
                path: "/reports",
              },
            ]
          : []),
        ...(can("profile.view")
          ? [
              {
                icon: <UserCircleIcon />,
                name: "User Management",
                path: "/profile",
              },
            ]
          : []),
      ];
    } catch (error) {
      console.error("Gagal membangun menu sidebar:", error);
      return [
        {
          icon: <GridIcon />,
          name: "Dashboard",
          path: isSuperAdmin ? "/dashboard" : "/my-work",
        },
      ];
    }
  }, [divisionId, workspaceId, campaignId, can, isSuperAdmin]);

  /* ---------------------------------------------------------------------- */
  /*                             ACTIVE MATCHER                             */
  /* ---------------------------------------------------------------------- */

  const routeActiveIndex = useMemo(() => {
    return navItems.findIndex((item) => {
      if (!item.subItems) return false;

      return item.subItems.some((sub) => {
        if (startsWithRoute(location.pathname, sub.path)) return true;

        return (
          sub.children?.some(
            (child) =>
              !child.isFallback &&
              startsWithRoute(location.pathname, child.path),
          ) ?? false
        );
      });
    });
  }, [location.pathname, navItems]);

  useEffect(() => {
    setOpenSubmenu(routeActiveIndex >= 0 ? routeActiveIndex : null);
  }, [routeActiveIndex]);

  const handleMouseEnter = () => {
    if (!isExpanded) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={toggleMobileSidebar}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed bottom-4 left-4 top-4 z-50 flex flex-col overflow-hidden rounded-[32px] border border-gray-200/70 bg-white/95 shadow-2xl backdrop-blur-xl transition-all duration-300 dark:border-gray-800 dark:bg-gray-950/95 ${
          slim ? "w-[76px]" : "w-[270px]"
        } ${
          isMobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-5 dark:border-gray-800">
          <Link to="/" onClick={handleNavClick} className="flex shrink-0 items-center">
            {slim ? (
              <img
                src="/images/logo/icon.svg"
                alt="Logo"
                className="h-8 w-8 object-contain"
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
              onClick={toggleSidebar}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
              aria-label="Toggle sidebar"
            >
              ☰
            </button>
          )}
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 space-y-4">
          <UserDropdown compact={slim} />

          <div className="border-t border-gray-100 dark:border-gray-800" />

          {/* MENU */}
          <nav className="space-y-1">
            {!slim ? (
              <p className="mb-2 px-2 text-[10px] uppercase tracking-widest text-gray-400">
                Menu
              </p>
            ) : (
              <div className="mb-2 flex justify-center">
                <HorizontaLDots className="h-5 w-5 text-gray-300 dark:text-gray-600" />
              </div>
            )}

            <ul className="space-y-1">
              {navItems.map((item, index) => {
                const isOpen = openSubmenu === index;

                if (item.subItems) {
                  return (
                    <li key={item.name}>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenSubmenu((prev) =>
                            prev === index ? null : index,
                          )
                        }
                        className={`${menuItemBase} w-full px-3 py-2.5 ${
                          routeActiveIndex === index
                            ? menuItemActive
                            : menuItemInactive
                        } ${slim ? "justify-center" : ""}`}
                      >
                        <span className="shrink-0">{item.icon}</span>

                        {!slim && (
                          <>
                            <span className="flex-1 truncate text-left text-sm font-medium">
                              {item.name}
                            </span>
                            <ChevronDownIcon
                              className={`h-4 w-4 shrink-0 transition-transform ${
                                isOpen ? "rotate-180" : ""
                              }`}
                            />
                          </>
                        )}
                      </button>

                      {!slim && (
                        <div
                          className={`overflow-hidden transition-all duration-300 ${
                            isOpen
                              ? "max-h-[600px] opacity-100"
                              : "max-h-0 opacity-0"
                          }`}
                        >
                          <ul className="ml-4 mt-2 space-y-1 border-l border-gray-200 pl-3 dark:border-gray-700">
                            {item.subItems.map((subItem) => (
                              <TreeBranch
                                key={`${item.name}-${subItem.name}`}
                                subItem={subItem}
                                onNavigate={handleNavClick}
                              />
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                }

                if (!item.path) return null;

                return (
                  <li key={item.name}>
                    <Link
                      to={item.path}
                      onClick={handleNavClick}
                      className={`${menuItemBase} px-3 py-2.5 ${
                        startsWithRoute(location.pathname, item.path)
                          ? menuItemActive
                          : menuItemInactive
                      }`}
                    >
                      <span className="shrink-0">{item.icon}</span>

                      {!slim && (
                        <span className="truncate text-sm font-medium">
                          {item.name}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
};

export default memo(AppSidebar);