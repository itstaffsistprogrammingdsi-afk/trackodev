import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import api from "@/lib/axios";

import { AxiosError } from "axios";

import { Link, useLocation } from "react-router-dom";

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
  // true kalau `path` di atas cuma fallback (id dependency-nya belum ada),
  // BUKAN halaman asli milik item ini. Item begini harus dilewati saat
  // nentuin active state, karena fallback-nya bisa "nabrak" path milik
  // menu lain (mis. /my-work milik Dashboard) dan bikin dua menu nyala
  // bareng.
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

const DotIcon = memo(() => {
  return <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />;
});

const menuItemBase =
  "flex items-center gap-3 rounded-xl transition-all duration-200";

const menuItemInactive =
  "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5";

const menuItemActive = "bg-indigo-500 text-white shadow-sm";


/* -------------------------------------------------------------------------- */
/*                                ROUTE MATCHER                               */
/* -------------------------------------------------------------------------- */

function normalizePath(path: string) {
  if (!path || path === "/") {
    return "/";
  }

  return path.replace(/\/+$/, "");
}

// function matchDynamicRoute(pathname: string, routePath: string) {
//   const pathnameParts = normalizePath(pathname).split("/");

//   const routeParts = normalizePath(routePath).split("/");

//   if (pathnameParts.length !== routeParts.length) {
//     return false;
//   }

//   return routeParts.every((part, index) => {
//     if (part.startsWith(":")) {
//       return true;
//     }

//     return part === pathnameParts[index];
//   });
// }

/* -------------------------------------------------------------------------- */
/*                           FIXED ACTIVE MATCHER                             */
/* -------------------------------------------------------------------------- */
function startsWithRoute(
    pathname: string,
    prefix: string,
) {
    pathname = normalizePath(pathname);
    prefix = normalizePath(prefix);

    return (
        pathname === prefix ||
        pathname.startsWith(prefix + "/")
    );
}


/* -------------------------------------------------------------------------- */
/*                            PERSIST LAST PARAMS                             */
/* -------------------------------------------------------------------------- */

function usePersistedRouteParams(isSuperAdmin: boolean) {
  const location = useLocation();

  const [divisionId, setDivisionId] = useState<string | null>(() =>
    localStorage.getItem("lastDivisionId")
  );

  const [workspaceId, setWorkspaceId] = useState<string | null>(() =>
    localStorage.getItem("lastWorkspaceId")
  );

  const [campaignId, setCampaignId] = useState<string | null>(() =>
    localStorage.getItem("lastCampaignId")
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
      /^\/workspaces\/[^/]+\/campaigns\/([^/]+)/
    );

    if (campaignMatch?.[1]) {
      const id = campaignMatch[1];
      setCampaignId(id);
      localStorage.setItem("lastCampaignId", id);
    }
  }, [location.pathname]);

  // Auto-discover divisionId untuk admin/user biasa yang BELUM PERNAH
  // membuka /divisions/:id sama sekali (localStorage masih kosong) —
  // sebelumnya, tanpa divisionId, menu "Workspace" cuma fallback terus ke
  // /my-work dan admin/user tidak punya cara lain untuk sampai ke
  // division/workspace miliknya. Superadmin dilewati karena dia memang
  // punya jalur sendiri lewat halaman /divisions (daftar semua division).
  useEffect(() => {
    if (isSuperAdmin) return;
    if (divisionId) return;

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
        // Diamkan saja — kalau gagal, menu Workspace tetap fallback ke
        // /my-work seperti sebelumnya, tidak bikin sidebar crash.
      });

    return () => {
      mounted = false;
    };
  }, [isSuperAdmin, divisionId]);

  useEffect(() => {
    let mounted = true;

    const validate = async (
      id: string | null,
      endpoint: string,
      storageKey: string,
      clearState: React.Dispatch<React.SetStateAction<string | null>>
    ) => {
      if (!id) return;

      try {
        await api.get(`${endpoint}/${id}`);
      } catch (error: unknown) {
        // Sebelumnya cuma 404/400 yang dianggap "ID tidak valid". Padahal
        // untuk role admin/user yang aksesnya dibatasi per division/
        // workspace/campaign, ID lama yang tersimpan di localStorage (mis.
        // dari sesi/role lain di browser yang sama) biasanya ditolak server
        // dengan 401/403, bukan 404. Karena statusnya tidak ditangani,
        // ID yang sudah tidak valid itu tidak pernah dibersihkan, dan
        // menu Task Management (Workspace/Campaigns/Board) terus mengarah
        // ke path yang error. Superadmin nyaris tidak pernah kena kasus ini
        // karena aksesnya tidak dibatasi. Di sini semua status 4xx kita
        // anggap "ID ini tidak berlaku untuk user sekarang" dan kita bersihkan.
        const status =
          error instanceof AxiosError ? error.response?.status : undefined;

        if (mounted && status !== undefined && status >= 400 && status < 500) {
          localStorage.removeItem(storageKey);
          clearState(null);
        }
      }
    };

    void Promise.all([
      validate(
        divisionId,
        "/divisions",
        "lastDivisionId",
        setDivisionId
      ),
      validate(
        workspaceId,
        "/workspaces",
        "lastWorkspaceId",
        setWorkspaceId
      ),
      validate(
        campaignId,
        "/campaigns",
        "lastCampaignId",
        setCampaignId
      ),
    ]);

    return () => {
      mounted = false;
    };
  }, [divisionId, workspaceId, campaignId]);

  return {
    divisionId,
    workspaceId,
    campaignId,
  };
}

