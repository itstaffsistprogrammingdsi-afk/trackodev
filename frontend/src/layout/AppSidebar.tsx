import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { AxiosError } from "axios";
import {
  Building2,
  Check,
  ChevronsUpDown,
  ChevronsLeft,
  FolderKanban,
  Search,
} from "lucide-react";
import api from "@/lib/axios";

import UserDropdown from "../components/header/UserDropdown";
import {
  BoxCubeIcon,
  ChevronDownIcon,
  FileIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  TaskIcon,
  UserCircleIcon,
} from "../icons";

import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useDivisions } from "@/features/division/hooks/useDivisions";
import CommandPalette from "@/components/layout/CommandPalette";
import type { CommandPaletteItem } from "@/components/layout/CommandPalette";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem";

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
  /** Cocokkan path persis, bukan prefix (mis. Divisi vs Workspace). */
  exact?: boolean;
};

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: SubItem[];
  group?: string;
  /** Prefix route yang membuat menu parent tetap aktif (mis. /forms/*). */
  activePrefixes?: string[];
};

const navEnglish: Record<string, string> = {
  Dashboard: "Dashboard",
  "My Work": "My Work",
  "Virtual Office": "Virtual office",
  "Task Management": "Task management",
  Divisi: "Divisions",
  "Divisi saya": "My divisions",
  Workspace: "Workspaces",
  Campaign: "Campaigns",
  "Detail campaign": "Campaign detail",
  Board: "Board",
  Calendar: "Calendar",
  Form: "Forms",
  "Semua form": "All forms",
  "Buat form": "Create form",
  Chats: "Chats",
  Report: "Reports",
  "User Management": "User management",
  "Studio Maskot": "Mascot studio",
  Utama: "Main",
  Kolaborasi: "Collaboration",
  Lainnya: "Other",
  "Semua divisi": "All divisions",
};

function navGroup(name: string): string {
  if (["Dashboard", "My Work", "Virtual Office", "Task Management"].includes(name)) {
    return "Utama";
  }
  if (["Calendar", "Form", "Chats", "Report"].includes(name)) {
    return "Kolaborasi";
  }
  return "Lainnya";
}

/* -------------------------------------------------------------------------- */
/*                                 UTILITIES                                  */
/* -------------------------------------------------------------------------- */

const DotIcon = memo(() => (
  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
));

DotIcon.displayName = "DotIcon";

const menuItemBase =
  "relative flex items-center gap-3 rounded-control transition-colors duration-150";

const menuItemInactive =
  "text-fg-muted hover:bg-surface-muted hover:text-fg";

const menuItemActive =
  "bg-accent-soft text-accent-strong before:absolute before:left-0 before:top-1/2 before:h-4 before:w-[2px] before:-translate-y-1/2 before:rounded-full before:bg-accent";

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

function usePersistedRouteParams(
  isSuperAdmin: boolean,
  accessibleDivisions: Array<{ id: string }> | undefined,
) {
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
      if (id !== divisionId) {
        setWorkspaceId(null);
        setCampaignId(null);
        localStorage.removeItem("lastWorkspaceId");
        localStorage.removeItem("lastCampaignId");
      }
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
  }, [divisionId, location.pathname]);

  // Auto-discover divisionId untuk non-superadmin jika localStorage masih kosong
  useEffect(() => {
    if (isSuperAdmin || accessibleDivisions === undefined) return;
    if (divisionId && accessibleDivisions.some((division) => division.id === divisionId)) {
      return;
    }

    const first = accessibleDivisions[0];
    if (first?.id) {
      setDivisionId(first.id);
      localStorage.setItem("lastDivisionId", first.id);
      return;
    }

    setDivisionId(null);
    setWorkspaceId(null);
    setCampaignId(null);
    localStorage.removeItem("lastDivisionId");
    localStorage.removeItem("lastWorkspaceId");
    localStorage.removeItem("lastCampaignId");
  }, [accessibleDivisions, divisionId, isSuperAdmin]);

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
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-2 rounded-control px-3 py-1.5 text-xs transition-colors duration-150 ${
          active
            ? "bg-accent-soft text-accent-strong"
            : "text-fg-subtle hover:bg-surface-muted hover:text-fg"
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
  translateName: (name: string) => string;
};

