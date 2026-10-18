import { Link } from "react-router-dom";
import { Icon } from "../components";

export function NotFound() {
  return (
    <div id="main" tabIndex={-1} className="empty-state">
      <Icon name="search" size="lg" className="empty-state__icon" />
      <h1 className="page-title">We could not find that page</h1>
      <p className="muted">The link may be out of date.</p>
      <Link className="btn btn--primary" to="/home">
        Back to your dashboard
      </Link>
    </div>
  );
}
