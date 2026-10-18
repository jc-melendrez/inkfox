import { NavLink } from "react-router-dom";
import { Icon, type IconName } from "./Icon";

const ITEMS: { to: string; label: string; icon: IconName }[] = [
  { to: "/home", label: "Home", icon: "home" },
  { to: "/library", label: "Library", icon: "library" },
  { to: "/practice", label: "Practice", icon: "practice" },
  { to: "/progress", label: "Progress", icon: "progress" },
  { to: "/profile", label: "Profile", icon: "profile" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <NavLink to="/home" className="sidebar__brand">
        <span className="wordmark">Redraft</span>
      </NavLink>
      <nav className="sidebar__nav" aria-label="Main">
        {ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} className="sidebar__link">
            <Icon name={item.icon} size="md" className="sidebar__icon" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
