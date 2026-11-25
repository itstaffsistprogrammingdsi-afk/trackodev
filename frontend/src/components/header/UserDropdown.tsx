import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { ChevronDown, Languages, LogOut, MessagesSquare, UserCog } from "lucide-react";

import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { logout } from "../../lib/auth.service";

type UserDropdownProps = {
  compact?: boolean;
};

type MenuPosition = {
  left: number;
  bottom: number;
};

const MENU_WIDTH = 292;

export default function UserDropdown({ compact = false }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, can } = useAuth();
  const { t, toggleLanguage } = useLanguage();
  const navigate = useNavigate();

  const closeDropdown = () => setIsOpen(false);

  const openMenu = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const left = Math.min(
      Math.max(8, rect.left),
      Math.max(8, window.innerWidth - MENU_WIDTH - 8),
    );

    // Sidebar profile ada di bawah layar: buka ke atas agar tidak terpotong.
    setPosition({
      left,
      bottom: window.innerHeight - rect.top + 8,
    });
    setIsOpen(true);
  };

  const toggleDropdown = () => {
    if (isOpen) {
      closeDropdown();
      return;
    }

    openMenu();
  };

  const handleLogout = async () => {
    closeDropdown();
    await logout();
    navigate("/signin");
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        closeDropdown();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDropdown();
    };

    const handleViewportChange = () => closeDropdown();

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isOpen]);

  return (
    <>
      <div className="relative w-full">
        <button
          ref={triggerRef}
          type="button"
          onClick={toggleDropdown}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          className={`flex w-full items-center rounded-control px-2 py-2 text-left text-fg transition-colors duration-150 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
            compact ? "justify-center" : ""
          }`}
        >
          <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-line bg-surface-muted">
            <img
              src={user?.avatar || "/images/user/owner.jpg"}
              alt=""
              className="h-full w-full object-cover"
            />
          </span>

          {!compact && (
            <>
              <span className="ml-2.5 min-w-0 flex-1">
                <span className="block truncate text-sm font-medium leading-tight text-fg">
                  {user?.name || t("Memuat...", "Loading...")}
                </span>
                <span className="mt-0.5 block truncate text-2xs leading-4 text-fg-subtle">
                  {user?.email || ""}
                </span>
              </span>

              <ChevronDown
                aria-hidden="true"
                className={`ml-2 h-4 w-4 shrink-0 text-fg-subtle transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </>
          )}
        </button>
      </div>

      {isOpen && position
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label={t("Menu profil", "Profile menu")}
              style={{
                position: "fixed",
                left: position.left,
                bottom: position.bottom,
                width: MENU_WIDTH,
              }}
              className="z-[100001] overflow-hidden rounded-card border border-line bg-surface p-2 shadow-e3"
            >
              <div className="border-b border-line px-2 pb-2.5">
                <p className="truncate text-sm font-medium text-fg">
                  {user?.name || t("Memuat...", "Loading...")}
                </p>
                <p className="mt-0.5 truncate text-2xs text-fg-subtle">
                  {user?.email || ""}
                </p>
              </div>

              <div className="flex flex-col gap-0.5 pt-1.5">
                {can("account.view") ? (
                  <DropdownItem
                    icon={<UserCog className="h-4 w-4" />}
                    onItemClick={closeDropdown}
                    tag="a"
                    to="/account/edit"
                  >
                    {t("Edit profil", "Edit profile")}
                  </DropdownItem>
                ) : null}

                <DropdownItem
                  icon={<Languages className="h-4 w-4" />}
                  onItemClick={toggleLanguage}
                >
                  {t(
                    "Bahasa antarmuka: Indonesia",
                    "Interface language: English",
                  )}
                </DropdownItem>

                <DropdownItem
                  icon={<MessagesSquare className="h-4 w-4" />}
                  onItemClick={closeDropdown}
                  tag="a"
                  to="/integrations"
                >
                  {t(
                    "Integrasi Discord & Google Chat",
                    "Discord & Google Chat integration",
                  )}
                </DropdownItem>
              </div>

              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="mt-1 flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-sm text-danger transition-colors hover:bg-danger-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30"
              >
                <LogOut aria-hidden="true" className="h-4 w-4" />
                <span>{t("Keluar", "Sign out")}</span>
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