/* -------------------------------------------------------------------------- */
/*                                 TREE LEAF                                  */
/* -------------------------------------------------------------------------- */

const TreeLeaf = memo(function TreeLeaf({
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

        <span className="truncate">{name}</span>
      </Link>
    </li>
  );
});

/* -------------------------------------------------------------------------- */
/*                                TREE BRANCH                                 */
/* -------------------------------------------------------------------------- */

const TreeBranch = memo(function TreeBranch({
  subItem,

}: {
  subItem: SubItem;
  // isActive: (path: string) => boolean;
}) {
const hasChildren = !!subItem.children?.length;

const location = useLocation();

const active = useMemo(() => {
  if (startsWithRoute(location.pathname, subItem.path)) {
    return true;
  }

  return (
    subItem.children?.some(
      (child) =>
        !child.isFallback &&
        startsWithRoute(location.pathname, child.path)
    ) ?? false
  );
}, [location.pathname, subItem]);

// Path antar child ini bersarang (Campaigns ⊂ Campaign Detail ⊂ Board),
// jadi kalau tiap child dicek independen pakai startsWithRoute, waktu buka
// halaman Board, Campaigns dan Campaign Detail ikut keanggap "active" juga
// karena pathname-nya sama-sama diawali path mereka. Di sini kita cari
// SATU child dengan path paling spesifik (paling panjang) yang cocok —
// cuma itu yang boleh nyala.
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

    const updateHeight = () => {
      setHeight(element.scrollHeight);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);

    resizeObserver.observe(element);

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
            onClick={() => setOpen((prev) => !prev)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all
              ${
                active
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
              }`}
          >
            <span className="flex-1 text-left truncate">{subItem.name}</span>

            <ChevronDownIcon
              className={`w-4 h-4 transition-transform duration-200 shrink-0
                ${open ? "rotate-180" : ""}`}
            />
          </button>

          <div
            ref={contentRef}
            className="overflow-hidden transition-all duration-300"
            style={{
              maxHeight: open ? `${height}px` : "0px",
            }}
          >
            <ul className="ml-4 mt-1 border-l border-gray-200 dark:border-gray-700 pl-3 space-y-1">
              {subItem.children?.map((child, index) => (
                <TreeLeaf
                  key={child.name}
                  name={child.name}
                  path={child.path}
                  active={index === activeChildIndex}
                />
              ))}
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

  // const {
  //   dark,
  //   toggleDark,
  // } = useDarkMode();

  // useAuth() bisa mengembalikan can()/hasRole() yang belum "siap" (mis. saat
  // permission user masih di-fetch dari API setelah login) atau yang bentuknya
  // beda antar role. Superadmin biasanya lolos karena rolenya sering di-treat
  // "boleh semua" tanpa perlu data permission, sedangkan admin/user betul-betul
  // bergantung ke data itu — ini yang bikin error cuma muncul untuk admin/user.
  // Wrapper di bawah memastikan can()/hasRole() tidak akan pernah bikin
  // sidebar crash, apa pun yang dikembalikan/dilempar oleh AuthContext.
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

  /* ---------------------------------------------------------------------- */
  /*                               DYNAMIC MENU                             */
  /* ---------------------------------------------------------------------- */

  const can = useCallback(
    (permission: string) => {
      // Superadmin selalu true tanpa perlu memanggil can() asli, jadi kalau
      // pun implementasi can() di AuthContext bermasalah untuk role lain,
      // superadmin tidak akan pernah terdampak (sesuai perilaku yang sudah
      // terlihat sekarang).
      if (isSuperAdmin) return true;

      try {
        return typeof auth?.can === "function" ? !!auth.can(permission) : false;
      } catch {
        // Kalau can() error (mis. permission belum ke-load), sembunyikan
        // saja item menu terkait, jangan sampai seluruh sidebar ikut crash.
        return false;
      }
    },
    [auth, isSuperAdmin],
  );

  const navItems = useMemo<NavItem[]>(
    () => {
      try {
        return [
      {
        icon: <GridIcon />,
        name: "Dashboard",
        path: "/my-work",
      },
      {
        name: "Task Management",
        icon: <BoxCubeIcon />,
        subItems: [
          {
            name: "Task Manager",
            path: "/divisions",

            children: [
              // "Divisions" (daftar semua division) cuma untuk superadmin.
              // admin & user tidak boleh lihat/akses halaman ini sama sekali.
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
                // Kalau divisionId belum ada: superadmin boleh fallback ke
                // /divisions (dia memang boleh milih division dari sana).
                // admin/user TIDAK boleh ke /divisions, jadi fallback-nya
                // diarahkan ke /my-work supaya tidak "nyelonong" ke halaman
                // yang seharusnya tidak bisa mereka akses.
                path: divisionId
                  ? `/divisions/${divisionId}`
                  : isSuperAdmin
                  ? "/divisions"
                  : "/my-work",
                // Tanpa divisionId, path di atas cuma fallback ke menu lain
                // (Divisions/Dashboard) — bukan path "Workspace" yang asli.
                isFallback: !divisionId,
              },

              {
                name: "Campaigns",
                path: workspaceId
                  ? `/workspaces/${workspaceId}/campaigns`
                  : isSuperAdmin
                  ? "/divisions"
                  : "/my-work",
                // Sama seperti Workspace: tanpa workspaceId, path di atas
                // cuma fallback, bukan path Campaigns yang asli.
                isFallback: !workspaceId,
              },

...(workspaceId && campaignId
    ? [{
        name:"Campaign Detail",
        path:`/workspaces/${workspaceId}/campaigns/${campaignId}`,
    }]
    : []),

...(workspaceId && campaignId
    ? [{
        name:"Board",
        path:`/workspaces/${workspaceId}/campaigns/${campaignId}/boards`,
    }]
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
        // Jaring pengaman terakhir: kalau ada bagian mana pun dari menu di
        // atas yang gagal dibangun karena sebab tak terduga, jangan sampai
        // seluruh sidebar ikut crash untuk user. Tampilkan menu minimal saja
        // dan catat errornya di console supaya tetap bisa di-debug.
        console.error("Gagal membangun menu sidebar:", error);

        return [
          {
            icon: <GridIcon />,
            name: "Dashboard",
            path: "/my-work",
          },
        ];
      }
    },

    [divisionId, workspaceId, campaignId, can, isSuperAdmin],
  );

  /* ---------------------------------------------------------------------- */
  /*                              ACTIVE MATCHER                            */
  /* ---------------------------------------------------------------------- */



// Index submenu (Task Management, Forms, dst) yang SECARA RUTE lagi aktif —
// dipakai KHUSUS buat warna highlight header submenu. Ini sengaja dipisah
// dari `openSubmenu` (state buka/tutup dropdown yang dikontrol klik).
// Sebelumnya highlight header pakai `isOpen`, jadi begitu submenu diklik
// buka (tanpa pindah halaman), headernya ikut keliatan "active" walau
// rute yang jalan masih di menu lain (mis. Dashboard) — makanya dua menu
// nyala bareng. Dengan dipisah begini, header submenu cuma nyala kalau
// rute saat ini memang match salah satu path di dalamnya.
const routeActiveIndex = useMemo(() => {
  return navItems.findIndex((item) => {
    if (!item.subItems) {
      return false;
    }

    return item.subItems.some((sub) => {
      if (startsWithRoute(location.pathname, sub.path)) {
        return true;
      }

      return (
        sub.children?.some(
          (child) =>
            !child.isFallback &&
            startsWithRoute(location.pathname, child.path)
        ) ?? false
      );
    });
  });
}, [location.pathname, navItems]);

useEffect(() => {
  setOpenSubmenu(routeActiveIndex >= 0 ? routeActiveIndex : null);
}, [routeActiveIndex]);

  const handleMouseEnter = () => {
    if (!isExpanded) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <>
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={toggleMobileSidebar}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-screen bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 transition-all duration-300
        ${slim ? "w-[72px]" : "w-[260px]"}
        ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* HEADER */}

        <div className="flex items-center justify-between px-4 py-5 border-b border-gray-100 dark:border-gray-800">
          <Link to="/" className="flex items-center shrink-0">
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
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              aria-label="Toggle sidebar"
            >
              ☰
            </button>
          )}
        </div>

        {/* CONTENT */}

        <div className="flex flex-col h-[calc(100vh-73px)] overflow-y-auto px-3 py-4 space-y-4">
          <UserDropdown compact={slim} />

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
                        className={`${menuItemBase} w-full px-3 py-2.5
                          ${routeActiveIndex === index ? menuItemActive : menuItemInactive}
                          ${slim ? "justify-center" : ""}`}
                      >
                        <span className="shrink-0">{item.icon}</span>

                        {!slim && (
                          <>
                            <span className="flex-1 text-left text-sm font-medium truncate">
                              {item.name}
                            </span>

                            <ChevronDownIcon
                              className={`w-4 h-4 shrink-0 transition-transform
                                ${isOpen ? "rotate-180" : ""}`}
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
                            {item.subItems.map((subItem) => (
                              <TreeBranch
                                key={`${item.name}-${subItem.name}`}
                                subItem={subItem}
                                // isActive={isActive}
                              />
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                }

                if (!item.path) {
                  return null;
                }

                return (
                  <li key={item.name}>
                    <Link
                      to={item.path}
className={`${menuItemBase} px-3 py-2.5
${
    startsWithRoute(location.pathname, item.path)
        ? menuItemActive
        : menuItemInactive
}
`}
                    >
                      <span className="shrink-0">{item.icon}</span>

                      {!slim && (
                        <span className="text-sm font-medium truncate">
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
