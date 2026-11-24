import React from "react";
import { Outlet, useLocation } from "react-router";
import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import Backdrop from "./Backdrop";
import RealtimeSync from "../components/realtime/RealtimeSync";
import PresenceHeartbeat from "../components/presence/PresenceHeartbeat";
import AiAssistant from "../features/ai/AiAssistant";
import { useAuth } from "../context/AuthContext";

/* -------------------------------------------------------------------------- */
/*                               LAYOUT CONTENT                               */
/* -------------------------------------------------------------------------- */

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered } = useSidebar();
  const { pathname } = useLocation();

  return (
    // Lock tinggi layar ke 100vh / h-screen dan matikan scroll window utama
    <div className="flex h-[100dvh] min-h-0 overflow-hidden bg-canvas text-fg transition-colors duration-200">
      {/* Sidebar Navigation & Mobile Backdrop */}
      <AppSidebar />
      <Backdrop />

      {/* Main Container Wrapper */}
      <div
        className={`
          flex
          h-full
          min-w-0
          flex-1
          flex-col
          overflow-hidden
          transition-all
          duration-300
          ease-in-out
          ${isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[96px]"}
        `}
      >
        {/* Header (Permanen Kunci di Atas) */}
        <AppHeader />

        {/* Dedicated Scroll Area untuk Isi Konten */}
        <main className="w-full flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-3 py-4 xsm:px-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div
            key={pathname}
            className="page-enter mx-auto w-full max-w-[1440px] 2xl:max-w-[1600px]"
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                 APP LAYOUT                                 */
/* -------------------------------------------------------------------------- */

const AppLayout: React.FC = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  return (
    <SidebarProvider>
      <RealtimeSync />
      <PresenceHeartbeat />
      <LayoutContent />
      {pathname !== "/assistant/preview" && <AiAssistant key={user?.id} />}
    </SidebarProvider>
  );
};

export default AppLayout;
