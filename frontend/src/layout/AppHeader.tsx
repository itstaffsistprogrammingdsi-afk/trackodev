
import { useSidebar } from "../context/SidebarContext";

const AppHeader: React.FC = () => {
  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  return (
    <div className=" top-3 left-2 lg:left-[260px] z-[9999]">
      <button
        onClick={handleToggle}
        className="group p-2 rounded-md transition
        text-gray-500 dark:text-gray-400
        hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          className="transition-transform group-hover:scale-110"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          {isMobileOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>

        
      </button>
    </div>
  );
};

export default AppHeader;