import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import * as api from "./api";
import { Spinner } from "./components";
import { useAuth } from "./context/AuthContext";
import { useAsync } from "./hooks/useAsync";
import { AppShell } from "./layouts/AppShell";
import { Composer } from "./screens/Composer";
import { FeedbackScreen } from "./screens/Feedback";
import { FirstUpload } from "./screens/FirstUpload";
import { Home } from "./screens/Home";
import { Landing } from "./screens/Landing";
import { Library } from "./screens/Library";
import { LogIn } from "./screens/LogIn";
import { NotFound } from "./screens/NotFound";
import { PickMethod } from "./screens/PickMethod";
import { ProfileScreen } from "./screens/Profile";
import { ProgressScreen } from "./screens/Progress";
import { SessionComplete } from "./screens/SessionComplete";
import { SettingsScreen } from "./screens/Settings";
import { SignUp } from "./screens/SignUp";
import { Welcome } from "./screens/Welcome";

function CenterSpinner() {
  return (
    <div className="app-content">
      <Spinner label="Loading…" />
    </div>
  );
}

/** Signed-in and fully onboarded. */
function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <CenterSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.onboarded) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

/** Signed-in but still in setup. */
function RequireUser() {
  const { user, loading } = useAuth();
  if (loading) return <CenterSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** /practice sends you to your saved draft, or the library if there is none. */
function PracticeRedirect() {
  const { data, loading } = useAsync(() => api.progress.getResume(), []);
  if (loading) return <CenterSpinner />;
  if (data) return <Navigate to={`/practice/${data.materialId}/q/${data.questionId}`} replace />;
  return <Navigate to="/library" replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<LogIn />} />
      <Route path="/signup" element={<SignUp />} />

      <Route element={<RequireUser />}>
        <Route path="/onboarding" element={<Welcome />} />
        <Route path="/onboarding/method" element={<PickMethod />} />
        <Route path="/onboarding/upload" element={<FirstUpload />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/home" element={<Home />} />
          <Route path="/library" element={<Library />} />
          <Route path="/practice" element={<PracticeRedirect />} />
          <Route path="/practice/:materialId" element={<Composer />} />
          <Route path="/practice/:materialId/q/:questionId" element={<Composer />} />
          <Route
            path="/practice/:materialId/q/:questionId/feedback"
            element={<FeedbackScreen />}
          />
          <Route path="/session/:materialId/complete" element={<SessionComplete />} />
          <Route path="/progress" element={<ProgressScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
