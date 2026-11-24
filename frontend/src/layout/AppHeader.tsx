import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ArrowLeft, ChevronRight, Languages, Menu } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import NotificationBell from "../components/header/NotificationBell";
import { useSidebar } from "../context/SidebarContext";
import { toast } from "@/lib/feedback";

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

const breadcrumbEnglish: Record<string, string> = {
  Divisi: "Divisions",
  Workspace: "Workspace",
  Campaign: "Campaign",
  "Detail campaign": "Campaign detail",
  "Detail divisi": "Division detail",
  Board: "Board",
  Form: "Forms",
  "Buat form": "Create form",
  "Builder form": "Form builder",
  "Edit form": "Edit form",
  Responses: "Responses",
  Chat: "Chat",
  Notifikasi: "Notifications",
  Kalender: "Calendar",
  "Virtual office": "Virtual office",
  Laporan: "Reports",
  Profil: "Profile",
  "Pengaturan akun": "Account settings",
  Integrasi: "Integrations",
  "Studio Maskot": "Mascot studio",
};

/* -------------------------------------------------------------------------- */
/*                                   ROUTES                                   */
/* -------------------------------------------------------------------------- */

const breadcrumbRoutes: BreadcrumbRoute[] = [
  { pattern: "/divisions", label: "Divisi" },
  { pattern: "/divisions/:id", label: "Workspace" },
  { pattern: "/divisions/:id/detail", label: "Detail divisi" },
  { pattern: "/workspaces/:workspaceId/campaigns", label: "Campaign" },
  {
    pattern: "/workspaces/:workspaceId/campaigns/:campaignId",
    label: "Detail campaign",
  },
  {
    pattern: "/workspaces/:workspaceId/campaigns/:campaignId/boards",
    label: "Board",
  },
  { pattern: "/forms", label: "Form" },
  { pattern: "/forms/create", label: "Buat form" },
  { pattern: "/forms/:id/builder", label: "Builder form" },
  { pattern: "/forms/:id/edit", label: "Edit form" },
  { pattern: "/forms/:id/responses", label: "Responses" },
  { pattern: "/chats", label: "Chat" },
  { pattern: "/notifications", label: "Notifikasi" },
  { pattern: "/calendar", label: "Kalender" },
  { pattern: "/virtual-office", label: "Virtual office" },
  { pattern: "/reports", label: "Laporan" },
  { pattern: "/profile", label: "Profil" },
  { pattern: "/account/edit", label: "Pengaturan akun" },
  { pattern: "/integrations", label: "Integrasi" },
  { pattern: "/assistant/preview", label: "Studio Maskot" },
];

/**
 * Halaman workspace memakai ID divisi yang terakhir dipilih (disimpan sidebar).
 * Tanpa ID itu, breadcrumb workspace lebih baik tidak ditampilkan daripada
 * menjadi teks mati yang tidak bisa diklik.
 */
function storedDivisionHref(): string | null {
  try {
    const divisionId = localStorage.getItem("lastDivisionId");
    return divisionId ? `/divisions/${divisionId}` : null;
  } catch {
    return null;
  }
}

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
  const divisionHref = storedDivisionHref();
  const workspaceCrumbs: BreadcrumbItem[] = divisionHref
    ? [{ href: divisionHref, label: "Workspace" }]
    : [];

  if (pathname === "/divisions") {
    return [{ href: "/divisions", label: "Divisi" }];
  }

  const workspaceMatch = pathname.match(/^\/divisions\/([^/]+)$/);
  if (workspaceMatch) {
    const divisionId = workspaceMatch[1];
    return [
      { href: "/divisions", label: "Divisi" },
      { href: `/divisions/${divisionId}`, label: "Workspace" },
    ];
  }

  const divisionDetailMatch = pathname.match(/^\/divisions\/([^/]+)\/detail$/);
  if (divisionDetailMatch) {
    const divisionId = divisionDetailMatch[1];
    return [
      { href: "/divisions", label: "Divisi" },
      { href: `/divisions/${divisionId}`, label: "Workspace" },
      { label: "Detail divisi" },
    ];
  }

  const campaignListMatch = pathname.match(
    /^\/workspaces\/([^/]+)\/campaigns$/,
  );
  if (campaignListMatch) {
    const workspaceId = campaignListMatch[1];
    return [
      { href: "/divisions", label: "Divisi" },
      ...workspaceCrumbs,
      { href: `/workspaces/${workspaceId}/campaigns`, label: "Campaign" },
    ];
  }

  const campaignDetailMatch = pathname.match(
    /^\/workspaces\/([^/]+)\/campaigns\/([^/]+)$/,
  );
  if (campaignDetailMatch) {
    const workspaceId = campaignDetailMatch[1];
    return [
      { href: "/divisions", label: "Divisi" },
      ...workspaceCrumbs,
      { href: `/workspaces/${workspaceId}/campaigns`, label: "Campaign" },
      {
        label: "Detail campaign",
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
      { href: "/divisions", label: "Divisi" },
      ...workspaceCrumbs,
      { href: `/workspaces/${workspaceId}/campaigns`, label: "Campaign" },
      {
        href: `/workspaces/${workspaceId}/campaigns/${campaignId}`,
        label: "Detail campaign",
      },
      { label: "Board" },
    ];
  }

  const formResponsesMatch = pathname.match(/^\/forms\/([^/]+)\/responses$/);
  if (formResponsesMatch) {
    return [
      { href: "/forms", label: "Form" },
      { label: "Responses" },
    ];
  }

  const matchedRoute = breadcrumbRoutes
    .filter((route) => matchRoute(pathname, route.pattern))
    .sort((a, b) => b.pattern.length - a.pattern.length)[0];

  if (matchedRoute) {
    return [{ label: matchedRoute.label }];
  }

  return [];
}

