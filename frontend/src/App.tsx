import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { useAuth } from "@/context/AuthContext";

import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";

import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";

import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";

import CalendarPage from "./features/calendar/pages/CalendarPage";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";

import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";

import Home from "./pages/Dashboard/Home";
import TestConnection from "./pages/TestConnection";

import ProtectedRoute from "./components/auth/ProtectedRoute";

import DivisionPage from "@/features/division/pages/DivisionPage";
import WorkspacePage from "@/features/workspace/pages/WorkspacePage";
import BoardPage from "@/features/board/pages/BoardPage";
import CampaignListPage from "./features/campaign/pages/CampaignListPage";

import FormPage from "@/features/form/pages/FormPage";
import CreateFormPage from "@/features/form/pages/CreateFormPage";
import FormBuilderPage from "@/features/form/pages/FormBuilderPage";
import FormResponsesPage from "@/features/form/pages/FormResponsesPage";
import EditFormPage from "@/features/form/pages/EditFormPage";
import PublicFormPage from "@/features/form/pages/PublicFormPage";

import ChatPage from "./pages/Chats/ChatPage";
import ReportPage from "./features/report/pages/ReportPage";
import CampaignDetailPage from "./features/campaign/pages/CampaignDetailPage";

import NotificationPage from "./pages/Notifications/NotificationPage";

// import DailyTodoPage from "@/features/daily/components/DailyTodoSidebar";

import MyWorkPage from "@/features/my-work/pages/MyWorkPage";

import PermissionRoute from "./components/auth/PermissionRoute";
import RoleRoute from "./components/auth/RoleRoute";

import LandingPage from "@/features/landing/pages/LandingPage";

import EditAccountPage from "@/features/account/pages/EditAccountPage";

function isSuperAdminUser(auth: ReturnType<typeof useAuth>) {
  try {
    return typeof auth?.hasRole === "function"
      ? !!auth.hasRole("super_admin")
      : false;
  } catch {
    return false;
  }
}

function RootRoute() {
  const token = localStorage.getItem("token");
  const auth = useAuth();

  if (!token) {
    return <LandingPage />;
  }

  // Sama seperti gate di RoleRoute: /dashboard cuma untuk Super Admin.
  // Dicek di sini juga supaya admin/user langsung diarahkan ke /my-work,
  // tidak muter dulu lewat /dashboard baru di-redirect ulang.
  return (
    <Navigate
      to={isSuperAdminUser(auth) ? "/dashboard" : "/my-work"}
      replace
    />
  );
}

// Super Admin sudah punya dashboard sendiri di /dashboard dan tidak perlu
// (juga tidak boleh) diarahkan ke /my-work sama sekali. RootRoute di atas
// sudah menangani ini untuk redirect dari "/", tapi kalau /my-work diakses
// langsung (ketik URL manual, link lama, dsb) belum ada yang menahan —
// guard ini menutup celah itu.
function MyWorkRoute() {
  const auth = useAuth();

  if (isSuperAdminUser(auth)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <MyWorkPage />;
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />

      <Routes>
        {/* ================= PUBLIC ================= */}
        <Route path="/" element={<RootRoute />} />

        <Route
          path="/public/forms/:slug"
          element={<PublicFormPage />}
        />

        {/* ================= AUTH ================= */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        {/* ================= PROTECTED ================= */}
        <Route element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={
              <RoleRoute role="super_admin" redirectTo="/my-work">
                <PermissionRoute permission="dashboard.view">
                  <Home />
                </PermissionRoute>
              </RoleRoute>
            }
          />
          <Route
            path="/my-work"
            element={<PermissionRoute permission="my_work.view"><MyWorkRoute /></PermissionRoute>}
          />

          {/* Task Management */}
          <Route path="/divisions" element={<PermissionRoute permission="division.view"><DivisionPage /></PermissionRoute>} />

          <Route
            path="/divisions/:id"
            element={<PermissionRoute permission="workspace.view"><WorkspacePage /></PermissionRoute>}
          />

          <Route
            path="/workspaces/:workspaceId/campaigns"
            element={<PermissionRoute permission="campaign.view"><CampaignListPage /></PermissionRoute>}
          />

          <Route
            path="/workspaces/:workspaceId/campaigns/:campaignId"
            element={<PermissionRoute permission="campaign.view"><CampaignDetailPage /></PermissionRoute>}
          />

          <Route
            path="/workspaces/:workspaceId/campaigns/:campaignId/boards"
            element={<PermissionRoute permissions={['board.view', 'campaign.view']}><BoardPage /></PermissionRoute>}
          />

          {/* Communication */}
          <Route
            path="/chats"
            element={<PermissionRoute permission="chat.view"><ChatPage /></PermissionRoute>}
          />

          <Route
            path="/notifications"
            element={<PermissionRoute permission="notification.view"><NotificationPage /></PermissionRoute>}
          />

          {/* User Management */}
          <Route
            path="/profile"
            element={
              <PermissionRoute permission="profile.view">
                <UserProfiles />
              </PermissionRoute>
            }
          />

          {/* Forms */}
          <Route
            path="/forms"
            element={
              <PermissionRoute permission="form.view">
                <FormPage />
              </PermissionRoute>
            }
          />

          <Route
            path="/forms/create"
            element={<PermissionRoute permission='form.create'><CreateFormPage /></PermissionRoute>}
          />

          <Route
            path="/forms/:id/builder"
            element={<PermissionRoute permissions={['form.update', 'form.field.create', 'form.field.update', 'form.field.delete']}><FormBuilderPage /></PermissionRoute>}
          />

          <Route
            path="/forms/:id/edit"
            element={<PermissionRoute permission='form.update'><EditFormPage /></PermissionRoute>}
          />

          <Route
            path="/forms/:id/responses"
            element={<PermissionRoute permission='form.responses.view'><FormResponsesPage /></PermissionRoute>}
          />

          <Route
            path="/form-elements"
            element={<FormElements />}
          />

          {/* ================= REPORT ================= */}
          <Route
            path="/reports"
            element={
              <PermissionRoute permission="report.view">
                <ReportPage />
              </PermissionRoute>
            }
          />

          {/* Utilities */}
          <Route path="/calendar" element={<PermissionRoute permission="calendar.view"><CalendarPage /></PermissionRoute>} />
          <Route path="/blank" element={<Blank />} />
          <Route path="/test" element={<TestConnection />} />

          {/* Tables */}
          <Route
            path="/basic-tables"
            element={<BasicTables />}
          />

          {/* UI Elements */}
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/avatars" element={<Avatars />} />
          <Route path="/badge" element={<Badges />} />
          <Route path="/buttons" element={<Buttons />} />
          <Route path="/images" element={<Images />} />
          <Route path="/videos" element={<Videos />} />

          {/* Charts */}
          <Route
            path="/line-chart"
            element={<LineChart />}
          />

          <Route
            path="/bar-chart"
            element={<BarChart />}
          />
        </Route>



<Route
  path="/account/edit"
  element={
    <ProtectedRoute>
      <PermissionRoute permission="account.view">
        <EditAccountPage />
      </PermissionRoute>
    </ProtectedRoute>
  }
/>

        {/* ================= FALLBACK ================= */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* WIDGET CHAT GLOBAL 
          Diletakkan di luar <Routes> agar tidak ikut unmount ketika ganti halaman 
      */}
    </Router>
  );
}
