import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

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

import Calendar from "./pages/Calendar";
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
// import Report from "./pages/Reports/reportpage";
import CampaignDetailPage from "./features/campaign/pages/CampaignDetailPage";

import NotificationPage from "./pages/Notifications/NotificationPage";

// import DailyTodoPage from "@/features/daily/components/DailyTodoSidebar";

import MyWorkPage from "@/features/my-work/pages/MyWorkPage";

import PermissionRoute from "./components/auth/PermissionRoute";

export default function App() {
return (
  <Router>
    <ScrollToTop />

    <Routes>
      {/* ================= PUBLIC ================= */}
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
        <Route index element={<Home />} />
        <Route path="/" element={<Home />} />
        <Route path="/my-work" element={<MyWorkPage />} />

        {/* Task Management */}
        <Route path="/divisions" element={<DivisionPage />} />

        <Route
          path="/divisions/:id"
          element={<WorkspacePage />}
        />

        <Route
          path="/workspaces/:workspaceId/campaigns"
          element={<CampaignListPage />}
        />

        <Route
          path="/workspaces/:workspaceId/campaigns/:campaignId"
          element={<CampaignDetailPage />}
        />

        <Route
          path="/workspaces/:workspaceId/campaigns/:campaignId/boards"
          element={<BoardPage />}
        />

        {/* Communication */}
        <Route path="/chats" element={<ChatPage />} />

        <Route
          path="/notifications"
          element={<NotificationPage />}
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
          element={<CreateFormPage />}
        />

        <Route
          path="/forms/:id/builder"
          element={<FormBuilderPage />}
        />

        <Route
          path="/forms/:id/edit"
          element={<EditFormPage />}
        />

        <Route
          path="/forms/:id/responses"
          element={<FormResponsesPage />}
        />

        <Route
          path="/form-elements"
          element={<FormElements />}
        />

        {/* Utilities */}
        <Route path="/calendar" element={<Calendar />} />
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

      {/* ================= FALLBACK ================= */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Router>
);
}
