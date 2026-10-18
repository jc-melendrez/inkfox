import { useEffect } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import { DevStateSwitcher } from "./components/DevStateSwitcher";
import { AuthProvider } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import { ToastProvider } from "./context/ToastContext";
import { AppRoutes } from "./routes";

/** Move keyboard focus to the new screen's main region on navigation. */
function RouteFocus() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.getElementById("main")?.focus();
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <ToastProvider>
            <RouteFocus />
            <a className="skip-link" href="#main">
              Skip to content
            </a>
            <AppRoutes />
            {import.meta.env.DEV && <DevStateSwitcher />}
          </ToastProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