const TreeBranch = memo(function TreeBranch({
  subItem,
  onNavigate,
  translateName,
}: TreeBranchProps) {
  const hasChildren = !!subItem.children?.length;
  const location = useLocation();

  const active = useMemo(() => {
    const pathMatches = subItem.exact
      ? location.pathname === subItem.path
      : startsWithRoute(location.pathname, subItem.path);

    if (pathMatches) {
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
            className={`flex w-full items-center gap-2 rounded-control px-3 py-2 text-xs font-medium transition-colors duration-150 ${
              active
                ? "text-accent-strong"
                : "text-fg-muted hover:bg-surface-muted hover:text-fg"
            }`}
          >
            <span className="flex-1 truncate text-left">
              {translateName(subItem.name)}
            </span>
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
            <ul className="ml-4 mt-1 space-y-1 border-l border-line pl-3">
              {subItem.children?.map((child, index) => (
                <TreeLeaf
                  key={child.name}
                  name={translateName(child.name)}
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
          aria-current={active ? "page" : undefined}
          className={`flex items-center gap-2 rounded-control px-3 py-2 text-xs font-medium transition-colors duration-150 ${
            active
              ? "bg-accent-soft text-accent-strong"
              : "text-fg-muted hover:bg-surface-muted hover:text-fg"
          }`}
        >
          <DotIcon />
          <span className="truncate">{translateName(subItem.name)}</span>
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
  const { language, t } = useLanguage();

  const label = useCallback(
    (name: string) => t(name, navEnglish[name] ?? name),
    [t],
  );

  const isSuperAdmin = useMemo(() => {
    try {
      return typeof auth?.hasRole === "function"
        ? !!auth.hasRole("super_admin")
        : false;
    } catch {
      return false;
    }
  }, [auth]);

  const canViewAllDivisions = useMemo(() => {
    try {
      return typeof auth?.hasRole === "function" && auth.hasRole("super_admin")
        ? true
        : typeof auth?.can === "function"
          ? !!auth.can("division.view_all")
          : false;
    } catch {
      return false;
    }
  }, [auth]);

  const { data: accessibleDivisions } = useDivisions(true, !canViewAllDivisions);
  const { data: allDivisions } = useDivisions(false, canViewAllDivisions);
  const { divisionId, workspaceId, campaignId } =
    usePersistedRouteParams(canViewAllDivisions, accessibleDivisions);

  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const switcherDivisions = canViewAllDivisions
    ? allDivisions
    : accessibleDivisions;
  const currentDivision = switcherDivisions?.find(
    (division) => division.id === divisionId,
  );

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
      const items: NavItem[] = [
        ...(can("dashboard.view") || can("my_work.view")
          ? [{
              icon: <GridIcon />,
              name: can("dashboard.view") ? "Dashboard" : "My Work",
              path: can("dashboard.view") ? "/dashboard" : "/my-work",
            }]
          : []),
        ...(can("dashboard.view") || can("my_work.view")
          ? [{
              icon: <BoxCubeIcon />,
              name: "Virtual Office",
              path: "/virtual-office",
            }]
          : []),
        {
          name: "Task Management",
          icon: <TaskIcon />,
          subItems: [
            {
              name: canViewAllDivisions ? "Divisi" : "Divisi saya",
              path: "/divisions",
              exact: true,
            },
            ...(divisionId
              ? [
                  {
                    name: "Workspace",
                    path: `/divisions/${divisionId}`,
                    exact: true,
                  },
                ]
              : []),
            ...(workspaceId
              ? [
                  {
                    name: "Campaign",
                    path: `/workspaces/${workspaceId}/campaigns`,
                    exact: true,
                  },
                ]
              : []),
            ...(workspaceId && campaignId
              ? [
                  {
                    name: "Detail campaign",
                    path: `/workspaces/${workspaceId}/campaigns/${campaignId}`,
                    exact: true,
                  },
                  {
                    name: "Board",
                    path: `/workspaces/${workspaceId}/campaigns/${campaignId}/boards`,
                    exact: true,
                  },
                ]
              : []),
          ],
        },
        ...(can("calendar.view")
          ? [{
              name: "Calendar",
              icon: <ListIcon />,
              path: "/calendar",
            }]
          : []),
        ...(can("form.view")
          ? [
              {
                name: "Form",
                icon: <FileIcon />,
                activePrefixes: ["/forms"],
                subItems: [
                  ...(can("form.view")
                    ? [
                        {
                          name: "Semua form",
                          path: "/forms",
                          exact: true,
                        },
                      ]
                    : []),
                  ...(can("form.create")
                    ? [
                        {
                          name: "Buat form",
                          path: "/forms/create",
                          exact: true,
                        },
                      ]
                    : []),
                ],
              },
            ]
          : []),
        ...(can("chat.view")
          ? [{
              name: "Chats",
              icon: <ListIcon />,
              path: "/chats",
            }]
          : []),
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
        {
          icon: <BoxCubeIcon />,
          name: "Studio Maskot",
          path: "/assistant/preview",
        },
      ];

      return items.map((item) => ({
        ...item,
        group: item.group ?? navGroup(item.name),
      }));
    } catch (error) {
      console.error("Gagal membangun menu sidebar:", error);
      return [
        {
          icon: <GridIcon />,
          name: can("dashboard.view") ? "Dashboard" : "My Work",
          path: can("dashboard.view") ? "/dashboard" : "/my-work",
        },
      ];
    }
  }, [divisionId, workspaceId, campaignId, can, canViewAllDivisions]);

  const paletteItems = useMemo<CommandPaletteItem[]>(() => {
    const result: CommandPaletteItem[] = [];

    for (const item of navItems) {
      if (item.path) {
        result.push({
          id: item.name,
          label: label(item.name),
          path: item.path,
          group: item.group ? label(item.group) : undefined,
          icon: item.icon,
        });
      }

      for (const sub of item.subItems ?? []) {
        result.push({
          id: `${item.name}-${sub.name}`,
          label: label(sub.name),
          path: sub.path,
          group: label(item.name),
          icon: item.icon,
        });

        for (const child of sub.children ?? []) {
          if (child.isFallback) continue;

          result.push({
            id: `${item.name}-${sub.name}-${child.name}`,
            label: label(child.name),
            path: child.path,
            group: `${label(item.name)} · ${label(sub.name)}`,
            icon: item.icon,
          });
        }
      }
    }

    return result;
    // `language` ikut dependency agar label palette ikut berubah saat bahasa diganti.
  }, [navItems, label, language]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  /* ---------------------------------------------------------------------- */
  /*                             ACTIVE MATCHER                             */
  /* ---------------------------------------------------------------------- */

  const routeActiveIndex = useMemo(() => {
    return navItems.findIndex((item) => {
      if (!item.subItems) return false;

      if (
        item.activePrefixes?.some((prefix) =>
          startsWithRoute(location.pathname, prefix),
        )
      ) {
        return true;
      }

      return item.subItems.some((sub) => {
        if (sub.exact ? location.pathname === sub.path : startsWithRoute(location.pathname, sub.path)) {
          return true;
        }

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
          aria-label={t("Tutup sidebar", "Close sidebar")}
          onClick={toggleMobileSidebar}
          className="fixed inset-0 z-40 bg-overlay lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col overflow-hidden rounded-r-panel border border-line bg-surface shadow-e2 transition-transform duration-200 ease-soft sm:bottom-4 sm:left-4 sm:top-4 sm:rounded-panel ${
          slim ? "w-[76px]" : "w-[min(88vw,300px)] sm:w-[270px]"
        } ${
          isMobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-line px-4 py-4">
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
              title={t("Ciutkan sidebar", "Collapse sidebar")}
              className="flex h-8 w-8 items-center justify-center rounded-[7px] border border-line bg-surface text-fg-subtle transition-colors hover:border-line-strong hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              aria-label={t("Ciutkan sidebar", "Collapse sidebar")}
            >
              <ChevronsLeft aria-hidden="true" className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* CONTENT */}
        <div className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4">
          {switcherDivisions?.length ? (
            slim ? (
              <Link
                to={divisionId ? `/divisions/${divisionId}` : "/divisions"}
                title={currentDivision?.name ?? label("Divisi")}
                onClick={handleNavClick}
                className="mx-auto flex h-10 w-10 items-center justify-center rounded-control border border-line bg-surface text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <Building2 aria-hidden="true" className="h-4 w-4" />
              </Link>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSwitcherOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={switcherOpen}
                  className="dropdown-toggle flex w-full items-center gap-2.5 rounded-control border border-line bg-surface px-2.5 py-2 text-left transition-colors hover:border-line-strong hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-accent-soft text-accent">
                    <Building2 aria-hidden="true" className="h-3.5 w-3.5" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-medium text-fg-subtle">
                      {label("Divisi")}
                    </span>
                    <span className="block truncate text-xs font-medium text-fg">
                      {location.pathname === "/divisions"
                        ? canViewAllDivisions
                          ? label("Semua divisi")
                          : label("Divisi saya")
                        : currentDivision?.name ??
                          (canViewAllDivisions
                            ? label("Semua divisi")
                            : label("Divisi saya"))}
                    </span>
                  </span>

                  <ChevronsUpDown
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0 text-fg-subtle"
                  />
                </button>

                <Dropdown
                  isOpen={switcherOpen}
                  onClose={() => setSwitcherOpen(false)}
                  align="left"
                  className="w-full p-1.5"
                >
                  <p className="px-2 py-1 text-[10px] font-medium text-fg-subtle">
                    {t("Pindah divisi", "Switch division")}
                  </p>

                  <div className="max-h-60 overflow-y-auto">
                    {switcherDivisions.map((division) => {
                      const selected = division.id === divisionId;

                      return (
                        <DropdownItem
                          key={division.id}
                          tag="a"
                          to={`/divisions/${division.id}`}
                          icon={
                            selected ? (
                              <Check
                                aria-hidden="true"
                                className="h-3.5 w-3.5 text-accent"
                              />
                            ) : (
                              <Building2
                                aria-hidden="true"
                                className="h-3.5 w-3.5 text-fg-subtle"
                              />
                            )
                          }
                          className={
                            selected
                              ? "bg-accent-soft text-accent-strong hover:bg-accent-soft"
                              : undefined
                          }
                          onClick={() => {
                            localStorage.setItem("lastDivisionId", division.id);
                            localStorage.removeItem("lastWorkspaceId");
                            localStorage.removeItem("lastCampaignId");
                          }}
                          onItemClick={() => {
                            setSwitcherOpen(false);
                            handleNavClick();
                          }}
                        >
                          {division.name}
                        </DropdownItem>
                      );
                    })}
                  </div>

                  <div className="my-1 border-t border-line" />

                  <DropdownItem
                    tag="a"
                    to={divisionId ? `/divisions/${divisionId}` : "/divisions"}
                    icon={
                      <FolderKanban
                        aria-hidden="true"
                        className="h-3.5 w-3.5 text-fg-subtle"
                      />
                    }
                    onItemClick={() => {
                      setSwitcherOpen(false);
                      handleNavClick();
                    }}
                  >
                    {t("Daftar workspace", "Workspace list")}
                  </DropdownItem>
                </Dropdown>
              </div>
            )
          ) : null}

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            title={t("Cari menu (Ctrl+K)", "Search menu (Ctrl+K)")}
            aria-label={t("Cari menu", "Search menu")}
            className={
              slim
                ? "mx-auto flex h-9 w-9 items-center justify-center rounded-control text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                : "flex h-9 w-full items-center gap-2 rounded-control border border-line bg-surface px-2.5 text-xs text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            }
          >
            <Search aria-hidden="true" className="h-4 w-4 shrink-0" />
            {!slim ? (
              <>
                <span className="flex-1 text-left">
                  {t("Cari menu", "Search menu")}
                </span>
                <kbd className="rounded border border-line bg-surface-muted px-1.5 py-0.5 text-2xs">
                  {typeof navigator !== "undefined" &&
                  /Mac|iPhone|iPad/i.test(navigator.platform)
                    ? "⌘K"
                    : "Ctrl K"}
                </kbd>
              </>
            ) : null}
          </button>

          {/* MENU */}
          <nav className="space-y-1">
            {slim ? (
              <div className="mb-2 flex justify-center">
                <HorizontaLDots className="h-5 w-5 text-fg-subtle" />
              </div>
            ) : null}

            <ul className="space-y-1">
              {navItems.map((item, index) => {
                const isOpen = openSubmenu === index;
                const previousGroup = navItems[index - 1]?.group;
                const showGroup = !slim && item.group && item.group !== previousGroup;

                if (item.subItems) {
                  return (
                    <li key={item.name}>
                      {showGroup ? (
                        <p
                          className={`px-2 text-[11px] font-medium text-fg-subtle ${
                            index === 0 ? "mb-2" : "mb-2 mt-4"
                          }`}
                        >
                          {label(item.group ?? "")}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        title={slim ? label(item.name) : undefined}
                        onClick={() =>
                          setOpenSubmenu((prev) =>
                            prev === index ? null : index,
                          )
                        }
                        className={`${menuItemBase} w-full px-3 py-2 ${
                          routeActiveIndex === index
                            ? menuItemActive
                            : menuItemInactive
                        } ${slim ? "justify-center" : ""}`}
                      >
                        <span className="shrink-0 [&_svg]:h-5 [&_svg]:w-5">
                          {item.icon}
                        </span>

                        {!slim && (
                          <>
                            <span className="flex-1 truncate text-left text-sm font-medium">
                              {label(item.name)}
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
                          <ul className="ml-4 mt-2 space-y-1 border-l border-line pl-3">
                            {item.subItems.map((subItem) => (
                              <TreeBranch
                                key={`${item.name}-${subItem.name}`}
                                subItem={subItem}
                                onNavigate={handleNavClick}
                                translateName={label}
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
                    {showGroup ? (
                      <p
                        className={`px-2 text-[11px] font-medium text-fg-subtle ${
                          index === 0 ? "mb-2" : "mb-2 mt-4"
                        }`}
                      >
                        {label(item.group ?? "")}
                      </p>
                    ) : null}
                    <Link
                      to={item.path}
                      onClick={handleNavClick}
                      title={slim ? label(item.name) : undefined}
                      aria-current={
                        startsWithRoute(location.pathname, item.path)
                          ? "page"
                          : undefined
                      }
                      className={`${menuItemBase} px-3 py-2 ${
                        startsWithRoute(location.pathname, item.path)
                          ? menuItemActive
                          : menuItemInactive
                      }`}
                    >
                      <span className="shrink-0 [&_svg]:h-5 [&_svg]:w-5">
                        {item.icon}
                      </span>

                      {!slim && (
                        <span className="truncate text-sm font-medium">
                          {label(item.name)}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="border-t border-line p-3">
          <UserDropdown compact={slim} />
        </div>
      </aside>

      <CommandPalette
        open={paletteOpen}
        items={paletteItems}
        onClose={() => setPaletteOpen(false)}
        onNavigate={handleNavClick}
      />
    </>
  );
};

export default memo(AppSidebar);
