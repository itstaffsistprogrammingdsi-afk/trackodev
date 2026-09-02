import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { lazy, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";

import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PermissionRoute from "./components/auth/PermissionRoute";

import MobileAppBridge from "@/components/common/MobileAppBridge";
import { getLastAppRoute, LAST_APP_ROUTE_KEY } from "@/lib/mobileApp";

const SignIn = lazy(() => import("./pages/AuthPages/SignIn"));
const SignUp = lazy(() => import("./pages/AuthPages/SignUp"));
const ForgotPassword = lazy(() => import("./pages/AuthPages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/AuthPages/ResetPassword"));
const NotFound = lazy(() => import("./pages/OtherPage/NotFound"));
const UserProfiles = lazy(() => import("./pages/UserProfiles"));
const Videos = lazy(() => import("./pages/UiElements/Videos"));
const Images = lazy(() => import("./pages/UiElements/Images"));
const Alerts = lazy(() => import("./pages/UiElements/Alerts"));
const Badges = lazy(() => import("./pages/UiElements/Badges"));
const Avatars = lazy(() => import("./pages/UiElements/Avatars"));
const Buttons = lazy(() => import("./pages/UiElements/Buttons"));
const LineChart = lazy(() => import("./pages/Charts/LineChart"));
const BarChart = lazy(() => import("./pages/Charts/BarChart"));
const CalendarPage = lazy(() => import("./features/calendar/pages/CalendarPage"));
const BasicTables = lazy(() => import("./pages/Tables/BasicTables"));
const FormElements = lazy(() => import("./pages/Forms/FormElements"));
const Blank = lazy(() => import("./pages/Blank"));
const Home = lazy(() => import("./pages/Dashboard/Home"));
const TestConnection = lazy(() => import("./pages/TestConnection"));
const DivisionPage = lazy(() => import("@/features/division/pages/DivisionPage"));
const DivisionActivityPage = lazy(() => import("@/features/division/pages/DivisionActivityPage"));
const WorkspacePage = lazy(() => import("@/features/workspace/pages/WorkspacePage"));
const BoardPage = lazy(() => import("@/features/board/pages/BoardPage"));
const CampaignListPage = lazy(() => import("./features/campaign/pages/CampaignListPage"));
const FormPage = lazy(() => import("@/features/form/pages/FormPage"));
const CreateFormPage = lazy(() => import("@/features/form/pages/CreateFormPage"));
const FormBuilderPage = lazy(() => import("@/features/form/pages/FormBuilderPage"));
const FormResponsesPage = lazy(() => import("@/features/form/pages/FormResponsesPage"));
const EditFormPage = lazy(() => import("@/features/form/pages/EditFormPage"));
const PublicFormPage = lazy(() => import("@/features/form/pages/PublicFormPage"));
const ChatPage = lazy(() => import("./pages/Chats/ChatPage"));
const ReportPage = lazy(() => import("./features/report/pages/ReportPage"));
const CampaignDetailPage = lazy(() => import("./features/campaign/pages/CampaignDetailPage"));
const NotificationPage = lazy(() => import("./pages/Notifications/NotificationPage"));
const MyWorkPage = lazy(() => import("@/features/my-work/pages/MyWorkPage"));
const LandingPage = lazy(() => import("@/features/landing/pages/LandingPage"));
const EditAccountPage = lazy(() => import("@/features/account/pages/EditAccountPage"));

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
    localStorage.removeItem(LAST_APP_ROUTE_KEY);
    return <LandingPage />;
  }

  if (auth.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-500">
        Loading page...
      </div>
    );
  }

  const lastRoute = getLastAppRoute();
  if (lastRoute) {
    return <Navigate to={lastRoute} replace />;
  }

  return (
    <Navigate
      to={auth.can("dashboard.view") ? "/dashboard" : "/my-work"}
      replace
    />
  );
}

// Super Admin tetap diarahkan ke dashboard dan tidak perlu
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
      <MobileAppBridge />
      <ScrollToTop />

      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            Loading page...
          </div>
        }
      >
      <Routes>
        {/* ================= PUBLIC ================= */}
        <Route path="/" element={<RootRoute />} />
        <Route path="/landing" element={<LandingPage />} />

        <Route
          path="/public/forms/:slug"
          element={<PublicFormPage />}
        />

        {/* ================= AUTH ================= */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

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
              <PermissionRoute permission="dashboard.view">
                <Home />
              </PermissionRoute>
            }
          />
          <Route
            path="/my-work"
            element={<PermissionRoute permission="my_work.view"><MyWorkRoute /></PermissionRoute>}
          />

          {/* Task Management */}
          <Route path="/divisions" element={<DivisionPage />} />

          <Route
            path="/divisions/:id"
            element={<PermissionRoute permission="workspace.view"><WorkspacePage /></PermissionRoute>}
          />

          <Route
            path="/divisions/:id/detail"
            element={<DivisionActivityPage />}
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
      </Suspense>

      {/* WIDGET CHAT GLOBAL 
          Diletakkan di luar <Routes> agar tidak ikut unmount ketika ganti halaman 
      */}
    </Router>
  );
}
