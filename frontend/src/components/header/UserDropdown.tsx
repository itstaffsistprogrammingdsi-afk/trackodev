import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, LogOut } from "lucide-react";

import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { useAuth } from "../../context/AuthContext";
import { logout } from "../../lib/auth.service";

type UserDropdownProps = {
  compact?: boolean;
};

export default function UserDropdown({ compact = false }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, can } = useAuth();
  const navigate = useNavigate();

  const toggleDropdown = () => setIsOpen((prev) => !prev);
  const closeDropdown = () => setIsOpen(false);

  const handleLogout = async () => {
    await logout();
    navigate("/signin");
  };

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={toggleDropdown}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="flex w-full items-center rounded-control px-2 py-2 text-left text-fg transition-colors duration-150 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-line">
          <img
            src={user?.avatar || "/images/user/owner.jpg"}
            alt=""
            className="h-full w-full object-cover"
          />
        </span>

        {!compact && (
          <span className="ml-2.5 min-w-0 flex-1">
            <span className="block truncate text-sm font-medium leading-tight text-fg">
              {user?.name || "Memuat..."}
            </span>
            <span className="mt-0.5 block truncate text-[11px] leading-4 text-fg-subtle">
              {user?.email || ""}
            </span>
          </span>
        )}

        {!compact && (
          <ChevronDown
            aria-hidden="true"
            className={`ml-2 h-4 w-4 shrink-0 text-fg-subtle transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute left-0 z-50 mt-2 w-[260px] rounded-card border border-line bg-surface p-2 shadow-e2"
      >
        <div className="border-b border-line px-2 pb-3">
          <p className="truncate text-sm font-medium text-fg">
            {user?.name || "Memuat..."}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-fg-subtle">
            {user?.email || ""}
          </p>
        </div>

        <ul className="flex flex-col gap-0.5 pt-2">
          {can("account.view") && (
            <li>
              <DropdownItem
                onItemClick={closeDropdown}
                tag="a"
                to="/account/edit"
                className="flex items-center gap-2.5 rounded-control px-2.5 py-2 text-sm text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
              >
                Edit profil
              </DropdownItem>
            </li>
          )}

          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              to="/integrations"
              className="flex items-center gap-2.5 rounded-control px-2.5 py-2 text-sm text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
            >
              Integrasi Discord
            </DropdownItem>
          </li>
        </ul>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-sm text-danger transition-colors hover:bg-danger-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30"
        >
          <LogOut aria-hidden="true" className="h-4 w-4" />
          <span>Keluar</span>
        </button>
      </Dropdown>
    </div>
  );
}
