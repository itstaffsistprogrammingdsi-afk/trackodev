import React from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";
import Backdrop from "./Backdrop";

/* -------------------------------------------------------------------------- */
/*                               LAYOUT CONTENT                               */
/* -------------------------------------------------------------------------- */

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered } = useSidebar();

  return (
    // Lock tinggi layar ke 100vh / h-screen dan matikan scroll window utama
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
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
        <main className="w-full flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl 2xl:max-w-screen-2xl">
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
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;