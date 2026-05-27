import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type SidebarContextType = {
  isExpanded: boolean;
  isMobileOpen: boolean;
  isHovered: boolean;
  setIsHovered: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextType | null>(null);

export const SidebarProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const toggleSidebar = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const toggleMobileSidebar = useCallback(() => {
    setIsMobileOpen((prev) => !prev);
  }, []);

  const value = useMemo(
    () => ({
      isExpanded,
      isMobileOpen,
      isHovered,
      setIsHovered,
      toggleSidebar,
      toggleMobileSidebar,
    }),
    [
      isExpanded,
      isMobileOpen,
      isHovered,
      toggleSidebar,
      toggleMobileSidebar,
    ]
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }

  return context;
};