/* -------------------------------------------------------------------------- */
/*                                 COMPONENT                                  */
/* -------------------------------------------------------------------------- */

const AppHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const { toggleMobileSidebar } = useSidebar();

  const canViewAllDivisions = useMemo(() => {
    try {
      if (typeof auth?.hasRole === "function" && auth.hasRole("super_admin")) {
        return true;
      }

      return typeof auth?.can === "function"
        ? !!auth.can("division.view_all")
        : false;
    } catch {
      return false;
    }
  }, [auth]);

  const breadcrumbLabel = (label: string) =>
    t(label, breadcrumbEnglish[label] ?? label);

  const canViewNotifications = useMemo(() => {
    try {
      return typeof auth?.can === "function"
        ? !!auth.can("notification.view")
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

    // Non-superadmin tidak punya akses ke daftar seluruh divisi. Hapus crumb
    // itu daripada menampilkan teks yang terlihat seperti tautan mati.
    if (canViewAllDivisions) return raw;

    return raw.filter((crumb) => crumb.href !== "/divisions");
  }, [location.pathname, canViewAllDivisions]);

  const showBack = !["/", "/dashboard", "/my-work"].includes(location.pathname);

  const handleBack = (): void => {
    if (location.key !== "default") {
      navigate(-1);
      return;
    }

    navigate(canViewAllDivisions ? "/dashboard" : "/my-work");
  };

  const handleBackToAdmin = (): void => {
    const adminToken = localStorage.getItem("admin_token");
    if (!adminToken) {
      toast.error(
        t("Admin token tidak ditemukan", "Admin token not found"),
      );
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
    relative
    z-30
    border-b
    border-line
    bg-canvas/85
    backdrop-blur-md
    dark:bg-canvas/80
    flex
    shrink-0
    flex-col
    gap-3
    px-3
    py-3
    xsm:px-4
    transition-colors
    lg:flex-row
    lg:items-center
    lg:justify-between
    lg:px-8
    lg:py-3.5
  "
>
      {/* Breadcrumb & Mobile Menu */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-line bg-surface text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg lg:hidden"
          aria-label={t("Buka menu navigasi", "Open navigation menu")}
        >
          <Menu className="h-5 w-5" />
        </button>

        {showBack ? (
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control border border-line bg-surface px-2.5 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            aria-label={t(
              "Kembali ke halaman sebelumnya",
              "Back to previous page",
            )}
            title={t("Kembali", "Back")}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t("Kembali", "Back")}</span>
          </button>
        ) : null}

        <div className="min-w-0 flex-1 overflow-hidden">
          <nav
            aria-label="Breadcrumb"
            className="scrollbar-hide flex items-center gap-2 overflow-x-auto whitespace-nowrap py-1"
          >
            <Link
              to="/"
              className={`text-sm font-medium transition-colors ${
                location.pathname === "/"
                  ? "text-accent"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              {t("Beranda", "Home")}
            </Link>

            {breadcrumbs.map((breadcrumb, index) => {
              const isLast = index === breadcrumbs.length - 1;

              return (
                <div
                  key={`${breadcrumb.href ?? breadcrumb.label}-${index}`}
                  className="flex shrink-0 items-center gap-2"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-fg-subtle" aria-hidden="true" />

                  {isLast ? (
                    <span
                      aria-current="page"
                      className="text-sm font-medium text-fg"
                    >
                      {breadcrumbLabel(breadcrumb.label)}
                    </span>
                  ) : breadcrumb.href ? (
                    <Link
                      to={breadcrumb.href}
                      className="text-sm font-medium text-fg-muted transition-colors hover:text-fg"
                    >
                      {breadcrumbLabel(breadcrumb.label)}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-fg-subtle">
                      {breadcrumbLabel(breadcrumb.label)}
                    </span>
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
          <div className="flex flex-1 items-center justify-between gap-3 rounded-full border border-warning/25 bg-warning-soft px-3 py-1.5 lg:flex-none">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-warning" aria-hidden="true" />

              <span className="text-xs font-medium text-warning">
                {t("Visitor", "Visitor")}
              </span>
            </div>

            <button
              type="button"
              onClick={handleBackToAdmin}
              className="rounded-full bg-danger px-3 py-1 text-xs font-medium text-white transition-colors hover:opacity-90"
            >
              {t("Kembali", "Back")}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={toggleLanguage}
          title={t("Ganti bahasa", "Switch language")}
          aria-label={t("Ganti bahasa", "Switch language")}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control border border-line bg-surface px-2.5 text-2xs font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <Languages size={14} aria-hidden="true" />
          <span className="uppercase">{language}</span>
        </button>

        {canViewNotifications ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface transition-colors hover:bg-surface-muted">
            <NotificationBell />
          </div>
        ) : null}
      </div>
    </header>
  );
};

export default AppHeader;
