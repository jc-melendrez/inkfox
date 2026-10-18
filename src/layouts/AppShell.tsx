import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";

export function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main id="main" className="app-main" tabIndex={-1}>
        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
