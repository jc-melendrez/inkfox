import { NavLink } from "react-router-dom";

const ITEMS = [
  { to: "/home", label: "Home" },
  { to: "/library", label: "Library" },
  { to: "/practice", label: "Practice" },
  { to: "/progress", label: "Progress" },
  { to: "/profile", label: "Profile" },
  { to: "/settings", label: "Settings" },
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
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
