import { useState } from "react";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { useAuth } from "../../context/AuthContext";
import { logout } from "../../lib/auth.service";
import { useNavigate } from "react-router-dom";

type UserDropdownProps = {
  compact?: boolean;
};

export default function UserDropdown({ compact = false }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, loadUser } = useAuth();
  const navigate = useNavigate();

  const toggleDropdown = () => setIsOpen((prev) => !prev);
  const closeDropdown = () => setIsOpen(false);

  const handleLogout = async () => {
    await logout();
    await loadUser();
    navigate("/signin");
  };

  return (
    <div className="relative w-full">
      {/* BUTTON */}
      <button
        onClick={toggleDropdown}
        className={`flex items-center w-full text-gray-700 dark:text-gray-300 transition hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg px-2 py-2`}
      >
        {/* AVATAR */}
        <span className="overflow-hidden rounded-full h-10 w-10 flex-shrink-0">
          <img
            src={user?.avatar || "/images/user/owner.jpg"}
            alt="User"
            className="object-cover w-full h-full"
          />
        </span>

        {/* USER INFO (HIDE WHEN COMPACT) */}
        {!compact && (
          <div className="ml-3 text-left flex-1 min-w-0">
            <p className="font-medium text-sm leading-tight truncate">
              {user?.name || "Loading..."}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user?.email || ""}
            </p>
          </div>
        )}

        {/* ARROW */}
        {!compact && (
          <svg
            className={`ml-auto transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
          >
            <path
              d="M4.5 7.5L9 12L13.5 7.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* DROPDOWN */}
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-3 w-[260px] rounded-2xl border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800 shadow-lg p-3 z-50"
      >
        {/* USER HEADER */}
        <div className="px-2 pb-3 border-b border-gray-200 dark:border-gray-800">
          <p className="font-medium text-sm text-gray-800 dark:text-gray-200">
            {user?.name || "Loading..."}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {user?.email || ""}
          </p>
        </div>

        {/* MENU */}
        <ul className="flex flex-col gap-1 pt-3">
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              to="/profile"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-white/5"
            >
              Edit profile
            </DropdownItem>
          </li>

          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              to="/settings"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-white/5"
            >
              Account settings
            </DropdownItem>
          </li>
        </ul>

        {/* LOGOUT */}
        <button
          onClick={handleLogout}
          className="w-full mt-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-left"
        >
          Sign out
        </button>
      </Dropdown>
    </div>
  );
}